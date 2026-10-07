import { auditSlotFree } from "./audit/isolate";
import { getDb } from "./db";
import { aiConfigured, runGeoCheck } from "./ai";
import { runInspection } from "./indexing";
import { auditSite, sitesDueForAudit, type Site } from "./sites";

const TICK_MS = 60 * 60 * 1000;
const WEEK = 7 * 86_400_000;

/** Sites linked to Search Console whose index check is a week old (or never ran). */
function dueForInspection(): (Site & { user_id: number })[] {
  return getDb()
    .prepare(
      `SELECT s.* FROM sites s JOIN google_tokens g ON g.user_id = s.user_id
       WHERE s.gsc_property IS NOT NULL
         AND COALESCE((SELECT MAX(checked_at) FROM url_index WHERE site_id = s.id), 0) < ?`
    )
    .all(Date.now() - WEEK) as (Site & { user_id: number })[];
}

function dueForGeo(): Site[] {
  return getDb()
    .prepare(
      `SELECT s.* FROM sites s WHERE s.geo_prompts != ''
         AND COALESCE((SELECT MAX(run_at) FROM geo_results WHERE site_id = s.id), 0) < ?`
    )
    .all(Date.now() - WEEK) as Site[];
}

async function each<T extends { host: string }>(label: string, list: T[], fn: (x: T) => Promise<unknown>) {
  for (const x of list) {
    try {
      await fn(x);
    } catch (e) {
      console.error(`Scheduled ${label} failed for ${x.host}`, e);
    }
  }
}

/**
 * ponytail: in-process hourly tick, one job at a time. Fine for a handful of
 * sites on one instance; move to a separate Railway worker/cron service when
 * there are many sites or more than one web instance (each would tick).
 */
export function startScheduler(): void {
  const g = globalThis as { __ctrScheduler?: boolean };
  if (g.__ctrScheduler) return; // dev hot-reload re-runs register()
  g.__ctrScheduler = true;

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      for (const site of sitesDueForAudit()) {
        // Leave room for visitors of the public tool; the site stays due and
        // is picked up on the next tick.
        if (!auditSlotFree()) break;
        try {
          await auditSite(site);
        } catch (e) {
          console.error(`Scheduled audit failed for ${site.host}`, e);
        }
      }
      await each("index check", dueForInspection(), (s) => runInspection(s, s.user_id));
      if (aiConfigured()) await each("AI citation check", dueForGeo(), runGeoCheck);
    } finally {
      running = false;
    }
  };
  setTimeout(tick, 2 * 60 * 1000).unref();
  setInterval(tick, TICK_MS).unref();
}
