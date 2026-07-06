import type { UiFinding } from "@/components/report/FindingsExplorer";

/**
 * Localized text pieces needed to render the copy-paste "fix it with AI" prompt.
 * Kept separate from the React copy so the builder stays a pure, testable function.
 *
 * IMPORTANT: whenever the report grows a new property, metric or check type,
 * revisit this builder so the generated prompt keeps describing everything the
 * report shows. See AGENTS.md → "Fix-it-with-AI prompt".
 */
export interface FixPromptLabels {
  /** Opening instruction. `{url}` is replaced with the audited address. */
  lead: string;
  /** Ground rules the assistant must follow (honesty, scope, ask-before-guess). */
  rules: string;
  /** Heading printed above the numbered findings list. */
  findingsHeading: string;
  /** Printed instead of the list when there is nothing actionable. */
  noFindings: string;
  /** Inline labels inside each finding block. */
  whyLabel: string;
  evidenceLabel: string;
  fixLabel: string;
  wcagLabel: string;
  whoLabel: string;
  /** Confidence wording, mirrors the badges shown in the UI. */
  measured: string;
  estimated: string;
  notTested: string;
  /** Closing instruction, e.g. "report back what you changed". */
  closing: string;
  priorities: Record<string, string>;
  pillarNames: Record<string, string>;
}

const PRIORITY_ORDER: Record<UiFinding["priority"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function confidenceLabel(f: UiFinding, L: FixPromptLabels): string {
  return f.confidence === "measured" ? L.measured : f.confidence === "estimated" ? L.estimated : L.notTested;
}

/**
 * Turn a report's findings into a single self-contained prompt that a user can
 * paste into an AI coding assistant (Claude Code, Cursor, …) to fix the issues.
 */
export function buildFixPrompt(url: string, findings: UiFinding[], L: FixPromptLabels): string {
  const lead = L.lead.replaceAll("{url}", url);

  if (findings.length === 0) {
    return `${lead}\n\n${L.noFindings}`;
  }

  const sorted = [...findings].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );

  const blocks = sorted.map((f, i) => {
    const lines: string[] = [];
    const tags = [L.priorities[f.priority], L.pillarNames[f.pillar], confidenceLabel(f, L)]
      .filter(Boolean)
      .join(" · ");
    lines.push(`${i + 1}. ${f.title}  [${tags}]`);
    if (f.why) lines.push(`   ${L.whyLabel}: ${f.why}`);
    if (f.evidence.length > 0) {
      lines.push(`   ${L.evidenceLabel}:`);
      for (const e of f.evidence) lines.push(`     - ${e}`);
    }
    if (f.fix) lines.push(`   ${L.fixLabel}: ${f.fix}`);
    if (f.wcag) lines.push(`   ${L.wcagLabel}: ${f.wcag}`);
    if (f.roles.length > 0) {
      lines.push(`   ${L.whoLabel}: ${f.roles.map((r) => r.label).join(", ")}`);
    }
    return lines.join("\n");
  });

  return [lead, "", L.rules, "", L.findingsHeading, "", blocks.join("\n\n"), "", L.closing].join("\n");
}
