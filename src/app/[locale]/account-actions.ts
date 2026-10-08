"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSession, destroySession, findUserByEmail, requireUser, verifyPassword } from "@/lib/auth";
import { isLocale, type Locale } from "@/lib/i18n";
import { auditSlotFree } from "@/lib/audit/isolate";
import {
  addCompetitors, addSite, auditCompetitor, auditSite, deleteSite, getSite, removeCompetitor, setGoals,
  updateSite, verifySite,
} from "@/lib/sites";
import { disconnectGoogle, getSearchSummaryForSite, submitSitemap } from "@/lib/google";
import { runInspection, submitIndexNow } from "@/lib/indexing";
import { sitemapEntries } from "@/lib/crawl";
import { aiConfigured, findCompetitors, runGeoCheck, saveSuggestion, suggestPrompts, suggestTopics, MAX_PROMPTS } from "@/lib/ai";
import { getStats, parseGoals, setCampaignCost } from "@/lib/analytics";
import { runSetupChecks } from "@/lib/setup";

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
  const path = `/${locale}/dashboard/${site.id}`;
  // Every site action changes something its tabs show; the flag is read when
  // the action finishes, so setting it up front still covers the mutation.
  // Without it a redirect back to the same URL would show stale data.
  revalidatePath(path, "layout");
  return { locale, user, site, path };
}

export async function verifySiteAction(fd: FormData) {
  const { site, path } = await ownedSite(fd);
  const ok = await verifySite(site);
  redirect(ok ? `${path}/setup` : `${path}/setup?error=verify`);
}

export async function auditSiteAction(fd: FormData) {
  const owned = await ownedSite(fd);
  const site = owned.site;
  const path = `${owned.path}/audit`;
  if (!auditSlotFree()) redirect(`${path}?error=audit`);
  let failed = false;
  try {
    await auditSite(site);
  } catch (e) {
    console.error(`Manual audit failed for ${site.host}`, e);
    failed = true;
  }
  redirect(failed ? `${path}?error=audit` : path);
}

export async function deleteSiteAction(fd: FormData) {
  const { locale, user, site } = await ownedSite(fd);
  deleteSite(user.id, site.id);
  redirect(`/${locale}/dashboard`);
}

export async function saveGoalsAction(fd: FormData) {
  const { user, site, path } = await ownedSite(fd);
  setGoals(user.id, site.id, String(fd.get("goals") ?? ""));
  redirect(`${path}/setup?saved=1`);
}

/* ------------------------------------------------------------ F3 + F4 */

// ponytail: per-process throttle for buttons that call paid or quota'd APIs.
const lastRun = new Map<string, number>();
function throttled(key: string, ms = 2 * 60_000): boolean {
  const t = lastRun.get(key) ?? 0;
  if (Date.now() - t < ms) return true;
  lastRun.set(key, Date.now());
  return false;
}

export async function disconnectGoogleAction(fd: FormData) {
  const { user, path } = await ownedSite(fd);
  disconnectGoogle(user.id);
  redirect(`${path}/setup`);
}

export async function setPropertyAction(fd: FormData) {
  const { user, site, path } = await ownedSite(fd);
  updateSite(user.id, site.id, { gsc_property: String(fd.get("property") ?? "").slice(0, 300) || null });
  redirect(`${path}/setup?saved=1`);
}

export async function submitSitemapAction(fd: FormData) {
  const { user, site, path } = await ownedSite(fd);
  if (!site.gsc_property) redirect(`${path}/search`);
  let msg = "sitemap-ok";
  try {
    const { sitemaps } = await sitemapEntries(site.url);
    if (!sitemaps.length) msg = "sitemap-none";
    for (const sm of sitemaps) await submitSitemap(user.id, site.gsc_property, sm);
  } catch (e) {
    console.error("Sitemap submit failed", e);
    msg = "google-error";
  }
  redirect(`${path}/search?msg=${msg}`);
}

export async function inspectAction(fd: FormData) {
  const { user, site, path } = await ownedSite(fd);
  if (throttled(`inspect:${site.id}`, 10 * 60_000)) redirect(`${path}/search?msg=wait`);
  let msg = "inspect-ok";
  try {
    await runInspection(site, user.id);
  } catch (e) {
    console.error("Inspection failed", e);
    msg = "google-error";
  }
  redirect(`${path}/search?msg=${msg}`);
}

export async function indexNowAction(fd: FormData) {
  const { site, path } = await ownedSite(fd);
  if (throttled(`indexnow:${site.id}`)) redirect(`${path}/search?msg=wait`);
  let msg: string;
  try {
    const r = await submitIndexNow(site);
    msg = r.ok ? `indexnow-ok&n=${r.sent}` : `indexnow-${r.reason}`;
  } catch (e) {
    console.error("IndexNow failed", e);
    msg = "indexnow-rejected";
  }
  redirect(`${path}/search?msg=${msg}`);
}

export async function savePromptsAction(fd: FormData) {
  const { user, site, path } = await ownedSite(fd);
  const prompts = String(fd.get("prompts") ?? "")
    .split("\n")
    .map((x) => x.trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, MAX_PROMPTS)
    .join("\n");
  updateSite(user.id, site.id, { geo_prompts: prompts, brand: String(fd.get("brand") ?? "").trim().slice(0, 60) });
  redirect(`${path}/ai?msg=saved`);
}

async function aiAction(fd: FormData, kind: string, fn: (ctx: Awaited<ReturnType<typeof ownedSite>>) => Promise<void>) {
  const ctx = await ownedSite(fd);
  if (!aiConfigured()) redirect(`${ctx.path}/ai`);
  if (throttled(`${kind}:${ctx.site.id}`)) redirect(`${ctx.path}/ai?msg=wait`);
  let msg = `${kind}-ok`;
  try {
    await fn(ctx);
  } catch (e) {
    console.error(`AI ${kind} failed`, e);
    msg = "ai-error";
  }
  redirect(`${ctx.path}/ai?msg=${msg}#${kind}`);
}

export async function suggestPromptsAction(fd: FormData) {
  await aiAction(fd, "prompts", async ({ user, site }) => {
    updateSite(user.id, site.id, { geo_prompts: (await suggestPrompts(site)).join("\n") });
  });
}

export async function runGeoAction(fd: FormData) {
  await aiAction(fd, "geo", async ({ site }) => {
    await runGeoCheck(site);
  });
}

export async function suggestTopicsAction(fd: FormData) {
  await aiAction(fd, "topics", async ({ user, site, locale }) => {
    const stats = getStats(site.id, 90, parseGoals(site.goal_paths));
    const gsc = await getSearchSummaryForSite(user.id, site, 90);
    const topics = await suggestTopics(
      site,
      {
        gscQueries: (gsc?.queries ?? []).map((q) => ({ q: q.key, impressions: q.impressions, position: q.position })),
        siteSearches: stats.searches.map((x) => ({ q: x.query, count: x.count, noResults: x.noResults })),
      },
      locale
    );
    saveSuggestion(site.id, `topics-${locale}`, topics);
  });
}

export async function findCompetitorsAction(fd: FormData) {
  await aiAction(fd, "competitors", async ({ site, locale }) => {
    addCompetitors(site.id, await findCompetitors(site, locale), "ai-search");
  });
}

export async function addCompetitorAction(fd: FormData) {
  const { site, path } = await ownedSite(fd);
  const raw = String(fd.get("domain") ?? "").trim();
  try {
    const domain = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname.replace(/^www\./, "");
    if (domain.includes(".") && domain !== site.host) addCompetitors(site.id, [{ domain, reason: "" }], "manual");
  } catch {
    /* ignore garbage */
  }
  redirect(`${path}/ai#competitors`);
}

export async function removeCompetitorAction(fd: FormData) {
  const { site, path } = await ownedSite(fd);
  removeCompetitor(site.id, String(fd.get("domain") ?? ""));
  redirect(`${path}/ai#competitors`);
}

export async function auditCompetitorAction(fd: FormData) {
  const { site, path } = await ownedSite(fd);
  if (!auditSlotFree()) redirect(`${path}/ai?msg=busy#competitors`);
  let msg = "compare-ok";
  try {
    await auditCompetitor(site.id, String(fd.get("domain") ?? ""));
  } catch (e) {
    console.error("Competitor audit failed", e);
    msg = "compare-error";
  }
  redirect(`${path}/ai?msg=${msg}#competitors`);
}

export async function campaignCostAction(fd: FormData) {
  const { site, path } = await ownedSite(fd);
  const raw = String(fd.get("amount") ?? "").replace(/\s/g, "").replace(",", ".");
  const amount = raw === "" ? null : Number(raw);
  if (amount === null || (Number.isFinite(amount) && amount >= 0)) {
    setCampaignCost(site.id, String(fd.get("campaign") ?? ""), amount);
  }
  redirect(`${path}#campaigns`);
}

export async function checkSetupAction(fd: FormData) {
  const { site, path } = await ownedSite(fd);
  if (throttled(`setup:${site.id}`, 15_000)) redirect(`${path}/setup?msg=wait`);
  try {
    await runSetupChecks(site);
  } catch (e) {
    console.error("Setup check failed", e);
  }
  redirect(`${path}/setup?checked=1`);
}
