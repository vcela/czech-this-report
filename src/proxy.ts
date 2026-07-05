import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["en", "cs"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
    "/((?!api|_next|favicon\\.ico|icon\\.svg|robots\\.txt|sitemap\\.xml|og\\.png|.*\\.(?:png|jpg|svg|webp|ico|txt|xml)).*)",
  ],
};
