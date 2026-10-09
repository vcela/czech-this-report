import { getDb } from "./db";
import { fetchSite } from "./audit/fetcher";
import type { Site } from "./sites";
import { PRICES, assertCredits, recordUsage, type Meter } from "./credits";

/**
 * OpenAI Responses API over fetch. The model is configurable because model
 * names change faster than this code; web_search is what makes an answer
 * comparable to what ChatGPT users see.
 */
const KEY = process.env.OPENAI_API_KEY ?? "";
const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
export const aiConfigured = () => !!KEY;

interface Answer {
  text: string;
  citations: string[];
}

/** Every call is metered: one fixed charge per call, plus the real token and search usage. */
async function respond(opts: {
  meter: Meter;
  input: string;
  webSearch?: boolean;
  schema?: { name: string; schema: object };
}): Promise<Answer> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      input: opts.input,
      ...(opts.webSearch ? { tools: [{ type: "web_search" }] } : {}),
      ...(opts.schema
        ? { text: { format: { type: "json_schema", name: opts.schema.name, schema: opts.schema.schema, strict: true } } }
        : {}),
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    usage?: { input_tokens?: number; output_tokens?: number };
    output?: { type: string; content?: { type: string; text?: string; annotations?: { type: string; url?: string }[] }[] }[];
  };
  recordUsage(opts.meter, {
    input: data.usage?.input_tokens ?? 0,
    output: data.usage?.output_tokens ?? 0,
    searches: (data.output ?? []).filter((o) => o.type === "web_search_call").length,
  });
  let text = "";
  const citations = new Set<string>();
  for (const item of data.output ?? []) {
    if (item.type !== "message") continue;
    for (const c of item.content ?? []) {
      if (c.type !== "output_text") continue;
      text += c.text ?? "";
      for (const a of c.annotations ?? []) if (a.type === "url_citation" && a.url) citations.add(a.url);
    }
  }
  return { text, citations: [...citations] };
}

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
const belongs = (h: string, site: string) => h === site || h.endsWith("." + site);

/** What the site says about itself — the grounding for every suggestion. */
async function siteBrief(site: Site): Promise<string> {
  const snap = await fetchSite(site.url);
  const $ = snap.$;
  const heads = $("h1, h2")
    .map((_, e) => $(e).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 15);
  return [
    `Website: ${site.host}`,
    `Title: ${$("title").first().text().trim()}`,
    `Description: ${$('meta[name="description"]').attr("content") ?? ""}`,
    `Language: ${$("html").attr("lang") ?? "unknown"}`,
    `Headings: ${heads.join(" | ")}`,
  ].join("\n");
}

/* ------------------------------------------------------------ GEO tracking */

export const MAX_PROMPTS = 10;
export const parsePrompts = (raw: string) =>
  raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_PROMPTS);

/**
 * Ask each prompt with web search on and record whether the answer cites or
 * names the site. This is ChatGPT-via-API, measured — not Claude, Gemini or
 * Perplexity, and not necessarily identical to the ChatGPT app.
 */
export async function runGeoCheck(site: Site): Promise<number> {
  const prompts = parsePrompts(site.geo_prompts);
  // The whole run or nothing: half a week's answers would skew the history.
  assertCredits(site.user_id, prompts.length * PRICES.geo);
  const brand = (site.brand || site.host.split(".")[0]).toLowerCase();
  const save = getDb().prepare(
    `INSERT INTO geo_results (site_id, run_at, prompt, cited, mentioned, cited_urls, answer) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const runAt = Date.now();
  let n = 0;
  for (const prompt of prompts) {
    const a = await respond({ meter: { userId: site.user_id, siteId: site.id, kind: "geo" }, input: prompt, webSearch: true });
    const cited = a.citations.some((u) => belongs(hostOf(u), site.host));
    const lower = a.text.toLowerCase();
    const mentioned = cited || lower.includes(site.host) || (brand.length > 2 && lower.includes(brand));
    save.run(site.id, runAt, prompt, cited ? 1 : 0, mentioned ? 1 : 0, JSON.stringify(a.citations.slice(0, 20)), a.text.slice(0, 4000));
    n++;
  }
  return n;
}

export interface GeoRun {
  runAt: number;
  results: { prompt: string; cited: boolean; mentioned: boolean; citedUrls: string[]; answer: string }[];
}

export function geoHistory(siteId: string, runs = 8): GeoRun[] {
  const rows = getDb()
    .prepare(
      `SELECT run_at, prompt, cited, mentioned, cited_urls, answer FROM geo_results WHERE site_id = ?
       AND run_at IN (SELECT DISTINCT run_at FROM geo_results WHERE site_id = ? ORDER BY run_at DESC LIMIT ?)
       ORDER BY run_at DESC, id`
    )
    .all(siteId, siteId, runs) as { run_at: number; prompt: string; cited: number; mentioned: number; cited_urls: string; answer: string }[];
  const byRun = new Map<number, GeoRun>();
  for (const r of rows) {
    const run = byRun.get(r.run_at) ?? { runAt: r.run_at, results: [] };
    run.results.push({ prompt: r.prompt, cited: !!r.cited, mentioned: !!r.mentioned, citedUrls: JSON.parse(r.cited_urls), answer: r.answer });
    byRun.set(r.run_at, run);
  }
  return [...byRun.values()];
}

/** Domains the AI cited instead of the site, across the latest run — real competitors in AI answers. */
export function citedInstead(run: GeoRun | undefined, siteHost: string): { domain: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of run?.results ?? []) {
    for (const d of new Set(r.citedUrls.map(hostOf))) if (d && !belongs(d, siteHost)) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return [...counts].map(([domain, count]) => ({ domain, count })).sort((a, b) => b.count - a.count).slice(0, 10);
}

export async function suggestPrompts(site: Site): Promise<string[]> {
  const brief = await siteBrief(site);
  const r = await respond({
    meter: { userId: site.user_id, siteId: site.id, kind: "prompts" },
    input: `${brief}\n\nWrite 6 questions a potential customer of this website might type into ChatGPT when looking for what it offers — without naming the brand. Write them in the website's language. Realistic, specific, varied (comparisons, "best … in <city>", how-to, price).`,
    schema: {
      name: "prompts",
      schema: { type: "object", properties: { prompts: { type: "array", items: { type: "string" } } }, required: ["prompts"], additionalProperties: false },
    },
  });
  return (JSON.parse(r.text) as { prompts: string[] }).prompts.slice(0, MAX_PROMPTS);
}

/* --------------------------------------------------------- Topic ideas */

export interface TopicIdea {
  title: string;
  type: "new-article" | "new-page" | "improve-page";
  reason: string;
  basis: "search-console" | "site-search" | "ai";
}

export async function suggestTopics(
  site: Site,
  signals: { gscQueries: { q: string; impressions: number; position: number }[]; siteSearches: { q: string; count: number; noResults: number }[] },
  locale: string
): Promise<TopicIdea[]> {
  const brief = await siteBrief(site);
  const gsc = signals.gscQueries.slice(0, 40).map((x) => `${x.q} (impressions ${x.impressions}, position ${x.position.toFixed(1)})`).join("\n");
  const search = signals.siteSearches.slice(0, 20).map((x) => `${x.q} (${x.count}×, no results ${x.noResults}×)`).join("\n");
  const r = await respond({
    meter: { userId: site.user_id, siteId: site.id, kind: "topics" },
    input: `${brief}

Google Search Console queries this site appears for:
${gsc || "(not connected)"}

What visitors searched for on the site:
${search || "(none recorded)"}

Suggest up to 8 concrete content actions that would bring this website more relevant visitors from Google and AI assistants. Prefer ideas backed by the data above and say which data ("search-console", "site-search"); use "ai" only for your own ideas. Each reason is one plain sentence for a non-marketer. Write titles and reasons in ${locale === "cs" ? "Czech" : "English"}. Do not invent search volumes.`,
    schema: {
      name: "topics",
      schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                type: { type: "string", enum: ["new-article", "new-page", "improve-page"] },
                reason: { type: "string" },
                basis: { type: "string", enum: ["search-console", "site-search", "ai"] },
              },
              required: ["title", "type", "reason", "basis"],
              additionalProperties: false,
            },
          },
        },
        required: ["items"],
        additionalProperties: false,
      },
    },
  });
  return (JSON.parse(r.text) as { items: TopicIdea[] }).items.slice(0, 8);
}

/* --------------------------------------------------------- Competitors */

export async function findCompetitors(site: Site, locale: string): Promise<{ domain: string; reason: string }[]> {
  const brief = await siteBrief(site);
  const r = await respond({
    meter: { userId: site.user_id, siteId: site.id, kind: "competitors" },
    input: `${brief}\n\nSearch the web and list up to 6 websites that compete with this one for the same customers (same offer, same market/country). Exclude marketplaces, directories and the site itself. Give the bare domain and one short reason in ${locale === "cs" ? "Czech" : "English"}.`,
    webSearch: true,
    schema: {
      name: "competitors",
      schema: {
        type: "object",
        properties: {
          competitors: {
            type: "array",
            items: {
              type: "object",
              properties: { domain: { type: "string" }, reason: { type: "string" } },
              required: ["domain", "reason"],
              additionalProperties: false,
            },
          },
        },
        required: ["competitors"],
        additionalProperties: false,
      },
    },
  });
  return (JSON.parse(r.text) as { competitors: { domain: string; reason: string }[] }).competitors
    .map((c) => ({ domain: hostOf(c.domain.includes("://") ? c.domain : `https://${c.domain}`), reason: c.reason }))
    .filter((c) => c.domain && !belongs(c.domain, site.host))
    .slice(0, 6);
}

export function saveSuggestion(siteId: string, kind: string, data: unknown) {
  getDb()
    .prepare("INSERT OR REPLACE INTO ai_suggestions (site_id, kind, created_at, data) VALUES (?, ?, ?, ?)")
    .run(siteId, kind, Date.now(), JSON.stringify(data));
}

export function getSuggestion<T>(siteId: string, kind: string): { createdAt: number; data: T } | null {
  const r = getDb().prepare("SELECT created_at, data FROM ai_suggestions WHERE site_id = ? AND kind = ?").get(siteId, kind) as
    | { created_at: number; data: string }
    | undefined;
  return r ? { createdAt: r.created_at, data: JSON.parse(r.data) as T } : null;
}
