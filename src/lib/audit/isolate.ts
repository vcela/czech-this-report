import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { AuditError, runAudit } from "./run";
import type { Report } from "./types";
import type { WorkerRequest, WorkerResponse } from "./worker";

/** Built by `tsc -p tsconfig.worker.json`, which runs before `next build`. */
const WORKER = path.join(process.cwd(), "dist-worker", "worker.js");

/**
 * Cap for one audit. It can be generous precisely because the process exits
 * afterwards: a 15-second peak costs nothing on a bill that averages RSS over
 * the month, whereas the same memory held by the web process costs all month.
 * Measured: a link-heavy homepage peaks near 700 MB inside axe, so 512 was not
 * enough — the audit died where the in-process version used to kill the server.
 */
const CHILD_HEAP_MB = 1024;

/** Longer than the route's own budget; this is the "child wedged" backstop. */
const CHILD_TIMEOUT_MS = 150_000;

/**
 * Run one audit in a throwaway process so its memory is returned to the OS when
 * it exits, and so an out-of-memory page kills only that audit instead of the
 * web service. Falls back to running in-process when the compiled worker is not
 * there — that is `next dev`, where the tsc step has not run.
 */
export async function runAuditIsolated(url: string, prevId?: string): Promise<Report> {
  if (!fs.existsSync(WORKER)) return runAudit(url, prevId);

  return new Promise<Report>((resolve, reject) => {
    // spawn(node, [script]) rather than fork(script): fork's first argument is
    // traced by the bundler as an import, and the worker is deliberately built
    // outside the Next bundle. The "ipc" slot gives us child.send() all the same.
    const child = spawn(
      process.execPath,
      [`--max-old-space-size=${CHILD_HEAP_MB}`, WORKER],
      { stdio: ["ignore", "inherit", "inherit", "ipc"] }
    );
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      fn();
    };
    const timer = setTimeout(
      () => finish(() => reject(new AuditError("The audit timed out", "unreachable"))),
      CHILD_TIMEOUT_MS
    );

    child.on("message", (msg: WorkerResponse) => {
      if (msg.ok) finish(() => resolve(msg.report as Report));
      else finish(() => reject(new AuditError(msg.message, msg.code)));
    });
    // Covers the OOM kill and any crash: the child is gone without a reply.
    child.on("exit", () =>
      finish(() => reject(new AuditError("The audit could not be completed", "unreachable")))
    );
    child.on("error", (e) => finish(() => reject(new AuditError(e.message, "unreachable"))));

    child.send({ url, prevId } satisfies WorkerRequest);
  });
}
