"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSession, destroySession, findUserByEmail, requireUser, verifyPassword } from "@/lib/auth";
import { isLocale, type Locale } from "@/lib/i18n";
import { auditSlotFree } from "@/lib/audit/isolate";
import { addSite, auditSite, deleteSite, getSite, verifySite } from "@/lib/sites";

const loc = (fd: FormData): Locale => {
  const l = String(fd.get("locale") ?? "");
  return isLocale(l) ? l : "en";
};

// naive in-memory limit per IP, same approach as /api/audit
const attempts = new Map<string, { count: number; ts: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export type LoginState = { error?: "invalid" | "rate-limit" } | undefined;

export async function login(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  if (attempts.size > 5000) attempts.clear();
  const a = attempts.get(ip);
  if (a && now - a.ts < WINDOW_MS) {
    if (a.count >= MAX_ATTEMPTS) return { error: "rate-limit" };
    a.count++;
  } else attempts.set(ip, { count: 1, ts: now });

  const email = String(fd.get("email") ?? "").slice(0, 200);
  const password = String(fd.get("password") ?? "").slice(0, 200);
  const user = email && password ? findUserByEmail(email) : undefined;
  if (!user || !(await verifyPassword(password, user.password_hash))) return { error: "invalid" };

  attempts.delete(ip);
  await createSession(user.id);
  redirect(`/${loc(fd)}/dashboard`);
}

export async function logout(fd: FormData) {
  await destroySession();
  redirect(`/${loc(fd)}/login`);
}

export async function addSiteAction(fd: FormData) {
  const locale = loc(fd);
  const user = await requireUser(locale);
  let id: string;
  try {
    id = addSite(user.id, String(fd.get("url") ?? "").slice(0, 500));
  } catch {
    redirect(`/${locale}/dashboard?error=url`);
  }
  redirect(`/${locale}/dashboard/${id}`);
}

/** Resolves the site through the signed-in user, so ids from the form are never trusted alone. */
async function ownedSite(fd: FormData) {
  const locale = loc(fd);
  const user = await requireUser(locale);
  const site = getSite(user.id, String(fd.get("siteId") ?? ""));
  if (!site) redirect(`/${locale}/dashboard`);
  return { locale, user, site, path: `/${locale}/dashboard/${site.id}` };
}

export async function verifySiteAction(fd: FormData) {
  const { site, path } = await ownedSite(fd);
  const ok = await verifySite(site);
  redirect(ok ? path : `${path}?error=verify`);
}

export async function auditSiteAction(fd: FormData) {
  const { site, path } = await ownedSite(fd);
  if (!auditSlotFree()) redirect(`${path}?error=audit`);
  let failed = false;
  try {
    await auditSite(site);
  } catch (e) {
    console.error(`Manual audit failed for ${site.host}`, e);
    failed = true;
  }
  revalidatePath(path);
  redirect(failed ? `${path}?error=audit` : path);
}

export async function deleteSiteAction(fd: FormData) {
  const { locale, user, site } = await ownedSite(fd);
  deleteSite(user.id, site.id);
  redirect(`/${locale}/dashboard`);
}
