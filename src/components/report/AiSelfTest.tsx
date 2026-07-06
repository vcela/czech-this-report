"use client";

import { useState } from "react";

interface Prompt {
  label: string;
  text: string;
}

interface Labels {
  show: string;
  hide: string;
  intro: string;
  chatsLabel: string;
  note: string;
  copy: string;
  copied: string;
  promptsLabel: string;
  prompts: Prompt[];
}

const CHATS = [
  { name: "ChatGPT", url: "https://chatgpt.com/" },
  { name: "Claude", url: "https://claude.ai/new" },
  { name: "Perplexity", url: "https://www.perplexity.ai/" },
  { name: "Gemini", url: "https://gemini.google.com/app" },
];

function PromptCard({
  prompt,
  copyLabel,
  copiedLabel,
}: {
  prompt: Prompt;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-semibold text-foreground">{prompt.label}</p>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md border border-border px-3 py-1 text-xs text-muted hover:text-foreground hover:border-accent transition-colors"
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{prompt.text}</p>
    </div>
  );
}

export function AiSelfTest({ labels, host }: { labels: Labels; host: string }) {
  const [open, setOpen] = useState(false);

  const prompts = labels.prompts.map((p) => ({
    ...p,
    text: p.text.replaceAll("{host}", host),
  }));

  return (
    <div className="no-print mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="rounded-md border border-accent/60 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
      >
        {open ? labels.hide : labels.show}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted leading-relaxed">{labels.intro}</p>

          <div>
            <p className="text-sm font-semibold mb-2">{labels.chatsLabel}</p>
            <div className="flex flex-wrap gap-2">
              {CHATS.map((c) => (
                <a
                  key={c.name}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground hover:border-accent transition-colors"
                >
                  {c.name} ↗
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">{labels.promptsLabel}</p>
            <div className="space-y-3">
              {prompts.map((p) => (
                <PromptCard
                  key={p.label}
                  prompt={p}
                  copyLabel={labels.copy}
                  copiedLabel={labels.copied}
                />
              ))}
            </div>
          </div>

          <p className="text-xs text-muted leading-relaxed">{labels.note}</p>
        </div>
      )}
    </div>
  );
}
