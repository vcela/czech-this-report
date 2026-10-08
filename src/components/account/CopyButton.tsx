"use client";

import { useState } from "react";

export function CopyButton({ text, label, copied }: { text: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API blocked (e.g. insecure context): fall back to a selection copy.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg bg-accent text-accent-contrast font-semibold px-5 py-2.5 hover:bg-accent-strong transition-colors"
    >
      <span aria-live="polite">{done ? `✓ ${copied}` : label}</span>
    </button>
  );
}
