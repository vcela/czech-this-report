import { createHash, randomBytes } from "node:crypto";
import { getDb } from "./db";
import { classify, deviceOf, type SourceKind } from "./traffic";

// ponytail: one timezone for "days" — the owner's. Per-site timezone when a
// site outside Central Europe shows up.
const dayFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" });
export const dayOf = (ms: number) => dayFmt.format(ms);

/**
 * Salt that rotates daily and is deleted afterwards, so an anonymous visitor
 * hash can't be linked across days or reversed to an IP once the day is over.
 */
function todaysSalt(day: string): string {
  const db = getDb();
  const row = db.prepare("SELECT salt FROM daily_salt WHERE day = ?").get(day) as { salt: string } | undefined;
  if (row) return row.salt;
  const salt = randomBytes(16).toString("hex");
  db.prepare("INSERT OR IGNORE INTO daily_salt (day, salt) VALUES (?, ?)").run(day, salt);
  db.prepare("DELETE FROM daily_salt WHERE day < ?").run(day);
  return (db.prepare("SELECT salt FROM daily_salt WHERE day = ?").get(day) as { salt: string }).salt;
}

export interface Hit {
  siteId: string;
  siteHost: string;
  type: "pageview" | "form" | "event" | "search";
  url: string;
  referrer: string;
  /** Persistent id the script sends only after the visitor consented. */
  consentedId: string | null;
  ip: string;
  ua: string;
  name: string | null;
  value: number | null;
  screenWidth: unknown;
}

export function recordHit(h: Hit): void {
  const now = Date.now();
  const day = dayOf(now);
  const visitor = h.consentedId
    ? "c:" + h.consentedId
    : "a:" + createHash("sha256").update(`${todaysSalt(day)}|${h.siteId}|${h.ip}|${h.ua}`).digest("hex").slice(0, 20);
  const c = classify(h.url, h.type === "pageview" ? h.referrer : "", h.siteHost);
  const isPageview = h.type === "pageview";
  getDb()
    .prepare(
      `INSERT INTO events (site_id, ts, day, type, visitor, entry, path, source, source_label, campaign, query, name, value, device)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      h.siteId,
      now,
      day,
      h.type,
      visitor,
      isPageview && c.kind !== "internal" ? 1 : 0,
      c.path,
      isPageview ? c.kind : null,
      isPageview ? c.label : null,
      isPageview ? c.campaign : null,
      h.type === "search" ? (h.name ?? "").toLowerCase().slice(0, 100) : isPageview ? c.query : null,
      h.type === "search" ? null : h.name,
      h.value,
      deviceOf(h.screenWidth)
    );
}

/* ---------------------------------------------------------------- reading */

export const RANGES = [7, 30, 90, 365] as const;
export type Range = (typeof RANGES)[number];

interface Totals {
  visitors: number;
  visits: number;
  pageviews: number;
  conversions: number;
  revenue: number;
}

export interface Stats {
  range: Range;
  from: string;
  to: string;
  current: Totals;
  previous: Totals;
  /** Every day of the period, oldest first */
  days: string[];
  daily: { day: string; visitors: number; pageviews: number }[];
  sources: { kind: SourceKind; label: string; visits: number; conversions: number }[];
  pages: { path: string; pageviews: number; visitors: number }[];
  searches: { query: string; count: number; noResults: number }[];
  campaigns: { campaign: string; visits: number; conversions: number; revenue: number }[];
  devices: { device: string; visitors: number }[];
  goals: { name: string; count: number }[];
  hasAnyData: boolean;
  consentedShare: number;
}

/** A conversion: a form sent, a custom event (incl. purchase), or a visit to a "thank you" page. */
function conversionWhere(goalPaths: string[]): { sql: string; params: string[] } {
  const goals = goalPaths.length
    ? ` OR (c.type = 'pageview' AND c.path IN (${goalPaths.map(() => "?").join(",")}))`
    : "";
  return { sql: `(c.type IN ('form','event')${goals})`, params: goalPaths };
}

export function parseGoals(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      try {
        return new URL(s, "https://x.invalid").pathname;
      } catch {
        return s;
      }
    })
    .slice(0, 20);
}

/**
 * The visit a conversion belongs to: the visitor's latest entry before it, up
 * to 30 days back. Anonymous visitors only exist for one day, so for them this
 * is the same-day visit; consented ones keep their source across days.
 */
const ENTRY_OF = (col: "source" | "source_label" | "campaign") => `
  (SELECT e.${col} FROM events e
   WHERE e.site_id = c.site_id AND e.visitor = c.visitor AND e.entry = 1
     AND e.ts <= c.ts AND e.ts >= c.ts - 30 * 86400000
   ORDER BY e.ts DESC LIMIT 1)`;

export function getStats(siteId: string, range: Range, goalPaths: string[]): Stats {
  const db = getDb();
  const today = Date.now();
  const to = dayOf(today);
  const from = dayOf(today - (range - 1) * 86_400_000);
  const prevTo = dayOf(today - range * 86_400_000);
  const prevFrom = dayOf(today - (2 * range - 1) * 86_400_000);
  const conv = conversionWhere(goalPaths);

  const totals = (a: string, b: string): Totals => {
    const t = db
      .prepare(
        `SELECT COUNT(DISTINCT CASE WHEN type='pageview' THEN visitor END) visitors,
                SUM(type='pageview' AND entry=1) visits,
                SUM(type='pageview') pageviews
         FROM events WHERE site_id = ? AND day BETWEEN ? AND ?`
      )
      .get(siteId, a, b) as { visitors: number; visits: number | null; pageviews: number | null };
    const k = db
      .prepare(
        `SELECT COUNT(*) n, COALESCE(SUM(CASE WHEN c.name = 'purchase' THEN c.value END), 0) revenue
         FROM events c WHERE c.site_id = ? AND c.day BETWEEN ? AND ? AND ${conv.sql}`
      )
      .get(siteId, a, b, ...conv.params) as { n: number; revenue: number };
    return {
      visitors: t.visitors,
      visits: t.visits ?? 0,
      pageviews: t.pageviews ?? 0,
      conversions: k.n,
      revenue: k.revenue,
    };
  };

  const P = [siteId, from, to] as const;
  const range_ = "site_id = ? AND day BETWEEN ? AND ?";

  const convBy = (col: "source" | "source_label" | "campaign") =>
    new Map(
      (
        db
          .prepare(
            `SELECT ${ENTRY_OF(col)} k, COUNT(*) n, COALESCE(SUM(CASE WHEN c.name='purchase' THEN c.value END),0) revenue
             FROM events c WHERE c.${range_} AND ${conv.sql} GROUP BY k`
          )
          .all(...P, ...conv.params) as { k: string | null; n: number; revenue: number }[]
      ).map((r) => [r.k ?? "", r])
    );

  const convByLabel = convBy("source_label");
  const convByCampaign = convBy("campaign");

  const consent = db
    .prepare(`SELECT SUM(visitor LIKE 'c:%') c, COUNT(*) n FROM events WHERE ${range_} AND type='pageview'`)
    .get(...P) as { c: number | null; n: number };

  return {
    range,
    from,
    to,
    days: Array.from({ length: range }, (_, i) => dayOf(today - (range - 1 - i) * 86_400_000)),
    current: totals(from, to),
    previous: totals(prevFrom, prevTo),
    daily: db
      .prepare(
        `SELECT day, COUNT(DISTINCT visitor) visitors, COUNT(*) pageviews
         FROM events WHERE ${range_} AND type='pageview' GROUP BY day ORDER BY day`
      )
      .all(...P) as Stats["daily"],
    sources: (
      db
        .prepare(
          `SELECT source kind, COALESCE(source_label,'') label, COUNT(*) visits
           FROM events WHERE ${range_} AND type='pageview' AND entry=1
           GROUP BY source, source_label ORDER BY visits DESC LIMIT 15`
        )
        .all(...P) as { kind: SourceKind; label: string; visits: number }[]
    ).map((s) => ({ ...s, conversions: convByLabel.get(s.label)?.n ?? 0 })),
    pages: db
      .prepare(
        `SELECT path, COUNT(*) pageviews, COUNT(DISTINCT visitor) visitors
         FROM events WHERE ${range_} AND type='pageview' GROUP BY path ORDER BY pageviews DESC LIMIT 15`
      )
      .all(...P) as Stats["pages"],
    searches: db
      .prepare(
        `SELECT query, SUM(type='pageview') count, SUM(type='search' AND value = 0) noResults
         FROM events WHERE ${range_} AND query IS NOT NULL AND query != ''
         GROUP BY query ORDER BY count DESC, noResults DESC LIMIT 15`
      )
      .all(...P) as Stats["searches"],
    campaigns: (
      db
        .prepare(
          `SELECT campaign, COUNT(*) visits FROM events
           WHERE ${range_} AND type='pageview' AND entry=1 AND campaign IS NOT NULL
           GROUP BY campaign ORDER BY visits DESC LIMIT 15`
        )
        .all(...P) as { campaign: string; visits: number }[]
    ).map((c) => ({
      ...c,
      conversions: convByCampaign.get(c.campaign)?.n ?? 0,
      revenue: convByCampaign.get(c.campaign)?.revenue ?? 0,
    })),
    devices: db
      .prepare(
        `SELECT device, COUNT(DISTINCT visitor) visitors FROM events
         WHERE ${range_} AND type='pageview' AND device IS NOT NULL GROUP BY device ORDER BY visitors DESC`
      )
      .all(...P) as Stats["devices"],
    goals: db
      .prepare(
        `SELECT CASE WHEN c.type='pageview' THEN c.path ELSE COALESCE(c.name, c.type) END name, COUNT(*) count
         FROM events c WHERE c.${range_} AND ${conv.sql} GROUP BY name ORDER BY count DESC LIMIT 10`
      )
      .all(...P, ...conv.params) as Stats["goals"],
    hasAnyData: !!db.prepare("SELECT 1 FROM events WHERE site_id = ? LIMIT 1").get(siteId),
    consentedShare: consent.n ? (consent.c ?? 0) / consent.n : 0,
  };
}
