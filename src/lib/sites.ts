import { randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { getDb, getReport, saveReport } from "./db";
import { assertPublicHost, fetchSite, normalizeUrl } from "./audit/fetcher";
import { runAuditIsolated } from "./audit/isolate";
import type { Report } from "./audit/types";

/** How often a verified site is re-audited automatically. */
export const AUDIT_INTERVAL_DAYS = 7;

export const VERIFY_META = "czech-this-verify";

export interface Site {
  id: string;
  url: string;
  host: string;
  verify_token: string;
  verified_at: string | null;
  created_at: string;
  goal_paths: string;
}

export interface SiteRow extends Site {
  last_report_id: string | null;
  last_audit_at: string | null;
  last_overall: number | null;
}

const LAST_REPORT = `
  (SELECT sr.report_id FROM site_reports sr WHERE sr.site_id = s.id ORDER BY sr.created_at DESC LIMIT 1)`;

export function listSites(userId: number): SiteRow[] {
  return getDb()
    .prepare(
      `SELECT s.*, r.id AS last_report_id, r.created_at AS last_audit_at, r.overall AS last_overall
       FROM sites s LEFT JOIN reports r ON r.id = ${LAST_REPORT}
       WHERE s.user_id = ? ORDER BY s.host`
    )
    .all(userId) as SiteRow[];
}

/** Ownership is part of the lookup, so a guessed id never reaches another account's site. */
export function getSite(userId: number, siteId: string): Site | null {
  return (
    (getDb()
      .prepare("SELECT * FROM sites WHERE id = ? AND user_id = ?")
      .get(siteId, userId) as Site | undefined) ?? null
  );
}

/** Throws on an invalid/private address; returns the existing site if already added. */
export function addSite(userId: number, input: string): string {
  const url = new URL(normalizeUrl(input)).origin;
  assertPublicHost(url);
  const host = new URL(url).hostname.replace(/^www\./, "");
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM sites WHERE user_id = ? AND host = ?")
    .get(userId, host) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = randomBytes(9).toString("base64url");
  db.prepare(
    "INSERT INTO sites (id, user_id, url, host, verify_token, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, userId, url, host, randomBytes(16).toString("hex"), new Date().toISOString());
  return id;
}

/** Public lookup for the tracking endpoint: the site id is not a secret, it's in every page's HTML. */
export function getSiteHost(siteId: string): string | null {
  const row = getDb().prepare("SELECT host FROM sites WHERE id = ?").get(siteId) as { host: string } | undefined;
  return row?.host ?? null;
}

export function setGoals(userId: number, siteId: string, goalPaths: string): void {
  getDb()
    .prepare("UPDATE sites SET goal_paths = ? WHERE id = ? AND user_id = ?")
    .run(goalPaths.slice(0, 2000), siteId, userId);
}

export function deleteSite(userId: number, siteId: string): void {
  // site_reports rows cascade; the reports themselves fall back to normal retention.
  getDb().prepare("DELETE FROM sites WHERE id = ? AND user_id = ?").run(siteId, userId);
}

/** Meta tag on the homepage, or a DNS TXT record on the host — whichever the owner can do. */
export async function verifySite(site: Site): Promise<boolean> {
  const expected = `${VERIFY_META}=${site.verify_token}`;
  try {
    const records = await resolveTxt(site.host);
    if (records.some((parts) => parts.join("") === expected)) return markVerified(site.id);
  } catch {
    /* no TXT records — fall through to the meta tag */
  }
  try {
    const snap = await fetchSite(site.url);
    const content = snap.$(`meta[name="${VERIFY_META}"]`).attr("content")?.trim();
    if (content === site.verify_token) return markVerified(site.id);
  } catch {
    /* unreachable site counts as not verified */
  }
  return false;
}

function markVerified(siteId: string): true {
  getDb()
    .prepare("UPDATE sites SET verified_at = ? WHERE id = ?")
    .run(new Date().toISOString(), siteId);
  return true;
}

export function siteHistory(siteId: string): Report[] {
  const ids = getDb()
    .prepare("SELECT report_id FROM site_reports WHERE site_id = ? ORDER BY created_at DESC LIMIT 52")
    .all(siteId) as { report_id: string }[];
  return ids.map((r) => getReport(r.report_id)).filter((r): r is Report => r !== null);
}

/** Audit a registered site; chains prevId so the report page shows the delta. */
export async function auditSite(site: Site): Promise<Report> {
  const prev = siteHistory(site.id)[0];
  const report = await runAuditIsolated(site.url, prev?.id);
  saveReport(report);
  getDb()
    .prepare("INSERT INTO site_reports (site_id, report_id, created_at) VALUES (?, ?, ?)")
    .run(site.id, report.id, report.createdAt);
  return report;
}

/** Verified sites whose last audit is older than the interval (or that have none). */
export function sitesDueForAudit(): Site[] {
  const cutoff = new Date(Date.now() - AUDIT_INTERVAL_DAYS * 86_400_000).toISOString();
  return getDb()
    .prepare(
      `SELECT s.* FROM sites s
       WHERE s.verified_at IS NOT NULL
         AND COALESCE((SELECT MAX(created_at) FROM site_reports WHERE site_id = s.id), '') < ?`
    )
    .all(cutoff) as Site[];
}
