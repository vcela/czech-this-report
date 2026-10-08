import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import type { Report } from "./audit/types";
import { RETENTION } from "./site";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(path.join(DATA_DIR, "reports.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      overall INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reports_url ON reports(url, created_at);
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      host TEXT NOT NULL,
      verify_token TEXT NOT NULL,
      verified_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE (user_id, host)
    );
    CREATE TABLE IF NOT EXISTS site_reports (
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      report_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (site_id, report_id)
    );
    -- ponytail: raw events, aggregated at read time. Fine for small sites;
    -- add daily rollup tables when a site sends millions of rows.
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      ts INTEGER NOT NULL,
      day TEXT NOT NULL,
      type TEXT NOT NULL,
      visitor TEXT NOT NULL,
      entry INTEGER NOT NULL DEFAULT 0,
      path TEXT,
      source TEXT,
      source_label TEXT,
      campaign TEXT,
      query TEXT,
      name TEXT,
      value REAL,
      device TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_events_site_day ON events(site_id, day);
    CREATE INDEX IF NOT EXISTS idx_events_visitor ON events(site_id, visitor, ts);
    CREATE TABLE IF NOT EXISTS daily_salt (day TEXT PRIMARY KEY, salt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS google_tokens (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      refresh_token TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS api_cache (
      key TEXT PRIMARY KEY,
      fetched_at INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS url_index (
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      verdict TEXT,
      coverage TEXT,
      last_crawl TEXT,
      checked_at INTEGER NOT NULL,
      PRIMARY KEY (site_id, url)
    );
    CREATE TABLE IF NOT EXISTS bot_hits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      ts INTEGER NOT NULL,
      bot TEXT NOT NULL,
      verified INTEGER,
      path TEXT,
      status INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_bot_hits ON bot_hits(site_id, ts);
    CREATE TABLE IF NOT EXISTS geo_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      run_at INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      cited INTEGER NOT NULL,
      mentioned INTEGER NOT NULL,
      cited_urls TEXT NOT NULL,
      answer TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_geo ON geo_results(site_id, run_at);
    CREATE TABLE IF NOT EXISTS ai_suggestions (
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (site_id, kind)
    );
    CREATE TABLE IF NOT EXISTS competitors (
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      domain TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL,
      report_id TEXT,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (site_id, domain)
    );
    CREATE TABLE IF NOT EXISTS campaign_costs (
      site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      campaign TEXT NOT NULL,
      amount REAL NOT NULL,
      PRIMARY KEY (site_id, campaign)
    );
  `);
  // Columns added after the first release (SQLite has no ADD COLUMN IF NOT EXISTS).
  for (const col of [
    "goal_paths TEXT NOT NULL DEFAULT ''",
    "gsc_property TEXT",
    "indexnow_key TEXT",
    "indexnow_last_at INTEGER",
    "bot_key TEXT",
    "geo_prompts TEXT NOT NULL DEFAULT ''",
    "brand TEXT NOT NULL DEFAULT ''",
    "snippet_found_at INTEGER",
    "indexnow_ok_at INTEGER",
  ]) {
    try {
      db.exec(`ALTER TABLE sites ADD COLUMN ${col}`);
    } catch {
      /* already there */
    }
  }
  // Sites added before these keys existed.
  db.exec(`UPDATE sites SET indexnow_key = lower(hex(randomblob(16))) WHERE indexnow_key IS NULL;
           UPDATE sites SET bot_key = lower(hex(randomblob(24))) WHERE bot_key IS NULL;`);
  db.pragma("foreign_keys = ON");
  bootstrapAdmin(db);
  // ponytail: pruned once per process start, not on a timer — the box restarts
  // often enough and a stale row for a few hours breaks no promise. Move to a
  // cron if the service ever stays up for months.
  prune(db);
  return db;
}

/**
 * First account from ADMIN_EMAIL / ADMIN_PASSWORD, so a fresh deploy needs no
 * shell. Only while no account exists — it never overwrites a password, so
 * the variables are harmless if left set, but best removed after first login.
 * Hash format matches verifyPassword in auth.ts and scripts/create-user.mjs.
 */
function bootstrapAdmin(conn: Database.Database): void {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  if (password.length < 12) {
    console.error("ADMIN_PASSWORD must be at least 12 characters; no account created.");
    return;
  }
  if (conn.prepare("SELECT 1 FROM users LIMIT 1").get()) return;
  const salt = randomBytes(16);
  const hash = `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;
  conn
    .prepare("INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)")
    .run(email, hash, new Date().toISOString());
  console.log(`Created the first account for ${email}`);
}

/** Enforce the retention published in the privacy policy. */
function prune(conn: Database.Database): void {
  const cutoff = (days: number) =>
    new Date(Date.now() - days * 86_400_000).toISOString();
  try {
    conn
      // Reports of a registered site are its history; they live as long as the site does.
      .prepare(
        "DELETE FROM reports WHERE created_at < ? AND id NOT IN (SELECT report_id FROM site_reports)"
      )
      .run(cutoff(RETENTION.reportDays));
    conn.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
    const analyticsCutoff = Date.now() - RETENTION.analyticsDays * 86_400_000;
    conn.prepare("DELETE FROM events WHERE ts < ?").run(analyticsCutoff);
    conn.prepare("DELETE FROM bot_hits WHERE ts < ?").run(analyticsCutoff);
    conn.prepare("DELETE FROM geo_results WHERE run_at < ?").run(analyticsCutoff);
    conn.prepare("DELETE FROM api_cache WHERE fetched_at < ?").run(Date.now() - 7 * 86_400_000);
    conn
      .prepare("DELETE FROM leads WHERE created_at < ?")
      .run(cutoff(RETENTION.leadDays));
  } catch (error) {
    // Never let housekeeping take the site down.
    console.error("Retention prune failed", error);
  }
}

export function saveReport(report: Report): void {
  getDb()
    .prepare(
      "INSERT INTO reports (id, url, created_at, overall, data) VALUES (?, ?, ?, ?, ?)"
    )
    .run(
      report.id,
      report.url,
      report.createdAt,
      report.overall,
      JSON.stringify(report)
    );
}

export function getReport(id: string): Report | null {
  const row = getDb()
    .prepare("SELECT data FROM reports WHERE id = ?")
    .get(id) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as Report) : null;
}

export function saveLead(lead: {
  reportId?: string;
  name: string;
  email: string;
  message: string;
}): void {
  getDb()
    .prepare(
      "INSERT INTO leads (report_id, name, email, message, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(
      lead.reportId ?? null,
      lead.name,
      lead.email,
      lead.message,
      new Date().toISOString()
    );
}

/** Memoise a slow external call (Google, OpenAI) in the database for `ttlMs`. */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const conn = getDb();
  const row = conn.prepare("SELECT fetched_at, data FROM api_cache WHERE key = ?").get(key) as
    | { fetched_at: number; data: string }
    | undefined;
  if (row && Date.now() - row.fetched_at < ttlMs) return JSON.parse(row.data) as T;
  const fresh = await fn();
  conn
    .prepare("INSERT OR REPLACE INTO api_cache (key, fetched_at, data) VALUES (?, ?, ?)")
    .run(key, Date.now(), JSON.stringify(fresh));
  return fresh;
}

export function dropCached(prefix: string): void {
  getDb().prepare("DELETE FROM api_cache WHERE key LIKE ?").run(prefix + "%");
}
