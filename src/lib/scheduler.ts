import { auditSlotFree } from "./audit/isolate";
import { auditSite, sitesDueForAudit } from "./sites";

const TICK_MS = 60 * 60 * 1000;

/**
 * ponytail: in-process hourly tick, one site at a time. Fine for a handful of
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
    } finally {
      running = false;
    }
  };
  setTimeout(tick, 2 * 60 * 1000).unref();
  setInterval(tick, TICK_MS).unref();
}
