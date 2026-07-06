"use client";

import { useState } from "react";

export interface FixPromptLabelsUi {
  title: string;
  intro: string;
  copy: string;
  copied: string;
  hint: string;
  show: string;
  hide: string;
}

/**
 * "Fix it with AI" — shows a ready-made prompt built from every finding and a
 * one-click copy button, so the user can paste it straight into an AI coding
 * assistant. The prompt text itself is assembled on the server (see
 * `buildFixPrompt`) and passed in fully rendered.
 */
export function FixPrompt({ prompt, labels }: { prompt: string; labels: FixPromptLabelsUi }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <section
      aria-labelledby="fix-prompt-title"
      className="rounded-2xl border border-accent/50 bg-surface p-6 sm:p-7"
    >
      <h2 id="fix-prompt-title" className="text-xl font-bold mb-1">
        {labels.title}
      </h2>
      <p className="text-sm text-muted leading-relaxed mb-4">{labels.intro}</p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="rounded-lg bg-accent text-accent-contrast font-semibold px-5 py-2.5 text-sm hover:bg-accent-strong transition-colors"
        >
          {copied ? labels.copied : labels.copy}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="no-print rounded-lg border border-border px-4 py-2.5 text-sm text-muted hover:text-foreground hover:border-accent transition-colors"
        >
          {open ? labels.hide : labels.show}
        </button>
        <span role="status" aria-live="polite" className="text-sm text-score-green">
          {copied ? labels.copied : ""}
        </span>
      </div>

      <p className="text-xs text-muted leading-relaxed mt-3">{labels.hint}</p>

      {open && (
        <pre className="mt-4 max-h-96 overflow-auto rounded-lg border border-border bg-background p-4 text-xs leading-relaxed text-muted whitespace-pre-wrap break-words">
          {prompt}
        </pre>
      )}
    </section>
  );
}
