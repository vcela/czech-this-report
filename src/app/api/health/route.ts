import { NextResponse } from "next/server";

// Dedicated health check target for the hosting platform. `/` itself always
// 308-redirects to a locale (see src/proxy.ts) and must not be used as the
// healthcheck path, or the platform will read the redirect as "unhealthy".
export function GET() {
  return NextResponse.json({ ok: true });
}
