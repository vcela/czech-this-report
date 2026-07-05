import { NextRequest, NextResponse } from "next/server";
import { runAudit, AuditError } from "@/lib/audit/run";
import { saveReport } from "@/lib/db";

export const maxDuration = 120;

// naive in-memory rate limit per IP (resets on redeploy — fine for a free tool)
const hits = new Map<string, { count: number; ts: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const h = hits.get(ip);
  if (h && now - h.ts < WINDOW_MS) {
    if (h.count >= MAX_PER_WINDOW) {
      return NextResponse.json({ error: "rate-limit" }, { status: 429 });
    }
    h.count++;
  } else {
    hits.set(ip, { count: 1, ts: now });
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

  try {
    const report = await runAudit(
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
  }
}
