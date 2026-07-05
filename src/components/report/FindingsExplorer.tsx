"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

/** Fully localized, serializable finding shape prepared on the server. */
export interface UiFinding {
  checkId: string;
  pillar: "ai" | "seo" | "a11y";
  priority: "critical" | "high" | "medium" | "low";
  quickWin: boolean;
  confidence: "measured" | "estimated" | "not-tested";
  roles: { id: string; label: string }[];
  title: string;
  why: string;
  fix: string;
  evidence: string[];
  wcag?: string;
}

export interface ExplorerLabels {
  fixFirst: string;
  fixFirstNote: string;
  allFindings: string;
  filters: { all: string; pillar: string; priority: string; role: string };
  finding: {
    why: string;
    evidence: string;
    fix: string;
    who: string;
    wcag: string;
    more: string;
    less: string;
    resolved: string;
    unresolved: string;
    quickWin: string;
    measured: string;
    estimated: string;
    notTested: string;
    measuredTip: string;
    estimatedTip: string;
  };
  priorities: Record<string, string>;
  pillarNames: Record<string, string>;
}

/* --- "mark as resolved" persistence (localStorage as an external store) --- */
const EMPTY_RESOLVED: Record<string, boolean> = {};
const resolvedCache = new Map<string, Record<string, boolean>>();
const resolvedListeners = new Set<() => void>();

function readResolved(key: string): Record<string, boolean> {
  const cached = resolvedCache.get(key);
  if (cached) return cached;
  let value = EMPTY_RESOLVED;
  try {
    const raw = localStorage.getItem(key);
    if (raw) value = JSON.parse(raw);
  } catch {
    /* private mode / bad data */
  }
  resolvedCache.set(key, value);
  return value;
}

function writeResolved(key: string, value: Record<string, boolean>): void {
  resolvedCache.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
  resolvedListeners.forEach((cb) => cb());
}

function subscribeResolved(cb: () => void): () => void {
  resolvedListeners.add(cb);
  return () => resolvedListeners.delete(cb);
}

const PRIORITY_STYLE: Record<UiFinding["priority"], string> = {
  critical: "bg-score-red/15 text-score-red border-score-red/40",
  high: "bg-score-orange/15 text-score-orange border-score-orange/40",
  medium: "bg-accent/10 text-accent border-accent/40",
  low: "bg-surface-2 text-muted border-border",
};

function Badge({ className, children, title }: { className?: string; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

function FindingCard({
  f,
  labels,
  resolved,
  onToggleResolved,
  defaultOpen,
}: {
  f: UiFinding;
  labels: ExplorerLabels;
  resolved: boolean;
  onToggleResolved: () => void;
  defaultOpen?: boolean;
}) {
  const t = labels.finding;
  const confLabel =
    f.confidence === "measured" ? t.measured : f.confidence === "estimated" ? t.estimated : t.notTested;
  const confTip = f.confidence === "measured" ? t.measuredTip : t.estimatedTip;

  return (
    <details
      open={defaultOpen}
      className={`group rounded-xl border bg-surface transition-colors ${
        resolved ? "border-score-green/50 opacity-70" : "border-border"
      }`}
    >
      <summary className="flex flex-wrap items-center gap-2 cursor-pointer list-none px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-90 select-none">
          ▸
        </span>
        <span className={`font-medium flex-1 min-w-[12rem] ${resolved ? "line-through" : ""}`}>{f.title}</span>
        <span className="flex flex-wrap gap-1.5">
          {resolved && <Badge className="bg-score-green/15 text-score-green border-score-green/40">✓</Badge>}
          {f.quickWin && !resolved && (
            <Badge className="bg-score-green/15 text-score-green border-score-green/40">⚡ {t.quickWin}</Badge>
          )}
          <Badge className={PRIORITY_STYLE[f.priority]}>{labels.priorities[f.priority]}</Badge>
          <Badge className="bg-surface-2 text-muted border-border">{labels.pillarNames[f.pillar]}</Badge>
          <Badge className="bg-surface-2 text-muted border-border" title={confTip}>
            {f.confidence === "measured" ? "✓ " : "≈ "}
            {confLabel}
          </Badge>
        </span>
      </summary>

      <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border/60">
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">{t.why}</h4>
          <p className="text-sm leading-relaxed">{f.why}</p>
        </section>

        {f.evidence.length > 0 && (
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">{t.evidence}</h4>
            <ul className="text-sm space-y-1">
              {f.evidence.map((e, i) => (
                <li key={i} className="font-mono text-xs bg-surface-2 rounded px-2 py-1.5 break-all text-muted">
                  {e}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">{t.fix}</h4>
          <p className="text-sm leading-relaxed">{f.fix}</p>
        </section>

        <section className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">{t.who}</h4>
            <div className="flex flex-wrap gap-1.5">
              {f.roles.map((r) => (
                <Badge key={r.id} className="bg-accent/10 text-accent border-accent/40">
                  {r.label}
                </Badge>
              ))}
            </div>
          </div>
          {f.wcag && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">{t.wcag}</h4>
              <span className="text-sm font-mono">{f.wcag}</span>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleResolved}
            className="no-print ml-auto text-sm rounded-md border border-border px-3 py-1.5 text-muted hover:text-foreground hover:border-accent transition-colors"
          >
            {resolved ? t.unresolved : t.resolved}
          </button>
        </section>
      </div>
    </details>
  );
}

export function FindingsExplorer({
  reportId,
  findings,
  labels,
  roleOptions,
}: {
  reportId: string;
  findings: UiFinding[];
  labels: ExplorerLabels;
  roleOptions: { id: string; label: string }[];
}) {
  const [pillar, setPillar] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [role, setRole] = useState<string>("all");

  const storageKey = `ctr-resolved-${reportId}`;
  const resolved = useSyncExternalStore(
    useCallback((cb) => subscribeResolved(cb), []),
    () => readResolved(storageKey),
    () => EMPTY_RESOLVED
  );

  function toggle(checkId: string) {
    writeResolved(storageKey, { ...resolved, [checkId]: !resolved[checkId] });
  }

  const fixFirst = useMemo(() => {
    const unresolved = findings.filter((f) => !resolved[f.checkId]);
    const top = unresolved.filter(
      (f) => f.priority === "critical" || f.priority === "high"
    );
    return (top.length >= 3 ? top : unresolved).slice(0, 5);
  }, [findings, resolved]);

  const filtered = findings.filter(
    (f) =>
      (pillar === "all" || f.pillar === pillar) &&
      (priority === "all" || f.priority === priority) &&
      (role === "all" || f.roles.some((r) => r.id === role))
  );

  const selectCls =
    "rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent";

  return (
    <div className="space-y-10">
      {/* Fix these first */}
      {fixFirst.length > 0 && (
        <section aria-labelledby="fix-first">
          <h2 id="fix-first" className="text-2xl font-bold">
            {labels.fixFirst}
          </h2>
          <p className="text-muted text-sm mt-1 mb-4">{labels.fixFirstNote}</p>
          <div className="space-y-3">
            {fixFirst.map((f) => (
              <FindingCard
                key={f.checkId}
                f={f}
                labels={labels}
                resolved={!!resolved[f.checkId]}
                onToggleResolved={() => toggle(f.checkId)}
                defaultOpen={fixFirst.length <= 3}
              />
            ))}
          </div>
        </section>
      )}

      {/* All findings with filters */}
      <section aria-labelledby="all-findings">
        <h2 id="all-findings" className="text-2xl font-bold mb-4">
          {labels.allFindings}{" "}
          <span className="text-muted font-normal text-lg">({filtered.length})</span>
        </h2>

        <div className="no-print flex flex-wrap gap-3 mb-5">
          <label className="flex items-center gap-2 text-sm text-muted">
            {labels.filters.pillar}
            <select value={pillar} onChange={(e) => setPillar(e.target.value)} className={selectCls}>
              <option value="all">{labels.filters.all}</option>
              {Object.entries(labels.pillarNames).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            {labels.filters.priority}
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectCls}>
              <option value="all">{labels.filters.all}</option>
              {Object.entries(labels.priorities).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            {labels.filters.role}
            <select value={role} onChange={(e) => setRole(e.target.value)} className={selectCls}>
              <option value="all">{labels.filters.all}</option>
              {roleOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-3">
          {filtered.map((f) => (
            <FindingCard
              key={f.checkId}
              f={f}
              labels={labels}
              resolved={!!resolved[f.checkId]}
              onToggleResolved={() => toggle(f.checkId)}
              defaultOpen={false}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
