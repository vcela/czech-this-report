"use client";

import { useState } from "react";

export function ShareBar({
  labels,
}: {
  labels: { title: string; note: string; copy: string; copied: string; pdf: string };
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable */
    }
  }

  const btn =
    "rounded-md border border-border px-4 py-2 text-sm text-muted hover:text-foreground hover:border-accent transition-colors";

  return (
    <div className="no-print rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold mb-1">{labels.title}</h2>
      <p className="text-sm text-muted mb-3">{labels.note}</p>
      <div className="flex flex-wrap gap-2 items-center">
        <button type="button" onClick={copy} className={btn}>
          {labels.copy}
        </button>
        <button type="button" onClick={() => window.print()} className={btn}>
          {labels.pdf}
        </button>
        <span role="status" aria-live="polite" className="text-sm text-score-green">
          {copied ? labels.copied : ""}
        </span>
      </div>
    </div>
  );
}
