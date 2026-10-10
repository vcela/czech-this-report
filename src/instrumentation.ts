export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Next exits with 143 on SIGTERM, which Railway reports as "Deploy Crashed"
    // every time a redeploy stops the old container. With
    // NEXT_MANUAL_SIG_HANDLE set (railway.json) we exit cleanly instead.
    // ponytail: no graceful drain of in-flight requests; the old container is
    // being replaced anyway.
    if (process.env.NEXT_MANUAL_SIG_HANDLE) {
      for (const sig of ["SIGTERM", "SIGINT"] as const) process.once(sig, () => process.exit(0));
    }

    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
