import { NextResponse } from "next/server";
import v8 from "node:v8";

// Dedicated health check target for the hosting platform. `/` itself always
// 308-redirects to a locale (see src/proxy.ts) and must not be used as the
// healthcheck path, or the platform will read the redirect as "unhealthy".
//
// It also reports memory, because the hosting bill is driven by RSS and there
// is no way to tune the heap cap without seeing it. `heapLimit` is what V8
// thinks it may grow to — if that reads far above the container's real limit,
// V8 will let garbage pile up instead of collecting it, and Railway bills for
// the difference. Set NODE_OPTIONS=--max-old-space-size=<MB> to pin it.
const mb = (bytes: number) => Math.round(bytes / 1024 / 1024);

export function GET() {
  const m = process.memoryUsage();
  return NextResponse.json({
    ok: true,
    memoryMb: {
      rss: mb(m.rss),
      heapUsed: mb(m.heapUsed),
      heapTotal: mb(m.heapTotal),
      external: mb(m.external),
      heapLimit: mb(v8.getHeapStatistics().heap_size_limit),
    },
  });
}
