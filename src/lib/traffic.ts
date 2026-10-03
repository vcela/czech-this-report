/**
 * Where a visit came from, from a page URL and its referrer. Pure — no DB —
 * so it can be unit-tested (npm run test:traffic).
 */

export type SourceKind =
  | "direct"
  | "search"
  | "ai"
  | "social"
  | "email"
  | "ads"
  | "referral"
  | "internal";

export interface Classified {
  kind: SourceKind;
  /** Display name: "Google", "ChatGPT", or a bare hostname */
  label: string;
  campaign: string | null;
  /** Visitor's on-site search query, if the URL carries one */
  query: string | null;
  /** Page path without query string or hash */
  path: string;
}

// Order matters: the first matching rule wins, and "google" must not swallow gemini.
const KNOWN: [RegExp, SourceKind, string][] = [
  [/(^|\.)(chatgpt\.com|chat\.openai\.com)$/, "ai", "ChatGPT"],
  [/(^|\.)perplexity\.ai$/, "ai", "Perplexity"],
  [/^gemini\.google\.com$/, "ai", "Gemini"],
  [/^copilot\.microsoft\.com$/, "ai", "Copilot"],
  [/(^|\.)claude\.ai$/, "ai", "Claude"],
  [/(^|\.)deepseek\.com$/, "ai", "DeepSeek"],
  [/(^|\.)mail\.google\.com$|(^|\.)outlook\.(live|office)\.com$|(^|\.)email\.seznam\.cz$/, "email", "E-mail"],
  [/(^|\.)google\.[a-z.]+$/, "search", "Google"],
  [/(^|\.)seznam\.cz$/, "search", "Seznam"],
  [/(^|\.)bing\.com$/, "search", "Bing"],
  [/(^|\.)duckduckgo\.com$/, "search", "DuckDuckGo"],
  [/(^|\.)yahoo\.com$/, "search", "Yahoo"],
  [/(^|\.)ecosia\.org$/, "search", "Ecosia"],
  [/(^|\.)(facebook\.com|fb\.com|l\.facebook\.com)$/, "social", "Facebook"],
  [/(^|\.)instagram\.com$/, "social", "Instagram"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "social", "LinkedIn"],
  [/^t\.co$|(^|\.)(x|twitter)\.com$/, "social", "X (Twitter)"],
  [/(^|\.)youtube\.com$/, "social", "YouTube"],
  [/(^|\.)tiktok\.com$/, "social", "TikTok"],
  [/(^|\.)pinterest\.[a-z.]+$/, "social", "Pinterest"],
  [/(^|\.)reddit\.com$/, "social", "Reddit"],
];

const PAID_MEDIUM = /^(cpc|ppc|paid|paidsearch|paid_search|paid_social|paidsocial|display|cpm|banner)$/i;
const SEARCH_PARAMS = ["s", "q", "search", "query", "hledat", "dotaz"];

const bareHost = (h: string) => h.toLowerCase().replace(/^www\./, "");

export function classify(pageUrl: string, referrer: string, siteHost: string): Classified {
  const page = new URL(pageUrl);
  const p = page.searchParams;
  const campaign = p.get("utm_campaign")?.slice(0, 100) || null;
  let query: string | null = null;
  for (const k of SEARCH_PARAMS) {
    const v = p.get(k)?.trim();
    if (v) {
      query = v.toLowerCase().slice(0, 100);
      break;
    }
  }
  const base = { campaign, query, path: page.pathname.slice(0, 300) || "/" };

  let refHost = "";
  try {
    refHost = referrer ? bareHost(new URL(referrer).hostname) : "";
  } catch {
    /* garbage referrer counts as none */
  }
  const site = bareHost(siteHost);
  const isInternal = refHost !== "" && (refHost === site || refHost.endsWith("." + site));

  const medium = p.get("utm_medium") ?? "";
  const utmSource = p.get("utm_source")?.slice(0, 60) ?? "";

  // Paid traffic is identified by the URL, whatever the referrer says.
  if (p.has("gclid") || p.has("gbraid") || p.has("wbraid")) return { ...base, kind: "ads", label: "Google Ads" };
  if (PAID_MEDIUM.test(medium)) return { ...base, kind: "ads", label: utmSource || refHost || "?" };
  if (/^(e-?mail|newsletter)$/i.test(medium)) return { ...base, kind: "email", label: utmSource || "E-mail" };

  // Moving between pages of the same site is not a new visit.
  if (isInternal && !utmSource) return { ...base, kind: "internal", label: site };

  const host = refHost || bareHost(utmSource);
  if (!host) return { ...base, kind: "direct", label: "" };
  for (const [re, kind, label] of KNOWN) if (re.test(host)) return { ...base, kind, label };
  if (!refHost) return { ...base, kind: "referral", label: utmSource };
  return { ...base, kind: "referral", label: refHost };
}

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|curl|wget|python|axios|node-fetch/i;
export const isBotUserAgent = (ua: string) => !ua || BOT_UA.test(ua);

export function deviceOf(screenWidth: unknown): "mobile" | "tablet" | "desktop" | null {
  const w = Number(screenWidth);
  if (!Number.isFinite(w) || w <= 0) return null;
  return w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
}
