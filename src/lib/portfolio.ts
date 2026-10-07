import { campaignTotals, getStats, parseGoals, type Stats } from "./analytics";
import { getSearchSummaryForSite, googleConfigured, type GscSummary } from "./google";
import { indexRows } from "./indexing";
import { botSummary } from "./bots";
import { aiConfigured, citedInstead, geoHistory, parsePrompts } from "./ai";
import { recommend, type Rec, type RecInput } from "./recommend";
import { siteHistory, type Site } from "./sites";

/** Everything the recommendation rules look at, for one site. Shared by the site overview and the portfolio. */
export async function recInput(userId: number, site: Site, stats30: Stats): Promise<RecInput & { gsc: GscSummary | null }> {
  const goals = parseGoals(site.goal_paths);
  const geoLatest = geoHistory(site.id, 1)[0];
  return {
    stats: stats30,
    report: siteHistory(site.id, 1)[0] ?? null,
    gsc: await getSearchSummaryForSite(userId, site, 28),
    googleReady: !googleConfigured() || !!site.gsc_property,
    aiReady: aiConfigured(),
    hasPrompts: parsePrompts(site.geo_prompts).length > 0,
    index: indexRows(site.id),
    bots: botSummary(site.id),
    geo: geoLatest,
    geoTopRival: citedInstead(geoLatest, site.host)[0]?.domain ?? null,
    campaigns: campaignTotals(site.id, goals),
  };
}

export interface PortfolioRow {
  site: Site;
  visitors: number;
  prevVisitors: number;
  /** % change, null when there's no base to compare with */
  change: number | null;
  daily: number[];
  days: string[];
  conversions: number;
  aiVisits: number;
  gsc: { clicks: number; impressions: number; ctr: number; position: number; potential: number } | null;
  score: number | null;
  scoreDelta: number | null;
  recs: Rec[];
  /** Weighted count of open recommendations: fix 3, opportunity 1, set-up 0.5 */
  attention: number;
  /** Rank by visitors now and in the previous period (1 = most) */
  rank: number;
  prevRank: number | null;
}

/**
 * Queries ranked 4–20 that people already see: the cheapest clicks to win,
 * because Google already considers the site relevant. A measured count of
 * impressions, not a forecast of clicks.
 */
function potentialImpressions(gsc: GscSummary): number {
  return gsc.queries.filter((q) => q.position >= 4 && q.position <= 20).reduce((a, q) => a + q.impressions, 0);
}

const WEIGHT = { fix: 3, idea: 1, setup: 0.5 };

export async function portfolio(userId: number, sites: Site[]): Promise<PortfolioRow[]> {
  const rows = await Promise.all(
    sites.map(async (site) => {
      const stats = getStats(site.id, 30, parseGoals(site.goal_paths));
      const input = await recInput(userId, site, stats);
      const recs = recommend(input);
      const [latest, prev] = siteHistory(site.id, 2);
      const { current: c, previous: p } = stats;
      const byDay = new Map(stats.daily.map((d) => [d.day, d.visitors]));
      return {
        site,
        visitors: c.visitors,
        prevVisitors: p.visitors,
        change: p.visitors ? Math.round(((c.visitors - p.visitors) / p.visitors) * 100) : null,
        daily: stats.days.map((d) => byDay.get(d) ?? 0),
        days: stats.days,
        conversions: c.conversions,
        aiVisits: stats.sources.filter((s) => s.kind === "ai").reduce((a, s) => a + s.visits, 0),
        gsc: input.gsc
          ? { ...input.gsc.totals, potential: potentialImpressions(input.gsc) }
          : null,
        score: latest?.overall ?? null,
        scoreDelta: latest && prev ? latest.overall - prev.overall : null,
        recs,
        attention: recs.reduce((a, r) => a + WEIGHT[r.tone], 0),
        rank: 0,
        prevRank: null as number | null,
      };
    })
  );
  const rankBy = (key: "visitors" | "prevVisitors") =>
    new Map([...rows].sort((a, b) => b[key] - a[key] || a.site.host.localeCompare(b.site.host)).map((r, i) => [r.site.id, i + 1]));
  const now = rankBy("visitors");
  const before = rankBy("prevVisitors");
  for (const r of rows) {
    r.rank = now.get(r.site.id)!;
    r.prevRank = r.prevVisitors > 0 ? before.get(r.site.id)! : null;
  }
  return rows;
}
