/** Run with: npm run test:recommend */
import assert from "node:assert/strict";
import test from "node:test";
import { recommend, type RecInput } from "./recommend";
import type { Stats } from "./analytics";

const totals = (visitors: number) => ({ visitors, visits: visitors, pageviews: visitors, conversions: 0, revenue: 0 });
const stats = (over: Partial<Stats> = {}): Stats => ({
  range: 30,
  from: "",
  to: "",
  days: [],
  current: totals(100),
  previous: totals(100),
  daily: [],
  sources: [],
  pages: [],
  searches: [],
  campaigns: [],
  devices: [],
  goals: [],
  hasAnyData: true,
  consentedShare: 0,
  ...over,
});
const base = (over: Partial<RecInput> = {}): RecInput => ({
  stats: stats(),
  report: null,
  gsc: null,
  googleReady: true,
  aiReady: false,
  hasPrompts: false,
  index: [],
  bots: null,
  geo: undefined,
  geoTopRival: null,
  campaigns: [],
  ...over,
});
const keys = (i: RecInput) => recommend(i).map((r) => r.key);

test("a healthy site with nothing connected-but-missing gets nothing", () => {
  assert.deepEqual(keys(base()), []);
});

test("setup steps come last, problems first", () => {
  const k = keys(base({ stats: stats({ hasAnyData: false }), googleReady: false, index: [{ url: "u", group: "crawled", coverage: null, lastCrawl: null, checkedAt: 0 }] }));
  assert.equal(k[0], "notIndexed");
  assert.ok(k.includes("setupSnippet") && k.includes("setupGoogle"));
});

test("traffic drop needs a real base, not 3 → 1 visitors", () => {
  assert.ok(keys(base({ stats: stats({ current: totals(50), previous: totals(100) }) })).includes("trafficDrop"));
  assert.ok(!keys(base({ stats: stats({ current: totals(1), previous: totals(3) }) })).includes("trafficDrop"));
});

test("Search Console opportunities", () => {
  const q = (key: string, impressions: number, position: number, ctr: number) => ({ key, clicks: 0, impressions, ctr, position });
  const gsc = { totals: q("", 0, 0, 0), queries: [q("web brno", 200, 4, 0.01), q("cena webu", 80, 12, 0.03)], pages: [], from: "", to: "" };
  const r = recommend(base({ gsc }));
  assert.equal(r.find((x) => x.key === "lowCtr")?.params.q, "web brno");
  assert.equal(r.find((x) => x.key === "nearTop")?.params.q, "cena webu");
});

test("campaign comparison only when one is 3× pricier per conversion", () => {
  const c = (campaign: string, cost: number, conversions: number) => ({ campaign, cost, visits: 100, conversions, revenue: 0 });
  const r = recommend(base({ campaigns: [c("google", 1000, 10), c("facebook", 3000, 1), c("dead", 500, 0)] }));
  assert.deepEqual(r.find((x) => x.key === "campaignExpensive")?.params, { a: "facebook", x: 3000, b: "google", y: 100 });
  assert.ok(r.some((x) => x.key === "campaignNoConv" && x.params.a === "dead"));
});
