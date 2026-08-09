import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (compatible; CzechThisReportBot/1.0; +https://report.czech-this.com/bot)";

const FETCH_TIMEOUT_MS = 12_000;

/**
 * Hard cap on the HTML we keep in memory. The page body is parsed twice — once
 * by cheerio and once by jsdom — and each tree costs several times the source
 * size, so an unbounded body from a hostile or just bloated site is the single
 * biggest driver of peak memory. 2 MB of HTML is already pathological; every
 * check we run only reads head/meta/landmarks near the top anyway.
 */
const MAX_HTML_BYTES = 2_000_000;
const MAX_TEXT_BYTES = 500_000; // robots.txt / llms.txt / sitemap.xml

/** Read a body but stop after `max` bytes; breaking the loop cancels the stream. */
async function textCapped(res: Response, max: number): Promise<{ text: string; bytes: number }> {
  if (!res.body) return { text: "", bytes: 0 };
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
    bytes += chunk.length;
    if (bytes >= max) break;
  }
  const kept = Math.min(bytes, max);
  return { text: Buffer.concat(chunks, kept).toString("utf8"), bytes: kept };
}

export interface FetchedPage {
  ok: boolean;
  status: number;
  finalUrl: string;
  html: string;
  headers: Record<string, string>;
  ttfbMs: number;
  htmlBytes: number;
  redirectedToHttps: boolean;
}

export interface SiteSnapshot {
  requestedUrl: string;
  page: FetchedPage;
  $: cheerio.CheerioAPI;
  robotsTxt: string | null;
  robotsStatus: number | null;
  sitemapUrls: string[]; // sitemap locations that responded with 2xx
  sitemapCheckedUrls: string[]; // locations we tried
  llmsTxt: string | null;
  httpRedirects: boolean | null; // does http:// redirect to https:// (null = not applicable/unknown)
}

async function timedFetch(
  url: string,
  init?: RequestInit,
  timeout = FETCH_TIMEOUT_MS
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, {
      redirect: "follow",
      // Every audit must reflect the live site. Belt-and-suspenders against
      // any caching layer: Next's own fetch data cache (default is already
      // uncached, but this makes intent explicit and future-proof) and,
      // via the request headers below, CDNs/reverse proxies in front of the
      // target site that are configured to revalidate on a no-cache request.
      cache: "no-store",
      ...init,
      headers: {
        "user-agent": UA,
        accept: "text/html,*/*",
        "cache-control": "no-cache",
        pragma: "no-cache",
        ...init?.headers,
      },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

export function normalizeUrl(input: string): string {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  const parsed = new URL(u); // throws on invalid
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Unsupported protocol");
  if (!parsed.hostname.includes(".")) throw new Error("Invalid hostname");
  return parsed.toString();
}

/** Reject obviously private/internal targets (basic SSRF guard). */
export function assertPublicHost(url: string): void {
  const host = new URL(url).hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host === "::1"
  ) {
    throw new Error("Private or local hosts cannot be audited");
  }
}

async function fetchPage(url: string): Promise<FetchedPage> {
  const start = Date.now();
  const res = await timedFetch(url);
  const ttfbMs = Date.now() - start;
  const { text: html, bytes } = await textCapped(res, MAX_HTML_BYTES);
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
  // Keep the reported size honest when we truncated: trust content-length if the
  // server sent one, otherwise report what we actually read.
  const declared = Number(res.headers.get("content-length"));
  return {
    ok: res.ok,
    status: res.status,
    finalUrl: res.url || url,
    html,
    headers,
    ttfbMs,
    htmlBytes: Number.isFinite(declared) && declared > 0 ? declared : bytes,
    redirectedToHttps: (res.url || url).startsWith("https://"),
  };
}

async function fetchTextIfOk(url: string): Promise<{ text: string | null; status: number | null }> {
  try {
    const res = await timedFetch(url, undefined, 8000);
    if (!res.ok) return { text: null, status: res.status };
    const { text } = await textCapped(res, MAX_TEXT_BYTES);
    return { text, status: res.status };
  } catch {
    return { text: null, status: null };
  }
}

function extractSitemapsFromRobots(robots: string, origin: string): string[] {
  const out: string[] = [];
  for (const line of robots.split(/\r?\n/)) {
    const m = line.match(/^\s*sitemap:\s*(\S+)/i);
    if (m) {
      try {
        out.push(new URL(m[1], origin).toString());
      } catch {
        /* ignore invalid */
      }
    }
  }
  return out;
}

export async function fetchSite(requestedUrl: string): Promise<SiteSnapshot> {
  const page = await fetchPage(requestedUrl);
  const origin = new URL(page.finalUrl).origin;

  const [robotsRes, llmsRes, httpProbe] = await Promise.all([
    fetchTextIfOk(origin + "/robots.txt"),
    fetchTextIfOk(origin + "/llms.txt"),
    // does plain-http redirect to https?
    (async (): Promise<boolean | null> => {
      try {
        const httpUrl = origin.replace(/^https:/, "http:");
        if (httpUrl === origin) return null; // site is served over http already
        const res = await timedFetch(httpUrl, { method: "HEAD" }, 8000);
        return (res.url || "").startsWith("https://");
      } catch {
        return null;
      }
    })(),
  ]);

  // Candidate sitemap locations: from robots.txt, plus the default path
  const candidates = new Set<string>(
    robotsRes.text ? extractSitemapsFromRobots(robotsRes.text, origin) : []
  );
  candidates.add(origin + "/sitemap.xml");

  const checked = [...candidates].slice(0, 3);
  const results = await Promise.all(
    checked.map(async (u) => {
      try {
        const res = await timedFetch(u, { method: "GET" }, 8000);
        if (!res.ok) return null;
        // only the opening tag matters — never buffer a multi-MB sitemap
        const { text: head } = await textCapped(res, 8_000);
        return /<(urlset|sitemapindex)[\s>]/i.test(head) ? u : null;
      } catch {
        return null;
      }
    })
  );

  return {
    requestedUrl,
    page,
    $: cheerio.load(page.html),
    robotsTxt: robotsRes.text,
    robotsStatus: robotsRes.status,
    sitemapUrls: results.filter((r): r is string => r !== null),
    sitemapCheckedUrls: checked,
    llmsTxt: llmsRes.text,
    httpRedirects: httpProbe,
  };
}
