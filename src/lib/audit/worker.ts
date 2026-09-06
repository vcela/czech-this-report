/**
 * Audit worker — one audit per process, then exit.
 *
 * A single audit peaks at 300–400 MB (jsdom builds a DOM, axe builds a second
 * tree over it) and V8 never returns those pages to the OS: measured, the web
 * process sat at 557 MB after three audits and a forced global.gc() moved RSS
 * by 1 MB. Hosting is billed on RSS over time, so the leftovers were most of
 * the bill — and with the container's 512 MB heap cap the third heavy audit
 * OOM-killed the whole service. Exiting the process is the only thing that
 * actually gives the memory back.
 *
 * Compiled to dist-worker/worker.js by tsconfig.worker.json (CommonJS — this
 * runs as a plain node process, not through the Next bundler).
 */
import { AuditError, runAudit } from "./run";

export type WorkerRequest = { url: string; prevId?: string };
export type WorkerResponse =
  | { ok: true; report: unknown }
  | { ok: false; code: "invalid-url" | "site-error" | "unreachable"; message: string };

function reply(msg: WorkerResponse): void {
  // Exit only once the IPC frame is flushed, and hard: jsdom's requestAnimation
  // Frame loop keeps the event loop alive, so a graceful exit would hang.
  process.send?.(msg, undefined, undefined, () => process.exit(0));
}

process.on("message", async (req: WorkerRequest) => {
  try {
    reply({ ok: true, report: await runAudit(req.url, req.prevId) });
  } catch (e) {
    reply({
      ok: false,
      code: e instanceof AuditError ? e.code : "unreachable",
      message: e instanceof Error ? e.message : String(e),
    });
  }
});
