import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cached, dropCached, getDb } from "./db";
import { SITE_URL } from "./site";

/**
 * Google Search Console over plain REST + OAuth 2.0 — no SDK. `webmasters`
 * (not .readonly) because submitting a sitemap is a write.
 */
const SCOPE = "https://www.googleapis.com/auth/webmasters";
export const GOOGLE_REDIRECT = `${SITE_URL}/api/google/callback`;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
export const googleConfigured = () => !!(CLIENT_ID && CLIENT_SECRET);

export function authUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

/* The refresh token is a long-lived key to the owner's Search Console, so it
 * is stored encrypted; the key derives from the client secret, which lives
 * only in the environment, not in the database. */
const key = () => createHash("sha256").update("ctr-google|" + CLIENT_SECRET).digest();
function seal(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}
function open(sealed: string): string {
  const [iv, tag, enc] = sealed.split(".").map((s) => Buffer.from(s, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...params }),
  });
  const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) throw new Error(`Google token error: ${data.error ?? res.status}`);
  return data;
}

export async function connectGoogle(userId: number, code: string): Promise<void> {
  const t = await tokenRequest({ code, redirect_uri: GOOGLE_REDIRECT, grant_type: "authorization_code" });
  if (!t.refresh_token) throw new Error("Google returned no refresh token");
  getDb()
    .prepare("INSERT OR REPLACE INTO google_tokens (user_id, refresh_token, created_at) VALUES (?, ?, ?)")
    .run(userId, seal(t.refresh_token), new Date().toISOString());
  access.delete(userId);
  dropCached(`gsc:${userId}:`);
}

export function disconnectGoogle(userId: number): void {
  getDb().prepare("DELETE FROM google_tokens WHERE user_id = ?").run(userId);
  access.delete(userId);
}

export function hasGoogle(userId: number): boolean {
  return !!getDb().prepare("SELECT 1 FROM google_tokens WHERE user_id = ?").get(userId);
}

// ponytail: access tokens in process memory; a restart just refreshes again.
const access = new Map<number, { token: string; exp: number }>();

async function accessToken(userId: number): Promise<string> {
  const hit = access.get(userId);
  if (hit && hit.exp > Date.now() + 60_000) return hit.token;
  const row = getDb().prepare("SELECT refresh_token FROM google_tokens WHERE user_id = ?").get(userId) as
    | { refresh_token: string }
    | undefined;
  if (!row) throw new GoogleNotConnected();
  let refresh: string;
  try {
    refresh = open(row.refresh_token);
  } catch {
    disconnectGoogle(userId); // secret rotated — the owner has to reconnect
    throw new GoogleNotConnected();
  }
  try {
    const t = await tokenRequest({ refresh_token: refresh, grant_type: "refresh_token" });
    access.set(userId, { token: t.access_token!, exp: Date.now() + (t.expires_in ?? 3600) * 1000 });
    return t.access_token!;
  } catch (e) {
    // Revoked in the Google account: forget it so the UI offers to reconnect.
    if (String(e).includes("invalid_grant")) {
      disconnectGoogle(userId);
      throw new GoogleNotConnected();
    }
    throw e;
  }
}

export class GoogleNotConnected extends Error {}

async function api<T>(userId: number, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${await accessToken(userId)}`, "content-type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`Google API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

const WM = "https://www.googleapis.com/webmasters/v3/sites";
const enc = encodeURIComponent;

/** Properties the owner has in Search Console. */
export function listProperties(userId: number) {
  return cached(`gsc:${userId}:props`, 3600_000, async () => {
    const r = await api<{ siteEntry?: { siteUrl: string; permissionLevel: string }[] }>(userId, WM);
    return (r.siteEntry ?? []).filter((s) => s.permissionLevel !== "siteUnverifiedUser").map((s) => s.siteUrl);
  });
}

/** The best Search Console property for a host: domain property first, then https / www variants. */
export function pickProperty(props: string[], host: string): string | null {
  const order = [`sc-domain:${host}`, `https://${host}/`, `https://www.${host}/`, `http://${host}/`, `http://www.${host}/`];
  return order.find((p) => props.includes(p)) ?? null;
}

export interface GscRow {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscSummary {
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  queries: GscRow[];
  pages: GscRow[];
  from: string;
  to: string;
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function searchSummary(userId: number, property: string, days: number): Promise<GscSummary> {
  // Search Console data lags by ~2 days; ending the window there avoids a fake dip.
  const to = isoDay(Date.now() - 2 * 86_400_000);
  const from = isoDay(Date.now() - (days + 1) * 86_400_000);
  return cached(`gsc:${userId}:sa:${property}:${days}:${to}`, 6 * 3600_000, async () => {
    const q = (dimensions: string[], rowLimit: number) =>
      api<{ rows?: { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }[] }>(
        userId,
        `${WM}/${enc(property)}/searchAnalytics/query`,
        { method: "POST", body: JSON.stringify({ startDate: from, endDate: to, dimensions, rowLimit }) }
      ).then((r) => (r.rows ?? []).map((x) => ({ key: x.keys?.[0] ?? "", clicks: x.clicks, impressions: x.impressions, ctr: x.ctr, position: x.position })));
    const [tot, queries, pages] = await Promise.all([q([], 1), q(["query"], 50), q(["page"], 25)]);
    return {
      totals: tot[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      queries,
      pages,
      from,
      to,
    };
  });
}

export interface SitemapStatus {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  errors?: string;
  warnings?: string;
  isPending?: boolean;
}

export function listSitemaps(userId: number, property: string) {
  return cached(`gsc:${userId}:sm:${property}`, 3600_000, async () => {
    const r = await api<{ sitemap?: SitemapStatus[] }>(userId, `${WM}/${enc(property)}/sitemaps`);
    return r.sitemap ?? [];
  });
}

export async function submitSitemap(userId: number, property: string, sitemapUrl: string): Promise<void> {
  await api(userId, `${WM}/${enc(property)}/sitemaps/${enc(sitemapUrl)}`, { method: "PUT" });
  dropCached(`gsc:${userId}:sm:`);
}

export interface Inspection {
  verdict: string | null;
  coverage: string | null;
  lastCrawl: string | null;
}

/** URL Inspection API — quota is 2,000 URLs a day per property. */
export async function inspectUrl(userId: number, property: string, url: string): Promise<Inspection> {
  const r = await api<{
    inspectionResult?: { indexStatusResult?: { verdict?: string; coverageState?: string; lastCrawlTime?: string } };
  }>(userId, "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method: "POST",
    body: JSON.stringify({ inspectionUrl: url, siteUrl: property }),
  });
  const s = r.inspectionResult?.indexStatusResult;
  return { verdict: s?.verdict ?? null, coverage: s?.coverageState ?? null, lastCrawl: s?.lastCrawlTime ?? null };
}

/** Search summary for a site, or null when Google isn't connected / no property linked. */
export async function getSearchSummaryForSite(
  userId: number,
  site: { gsc_property: string | null },
  days: number
): Promise<GscSummary | null> {
  if (!site.gsc_property || !hasGoogle(userId)) return null;
  try {
    return await searchSummary(userId, site.gsc_property, days);
  } catch (e) {
    if (!(e instanceof GoogleNotConnected)) console.error("Search Console query failed", e);
    return null;
  }
}
