export type Pillar = "ai" | "seo" | "a11y";

export type Priority = "critical" | "high" | "medium" | "low";

export type Role =
  | "developer"
  | "devops"
  | "designer"
  | "copywriter"
  | "seo-specialist";

/** 1 = low, 2 = medium, 3 = high */
export type Impact = 1 | 2 | 3;
/** 1 = easy fix, 2 = moderate, 3 = hard */
export type Effort = 1 | 2 | 3;

export type Confidence = "measured" | "estimated" | "not-tested";

export interface LocalizedText {
  en: string;
  cs: string;
}

/** Static definition of a check in the catalog. */
export interface CheckDef {
  id: string;
  pillar: Pillar;
  roles: Role[];
  impact: Impact;
  effort: Effort;
  confidence: Confidence;
  /** Shown when the check FAILS */
  title: LocalizedText;
  why: LocalizedText;
  fix: LocalizedText;
  /** Shown in the "what's working" list when the check PASSES */
  passTitle: LocalizedText;
  /** WCAG success criterion / level, only for a11y checks */
  wcag?: { criterion: string; level: "A" | "AA" | "AAA" };
}

/** A concrete finding produced by running a check against a site. */
export interface Finding {
  checkId: string;
  pillar: Pillar;
  priority: Priority;
  quickWin: boolean;
  roles: Role[];
  confidence: Confidence;
  /** Language-specific evidence lines (concrete URLs, elements, values). */
  evidence: LocalizedText[];
  /** Extra detail appended to the fix, e.g. list of affected selectors. */
  detail?: LocalizedText;
  wcag?: { criterion: string; level: "A" | "AA" | "AAA" };
}

export interface PassedCheck {
  checkId: string;
  pillar: Pillar;
  confidence: Confidence;
}

export interface PillarScore {
  score: number; // 0-100
  /** counts by priority for quick display */
  counts: Record<Priority, number>;
}

export interface PerfMetrics {
  source: "psi" | "basic";
  ttfbMs?: number;
  htmlBytes?: number;
  lcpMs?: number;
  cls?: number;
  inpMs?: number;
  performanceScore?: number; // 0-100 from Lighthouse
  requestCounts?: { scripts: number; stylesheets: number; images: number };
}

export interface A11ySummary {
  axeViolationCount: number;
  axePassCount: number;
  /** rough conformance estimate based on automated checks only */
  conformance: "below-a" | "a" | "aa" | "unknown";
  automatedCoverageNote: true;
}

export interface Report {
  id: string;
  url: string;
  finalUrl: string;
  siteTitle: string | null;
  createdAt: string; // ISO
  overall: number;
  pillars: Record<Pillar, PillarScore>;
  findings: Finding[];
  passed: PassedCheck[];
  perf: PerfMetrics;
  a11y: A11ySummary;
  /** id of the previous report if this was a re-scan */
  prevId?: string;
  durationMs: number;
}
