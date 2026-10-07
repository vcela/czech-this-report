import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { authUrl, googleConfigured } from "@/lib/google";
import { isLocale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

/** Starts the Google sign-in; the state cookie ties the callback to this browser. */
export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale") ?? "en";
  const site = (req.nextUrl.searchParams.get("site") ?? "").slice(0, 40);
  if (!isLocale(locale) || !(await getUser()) || !googleConfigured()) {
    return NextResponse.redirect(`${SITE_URL}/${isLocale(locale) ? locale : "en"}/dashboard`);
  }
  const state = randomBytes(16).toString("base64url");
  const res = NextResponse.redirect(authUrl(state));
  res.cookies.set("ctr_gstate", `${state}|${locale}|${site}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/google",
    maxAge: 600,
  });
  return res;
}
