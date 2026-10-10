import { NextResponse, after } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["en", "cs"];

const BOTS = /Googlebot|bingbot|SeznamBot|Applebot|YandexBot|DuckDuckBot|OAI-SearchBot|ChatGPT-User|GPTBot|PerplexityBot|Perplexity-User|Claude-SearchBot|Claude-User|ClaudeBot|meta-externalagent|CCBot|Bytespider|Amazonbot/i;

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Czech Th!s Report crawler log; the key is secret, so it lives in env.
  const ua = request.headers.get("user-agent") ?? "";
  const botsKey = process.env.CTR_BOTS_KEY;
  if (botsKey && BOTS.test(ua)) {
    after(() =>
      fetch("https://report.czech-this.com/api/bots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          s: "xErIOegcCsWG",
          k: botsKey,
          ua,
          ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
          path: pathname,
        }),
      }).catch(() => {})
    );
  }

  const hasLocale = LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (hasLocale) return NextResponse.next();

  // Prefer Czech for Czech/Slovak browsers, English otherwise
  const accept = request.headers.get("accept-language") ?? "";
  const locale = /^(cs|sk)\b/i.test(accept.split(",")[0] ?? "") ? "cs" : "en";
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: [
    // everything except api, static assets and metadata files
    "/((?!api|_next|favicon\\.ico|icon\\.svg|robots\\.txt|sitemap\\.xml|og\\.png|.*\\.(?:png|jpg|svg|webp|ico|txt|xml|js)).*)",
  ],
};
