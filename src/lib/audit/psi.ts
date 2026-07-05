import type { PerfMetrics } from "./types";

const PSI_ENDPOINT =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/**
 * Try to get real Lighthouse metrics from PageSpeed Insights.
 * Works without an API key at low volume; PSI_API_KEY env raises quota.
 * Falls back to basic measured metrics (TTFB, HTML size) on any failure —
 * we never fabricate performance numbers.
 */
export async function getPerfMetrics(
  url: string,
  basic: { ttfbMs: number; htmlBytes: number }
): Promise<PerfMetrics> {
  const fallback: PerfMetrics = { source: "basic", ...basic };
  try {
    const params = new URLSearchParams({
      url,
      strategy: "mobile",
      category: "performance",
    });
    const key = process.env.PSI_API_KEY;
    if (key) params.set("key", key);

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45_000);
    let res: Response;
    try {
      res = await fetch(`${PSI_ENDPOINT}?${params}`, { signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
    if (!res.ok) return fallback;
    const data = await res.json();
    const lh = data?.lighthouseResult;
    if (!lh) return fallback;

    const audits = lh.audits ?? {};
    const num = (id: string): number | undefined => {
      const v = audits[id]?.numericValue;
      return typeof v === "number" ? v : undefined;
    };
    const score = lh.categories?.performance?.score;

    return {
      source: "psi",
      ...basic,
      performanceScore:
        typeof score === "number" ? Math.round(score * 100) : undefined,
      lcpMs: num("largest-contentful-paint"),
      cls:
        num("cumulative-layout-shift") !== undefined
          ? Math.round(num("cumulative-layout-shift")! * 1000) / 1000
          : undefined,
      inpMs: num("interaction-to-next-paint") ?? num("total-blocking-time"),
    };
  } catch {
    return fallback;
  }
}
