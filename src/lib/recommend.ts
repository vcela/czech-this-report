import type { Report } from "./audit/types";
import type { Stats, CampaignTotal } from "./analytics";
import type { GscSummary } from "./google";
import type { IndexRow } from "./indexing";
import type { BotSummary } from "./bots";
import type { GeoRun } from "./ai";

/**
 * "What to do next", from plain rules over data we actually have. Every
 * recommendation names its evidence; nothing here is a guess dressed as a
 * finding. Copy lives in the dictionary under account.recs.<key>.
 */
export type RecKey =
  | "setupSnippet"
  | "setupGoogle"
  | "setupGeo"
  | "auditCritical"
  | "notIndexed"
  | "lowCtr"
  | "nearTop"
  | "searchNoResults"
  | "searchFrequent"
  | "campaignExpensive"
  | "campaignNoConv"
  | "aiBotsAbsent"
  | "geoNotCited"
  | "trafficDrop"
  | "mobileSlow";

export interface Rec {
  key: RecKey;
  tone: "fix" | "idea" | "setup";
  params: Record<string, string | number>;
  /** Tab to open: "", "/search", "/audit", "/ai", "/setup" */
  tab: string;
}

export interface RecInput {
  stats: Stats | null;
  report: Report | null;
  gsc: GscSummary | null;
  googleReady: boolean;
  aiReady: boolean;
  hasPrompts: boolean;
  index: IndexRow[];
  bots: BotSummary | null;
  geo: GeoRun | undefined;
  geoTopRival: string | null;
  campaigns: CampaignTotal[];
}

const pct = (x: number) => Math.round(x * 1000) / 10;

export function recommend(i: RecInput): Rec[] {
  const out: Rec[] = [];
  const s = i.stats;

  if (s && !s.hasAnyData) out.push({ key: "setupSnippet", tone: "setup", params: {}, tab: "/setup" });
  if (!i.googleReady) out.push({ key: "setupGoogle", tone: "setup", params: {}, tab: "/setup" });

  const critical = i.report?.findings.filter((f) => f.priority === "critical").length ?? 0;
  if (critical) out.push({ key: "auditCritical", tone: "fix", params: { n: critical }, tab: "/audit" });

  const notIndexed = i.index.filter((r) => r.group !== "indexed").length;
  if (notIndexed) out.push({ key: "notIndexed", tone: "fix", params: { n: notIndexed, total: i.index.length }, tab: "/search" });

  if (s && s.previous.visitors >= 20) {
    const d = Math.round(((s.current.visitors - s.previous.visitors) / s.previous.visitors) * 100);
    if (d <= -30) out.push({ key: "trafficDrop", tone: "fix", params: { d: -d }, tab: "" });
  }

  const totalDev = s?.devices.reduce((a, x) => a + x.visitors, 0) ?? 0;
  const mobile = s?.devices.find((x) => x.device === "mobile")?.visitors ?? 0;
  const perf = i.report?.perf.performanceScore;
  if (totalDev >= 20 && mobile / totalDev >= 0.5 && perf !== undefined && perf < 50) {
    out.push({ key: "mobileSlow", tone: "fix", params: { share: Math.round((mobile / totalDev) * 100), score: perf }, tab: "/audit" });
  }

  // Search Console: shown but not clicked, and almost on page one.
  const lowCtr = i.gsc?.queries.find((q) => q.impressions >= 50 && q.position <= 10 && q.ctr < 0.02);
  if (lowCtr) out.push({ key: "lowCtr", tone: "idea", params: { q: lowCtr.key, pos: Math.round(lowCtr.position), ctr: pct(lowCtr.ctr) }, tab: "/search" });
  const nearTop = i.gsc?.queries.find((q) => q.impressions >= 30 && q.position > 8 && q.position <= 20);
  if (nearTop) out.push({ key: "nearTop", tone: "idea", params: { q: nearTop.key, pos: Math.round(nearTop.position) }, tab: "/ai" });

  const noRes = s?.searches.find((x) => x.noResults > 0);
  if (noRes) out.push({ key: "searchNoResults", tone: "idea", params: { q: noRes.query, n: noRes.noResults }, tab: "" });
  const frequent = s?.searches.find((x) => x.count >= 3 && x !== noRes);
  if (frequent) out.push({ key: "searchFrequent", tone: "idea", params: { q: frequent.query, n: frequent.count }, tab: "" });

  // Campaigns with a cost: compare cost per conversion.
  const paid = i.campaigns.filter((c) => c.cost && c.cost > 0);
  for (const c of paid) if (!c.conversions && c.visits >= 20) out.push({ key: "campaignNoConv", tone: "fix", params: { a: c.campaign, cost: Math.round(c.cost!) }, tab: "" });
  const cpa = paid.filter((c) => c.conversions > 0).map((c) => ({ c, v: c.cost! / c.conversions })).sort((a, b) => a.v - b.v);
  if (cpa.length >= 2 && cpa[cpa.length - 1].v >= 3 * cpa[0].v) {
    const worst = cpa[cpa.length - 1];
    out.push({
      key: "campaignExpensive",
      tone: "idea",
      params: { a: worst.c.campaign, x: Math.round(worst.v), b: cpa[0].c.campaign, y: Math.round(cpa[0].v) },
      tab: "",
    });
  }

  // AI visibility
  if (i.bots?.installed) {
    const aiSeen = i.bots.bots.some((b) => ["gptbot", "oai-searchbot", "chatgpt-user", "perplexitybot", "claudebot", "claude-searchbot"].includes(b.id) && b.hits > 0);
    if (!aiSeen) out.push({ key: "aiBotsAbsent", tone: "fix", params: {}, tab: "/search" });
  }
  if (i.geo && i.geo.results.length) {
    const cited = i.geo.results.filter((r) => r.cited).length;
    if (!cited) out.push({ key: "geoNotCited", tone: "idea", params: { n: i.geo.results.length, domain: i.geoTopRival ?? "—" }, tab: "/ai" });
  }
  if (i.aiReady && !i.hasPrompts) out.push({ key: "setupGeo", tone: "setup", params: {}, tab: "/ai" });

  const order = { fix: 0, idea: 1, setup: 2 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 7);
}
