import { CATALOG } from "./catalog";
import type { Finding, LocalizedText, PassedCheck, Priority } from "./types";

export function priorityOf(impact: number, effort: number): Priority {
  const score = impact * 3 + (3 - effort);
  if (score >= 10) return "critical";
  if (score >= 8) return "high";
  if (score >= 6) return "medium";
  return "low";
}

/** Build a Finding from a catalog entry plus runtime evidence. */
export function finding(
  checkId: string,
  evidence: LocalizedText[],
  detail?: LocalizedText
): Finding {
  const def = CATALOG[checkId];
  if (!def) throw new Error(`Unknown check: ${checkId}`);
  return {
    checkId,
    pillar: def.pillar,
    priority: priorityOf(def.impact, def.effort),
    quickWin: def.impact >= 2 && def.effort === 1,
    roles: def.roles,
    confidence: def.confidence,
    evidence,
    detail,
    wcag: def.wcag,
  };
}

export function passed(checkId: string): PassedCheck {
  const def = CATALOG[checkId];
  if (!def) throw new Error(`Unknown check: ${checkId}`);
  return { checkId, pillar: def.pillar, confidence: def.confidence };
}

/** Shorthand for a bilingual evidence line. */
export function ev(en: string, cs: string): LocalizedText {
  return { en, cs };
}

/** Evidence line that is identical in both languages (URLs, code, values). */
export function evRaw(text: string): LocalizedText {
  return { en: text, cs: text };
}
