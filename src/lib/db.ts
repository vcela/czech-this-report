import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import type { Report } from "./audit/types";
import { RETENTION } from "./site";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

let db: Database.Database | null = null;

function getDb(): Database.Database {
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
  `);
  // ponytail: pruned once per process start, not on a timer — the box restarts
  // often enough and a stale row for a few hours breaks no promise. Move to a
  // cron if the service ever stays up for months.
  prune(db);
  return db;
}

/** Enforce the retention published in the privacy policy. */
function prune(conn: Database.Database): void {
  const cutoff = (days: number) =>
    new Date(Date.now() - days * 86_400_000).toISOString();
  try {
    conn
      .prepare("DELETE FROM reports WHERE created_at < ?")
      .run(cutoff(RETENTION.reportDays));
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
