import { NextRequest } from "next/server";
import { recordHit, type Hit } from "@/lib/analytics";
import { getSiteHost } from "@/lib/sites";
import { isBotUserAgent } from "@/lib/traffic";

/** Called cross-origin from the owners' sites by public/ctr.js. */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const done = () => new Response(null, { status: 204, headers: CORS });

export function OPTIONS() {
  return done();
}

const TYPES = new Set<Hit["type"]>(["pageview", "form", "event", "search"]);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export async function POST(req: NextRequest) {
  // Always 204: the script never retries, and a tracker that reports errors
  // back to visitors' consoles helps nobody.
  const text = await req.text();
  if (text.length > 4000) return done();
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(text);
  } catch {
    return done();
  }

  const ua = req.headers.get("user-agent") ?? "";
  const type = d.t as Hit["type"];
  if (!TYPES.has(type) || isBotUserAgent(ua)) return done();

  const host = getSiteHost(str(d.s, 40));
  const url = str(d.u, 2000);
  if (!host || !url) return done();

  // Only count hits from the site itself — a copied snippet on someone else's
  // domain must not pollute the stats.
  let pageHost: string;
  try {
    pageHost = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return done();
  }
  const origin = req.headers.get("origin");
  const originHost = origin ? origin.replace(/^https?:\/\//, "").replace(/:\d+$/, "").replace(/^www\./, "") : pageHost;
  const belongs = (h: string) => h === host || h.endsWith("." + host);
  if (!belongs(pageHost) || !belongs(originHost)) return done();

  const value = Number(d.val);
  recordHit({
    siteId: str(d.s, 40),
    siteHost: host,
    type,
    url,
    referrer: str(d.r, 2000),
    consentedId: /^[\w-]{8,64}$/.test(str(d.v, 64)) ? str(d.v, 64) : null,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    ua,
    name: str(d.n, 100) || null,
    value: Number.isFinite(value) ? value : null,
    screenWidth: d.w,
  });
  return done();
}
