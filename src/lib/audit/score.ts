import type { Finding, PassedCheck, Pillar, PillarScore, Priority } from "./types";

const PENALTY: Record<Priority, number> = {
  critical: 28,
  high: 16,
  medium: 8,
  low: 3,
};

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function scorePillar(pillar: Pillar, findings: Finding[]): PillarScore {
  const mine = findings.filter((f) => f.pillar === pillar);
  const counts: Record<Priority, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  let penalty = 0;
  for (const f of mine) {
    counts[f.priority]++;
    penalty += PENALTY[f.priority];
  }
  return { score: Math.max(0, Math.round(100 - penalty)), counts };
}

export function overallScore(pillars: Record<Pillar, PillarScore>): number {
  // Equal thirds — the three pillars are equivalent by design (plan §2)
  return Math.round((pillars.ai.score + pillars.seo.score + pillars.a11y.score) / 3);
}

/**
 * Sort findings for display: quick wins with high impact first, then by
 * priority, then measured before estimated.
 */
export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority];
    const pb = PRIORITY_ORDER[b.priority];
    if (pa !== pb) return pa - pb;
    if (a.quickWin !== b.quickWin) return a.quickWin ? -1 : 1;
    return 0;
  });
}

export function bandOf(score: number): "red" | "orange" | "green" {
  if (score < 40) return "red";
  if (score < 70) return "orange";
  return "green";
}

export { PENALTY };

// re-export for convenience in UI code
export type { PassedCheck };
