import { assertPublicHost, extractSitemapsFromRobots, fetchTextIfOk } from "./audit/fetcher";

export interface SitemapEntry {
  url: string;
  lastmod: number | null;
}

const MAX_URLS = 5000;

/**
 * Every page URL the site lists in its sitemap(s): robots.txt `Sitemap:` lines
 * plus /sitemap.xml, following one level of sitemap index. Only URLs on the
 * site's own host are kept.
 */
export async function sitemapEntries(siteUrl: string): Promise<{ sitemaps: string[]; entries: SitemapEntry[] }> {
  const origin = new URL(siteUrl).origin;
  assertPublicHost(origin);
  const host = new URL(origin).hostname.replace(/^www\./, "");
  const sameSite = (u: string) => {
    try {
      const h = new URL(u).hostname.replace(/^www\./, "");
      return h === host || h.endsWith("." + host);
    } catch {
      return false;
    }
  };

  const robots = await fetchTextIfOk(origin + "/robots.txt");
  const queue = [...new Set([...(robots.text ? extractSitemapsFromRobots(robots.text, origin) : []), origin + "/sitemap.xml"])]
    .filter(sameSite)
    .slice(0, 5);
  const found: string[] = [];
  const entries = new Map<string, SitemapEntry>();

  for (let depth = 0; depth < 2 && queue.length; depth++) {
    const next: string[] = [];
    for (const sm of queue.splice(0)) {
      const { text } = await fetchTextIfOk(sm);
      if (!text || !/<(urlset|sitemapindex)/i.test(text)) continue;
      found.push(sm);
      if (/<sitemapindex/i.test(text)) {
        for (const m of text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) if (sameSite(m[1])) next.push(m[1]);
        continue;
      }
      for (const m of text.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
        const loc = m[1].match(/<loc>\s*([^<\s]+)\s*<\/loc>/i)?.[1]?.replace(/&amp;/g, "&");
        if (!loc || !sameSite(loc)) continue;
        const lm = m[1].match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/i)?.[1];
        const t = lm ? Date.parse(lm) : NaN;
        entries.set(loc, { url: loc, lastmod: Number.isFinite(t) ? t : null });
        if (entries.size >= MAX_URLS) return { sitemaps: found, entries: [...entries.values()] };
      }
    }
    queue.push(...next.slice(0, 20));
  }
  return { sitemaps: found, entries: [...entries.values()] };
}
