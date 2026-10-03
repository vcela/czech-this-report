import { getDb } from "./db";
import { sitemapEntries } from "./crawl";
import { fetchTextIfOk } from "./audit/fetcher";
import { inspectUrl } from "./google";
import type { Site } from "./sites";

/** Search Console's coverage states, grouped into what an owner can act on. */
export type CoverageGroup =
  | "indexed"
  | "crawled"
  | "discovered"
  | "unknown"
  | "noindex"
  | "robots"
  | "redirect"
  | "notFound"
  | "duplicate"
  | "serverError"
  | "blocked"
  | "other";

export function coverageGroup(verdict: string | null, coverage: string | null): CoverageGroup {
  const c = (coverage ?? "").toLowerCase();
  if (verdict === "PASS" || /submitted and indexed|indexed, not submitted/.test(c)) return "indexed";
  if (c.includes("crawled")) return "crawled";
  if (c.includes("discovered")) return "discovered";
  if (c.includes("unknown to google")) return "unknown";
  if (c.includes("noindex")) return "noindex";
  if (c.includes("robots.txt")) return "robots";
  if (c.includes("redirect")) return "redirect";
  if (c.includes("404")) return "notFound";
  if (c.includes("duplicate") || c.includes("canonical")) return "duplicate";
  if (c.includes("5xx") || c.includes("server error")) return "serverError";
  if (c.includes("401") || c.includes("403")) return "blocked";
  return "other";
}

/** How many pages to inspect per run — well inside the 2,000/day quota. */
const INSPECT_PER_RUN = 200;

/**
 * Ask Google about each sitemap URL, oldest-checked first, so repeated runs
 * walk through a large sitemap instead of re-checking the same pages.
 */
export async function runInspection(site: Site, userId: number): Promise<number> {
  if (!site.gsc_property) return 0;
  const { entries } = await sitemapEntries(site.url);
  const db = getDb();
  const checked = new Map(
    (db.prepare("SELECT url, checked_at FROM url_index WHERE site_id = ?").all(site.id) as { url: string; checked_at: number }[]).map(
      (r) => [r.url, r.checked_at]
    )
  );
  // Pages that left the sitemap are no longer interesting.
  const live = new Set(entries.map((e) => e.url));
  for (const url of checked.keys()) if (!live.has(url)) db.prepare("DELETE FROM url_index WHERE site_id = ? AND url = ?").run(site.id, url);

  const todo = entries
    .map((e) => e.url)
    .sort((a, b) => (checked.get(a) ?? 0) - (checked.get(b) ?? 0))
    .slice(0, INSPECT_PER_RUN);
  const save = db.prepare(
    `INSERT OR REPLACE INTO url_index (site_id, url, verdict, coverage, last_crawl, checked_at) VALUES (?, ?, ?, ?, ?, ?)`
  );
  let n = 0;
  for (const url of todo) {
    try {
      const r = await inspectUrl(userId, site.gsc_property, url);
      save.run(site.id, url, r.verdict, r.coverage, r.lastCrawl, Date.now());
      n++;
    } catch (e) {
      console.error(`URL inspection stopped for ${site.host}`, e);
      break; // quota or auth — the rest waits for the next run
    }
  }
  return n;
}

export interface IndexRow {
  url: string;
  group: CoverageGroup;
  coverage: string | null;
  lastCrawl: string | null;
  checkedAt: number;
}

export function indexRows(siteId: string): IndexRow[] {
  return (
    getDb()
      .prepare("SELECT url, verdict, coverage, last_crawl, checked_at FROM url_index WHERE site_id = ? ORDER BY url")
      .all(siteId) as { url: string; verdict: string | null; coverage: string | null; last_crawl: string | null; checked_at: number }[]
  ).map((r) => ({
    url: r.url,
    group: coverageGroup(r.verdict, r.coverage),
    coverage: r.coverage,
    lastCrawl: r.last_crawl,
    checkedAt: r.checked_at,
  }));
}

export function lastInspection(siteId: string): number | null {
  const r = getDb().prepare("SELECT MAX(checked_at) t FROM url_index WHERE site_id = ?").get(siteId) as { t: number | null };
  return r.t;
}

/* ------------------------------------------------------------- IndexNow */

/** Bing, Seznam, Yandex, Naver… share submissions made to this endpoint. */
const INDEXNOW = "https://api.indexnow.org/indexnow";

const keyFileUrl = (site: Site) => `${new URL(site.url).origin}/${site.indexnow_key}.txt`;
export { keyFileUrl as indexNowKeyUrl };

export async function indexNowKeyOk(site: Site): Promise<boolean> {
  const { text } = await fetchTextIfOk(keyFileUrl(site));
  return text?.trim() === site.indexnow_key;
}

export type IndexNowResult =
  | { ok: true; sent: number }
  | { ok: false; reason: "key" | "nothing" | "rejected"; status?: number };

/** Sends pages changed since the last submission (all of them the first time). */
export async function submitIndexNow(site: Site): Promise<IndexNowResult> {
  if (!site.indexnow_key || !(await indexNowKeyOk(site))) return { ok: false, reason: "key" };
  const host = new URL(site.url).hostname;
  const { entries } = await sitemapEntries(site.url);
  const since = site.indexnow_last_at ?? 0;
  const urls = entries
    .filter((e) => new URL(e.url).hostname === host)
    // After the first run only pages with a newer <lastmod>; resending
    // unchanged pages is what IndexNow asks sites not to do.
    .filter((e) => !since || (e.lastmod !== null && e.lastmod > since))
    .map((e) => e.url)
    .slice(0, 10_000);
  if (!urls.length) return { ok: false, reason: "nothing" };
  const res = await fetch(INDEXNOW, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key: site.indexnow_key, keyLocation: keyFileUrl(site), urlList: urls }),
  });
  if (res.status !== 200 && res.status !== 202) return { ok: false, reason: "rejected", status: res.status };
  getDb().prepare("UPDATE sites SET indexnow_last_at = ? WHERE id = ?").run(Date.now(), site.id);
  return { ok: true, sent: urls.length };
}
