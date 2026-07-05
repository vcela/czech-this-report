"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

interface Labels {
  urlLabel: string;
  urlPlaceholder: string;
  submit: string;
  submitting: string;
  progress: string[];
  errors: {
    invalid: string;
    unreachable: string;
    siteError: string;
    rateLimit: string;
    generic: string;
  };
}

export function AuditForm({
  locale,
  labels,
  prefillUrl,
  prevId,
  compact,
  rescanLabel,
  rescanningLabel,
}: {
  locale: Locale;
  labels: Labels;
  prefillUrl?: string;
  prevId?: string;
  compact?: boolean;
  rescanLabel?: string;
  rescanningLabel?: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(prefillUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    setStep(0);
    // advance the progress narration roughly matching real phase durations
    const delays = [1500, 2500, 3000, 5000, 20000];
    let i = 0;
    const tick = () => {
      i++;
      setStep(Math.min(i, labels.progress.length - 1));
      if (i < delays.length && timer.current) {
        clearInterval(timer.current);
        timer.current = setInterval(tick, delays[i]);
      }
    };
    timer.current = setInterval(tick, delays[0]);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, prevId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.id) {
        router.push(`/${locale}/report/${data.id}`);
        return; // keep busy state during navigation
      }
      const map: Record<string, string> = {
        "invalid-url": labels.errors.invalid,
        unreachable: labels.errors.unreachable,
        "site-error": labels.errors.siteError,
        "rate-limit": labels.errors.rateLimit,
      };
      setError(map[data.error] ?? labels.errors.generic);
    } catch {
      setError(labels.errors.generic);
    } finally {
      if (timer.current) clearInterval(timer.current);
    }
    setBusy(false);
  }

  const submitText = busy
    ? (rescanningLabel ?? labels.submitting)
    : (rescanLabel ?? labels.submit);

  return (
    <form onSubmit={submit} className={compact ? "" : "w-full max-w-xl"} noValidate>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor="audit-url" className={compact ? "sr-only" : "block text-sm font-medium mb-1.5 text-muted"}>
            {labels.urlLabel}
          </label>
          <input
            id="audit-url"
            name="url"
            type="text"
            inputMode="url"
            autoComplete="url"
            required
            placeholder={labels.urlPlaceholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
            aria-describedby={error ? "audit-error" : undefined}
            aria-invalid={error ? true : undefined}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted/60 focus:border-accent disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={busy || url.trim().length === 0}
          className={`rounded-lg bg-accent text-accent-contrast font-semibold px-6 py-3 hover:bg-accent-strong transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${compact ? "" : "sm:self-end"}`}
        >
          {submitText}
        </button>
      </div>

      <div role="status" aria-live="polite" className="min-h-6 mt-3">
        {busy && (
          <p className="text-sm text-accent flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-3.5 w-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin"
            />
            {labels.progress[step]}
          </p>
        )}
        {error && (
          <p id="audit-error" className="text-sm text-score-red">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
