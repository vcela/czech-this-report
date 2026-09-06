import { NextRequest, NextResponse } from "next/server";
import { AuditError } from "@/lib/audit/run";
import { runAuditIsolated } from "@/lib/audit/isolate";
import { saveReport } from "@/lib/db";

export const maxDuration = 120;

// naive in-memory rate limit per IP (resets on redeploy — fine for a free tool)
const hits = new Map<string, { count: number; ts: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;

/**
 * One audit holds a cheerio tree and a full jsdom window at once, so peak
 * memory scales with concurrent audits, not with traffic. Each one now runs in
 * its own child process (see isolate.ts), so this cap bounds how many of those
 * can exist at a time.
 */
const MAX_CONCURRENT = 2;
let inFlight = 0;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  // ponytail: wholesale clear instead of per-entry expiry — an unbounded Map is
  // the leak, and losing a window early only ever helps the user.
  if (hits.size > 5000) hits.clear();
  const h = hits.get(ip);
  if (h && now - h.ts < WINDOW_MS) {
    if (h.count >= MAX_PER_WINDOW) {
      return NextResponse.json({ error: "rate-limit" }, { status: 429 });
    }
    h.count++;
  } else {
    hits.set(ip, { count: 1, ts: now });
  }

  if (inFlight >= MAX_CONCURRENT) {
    // the client already renders `rate-limit` as "try again in a moment"
    return NextResponse.json({ error: "rate-limit" }, { status: 429 });
  }

  let body: { url?: string; prevId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-url" }, { status: 400 });
  }
  if (!body.url || typeof body.url !== "string" || body.url.length > 2000) {
    return NextResponse.json({ error: "invalid-url" }, { status: 400 });
  }

  inFlight++;
  try {
    const report = await runAuditIsolated(
      body.url,
      typeof body.prevId === "string" ? body.prevId.slice(0, 20) : undefined
    );
    saveReport(report);
    return NextResponse.json({ id: report.id });
  } catch (e) {
    if (e instanceof AuditError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 422 });
    }
    const msg = e instanceof Error ? e.message : "unknown";
    if (/Unsupported protocol|Invalid hostname|Invalid URL|Private or local/.test(msg)) {
      return NextResponse.json({ error: "invalid-url" }, { status: 400 });
    }
    // fetch failures (DNS, timeout, refused)
    return NextResponse.json({ error: "unreachable" }, { status: 422 });
  } finally {
    inFlight--;
  }
}
