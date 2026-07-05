import { customAlphabet } from "nanoid";
import { assertPublicHost, fetchSite, normalizeUrl } from "./fetcher";
import { runSeoChecks } from "./checks/seo";
import { runAiChecks } from "./checks/ai";
import { runA11yChecks } from "./checks/a11y";
import { getPerfMetrics } from "./psi";
import { overallScore, scorePillar, sortFindings } from "./score";
import type { Report } from "./types";

const newId = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  10
);

export async function runAudit(inputUrl: string, prevId?: string): Promise<Report> {
  const started = Date.now();
  const url = normalizeUrl(inputUrl);
  assertPublicHost(url);

  const site = await fetchSite(url);
  if (!site.page.ok) {
    throw new AuditError(
      `The site responded with HTTP ${site.page.status}`,
      "site-error"
    );
  }

  // PSI runs in parallel with the local checks — it's by far the slowest part
  const psiPromise = getPerfMetrics(site.page.finalUrl, {
    ttfbMs: site.page.ttfbMs,
    htmlBytes: site.page.htmlBytes,
  });

  const [aiRes, a11yRes] = await Promise.all([
    Promise.resolve(runAiChecks(site)),
    runA11yChecks(site),
  ]);
  const perf = await psiPromise;
  const seoRes = runSeoChecks(site, perf);

  const findings = sortFindings([
    ...seoRes.findings,
    ...aiRes.findings,
    ...a11yRes.findings,
  ]);
  const passed = [...seoRes.passed, ...aiRes.passed, ...a11yRes.passed];

  const pillars = {
    ai: scorePillar("ai", findings),
    seo: scorePillar("seo", findings),
    a11y: scorePillar("a11y", findings),
  };

  return {
    id: newId(),
    url,
    finalUrl: site.page.finalUrl,
    siteTitle: site.$("head > title").first().text().trim() || null,
    createdAt: new Date().toISOString(),
    overall: overallScore(pillars),
    pillars,
    findings,
    passed,
    perf,
    a11y: a11yRes.summary,
    prevId,
    durationMs: Date.now() - started,
  };
}

export class AuditError extends Error {
  constructor(
    message: string,
    public code: "invalid-url" | "site-error" | "unreachable"
  ) {
    super(message);
  }
}
