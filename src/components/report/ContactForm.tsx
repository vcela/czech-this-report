"use client";

import { useState } from "react";

export interface ContactLabels {
  title: string;
  text: string;
  name: string;
  email: string;
  message: string;
  messagePrefill: string;
  send: string;
  sending: string;
  sent: string;
  error: string;
  privacy: string;
}

export function ContactForm({
  labels,
  reportId,
  contactEmail,
}: {
  labels: ContactLabels;
  reportId?: string;
  contactEmail: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    const fd = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          message: fd.get("message"),
          website: fd.get("website"), // honeypot
          reportId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Contact form submission failed", data);
      }
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted/60 focus:border-accent";

  return (
    <section
      id="hire"
      aria-labelledby="hire-title"
      className="rounded-xl border border-accent/40 bg-surface p-6 sm:p-8"
    >
      <h2 id="hire-title" className="text-xl font-bold mb-2">
        {labels.title}
      </h2>
      <p className="text-sm text-muted leading-relaxed mb-5 max-w-2xl">{labels.text}</p>

      {state === "sent" ? (
        <p role="status" className="text-score-green font-medium">
          {labels.sent}
        </p>
      ) : (
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          <div>
            <label htmlFor="hire-name" className="block text-sm font-medium mb-1.5">
              {labels.name}
            </label>
            <input id="hire-name" name="name" required autoComplete="name" className={inputCls} />
          </div>
          <div>
            <label htmlFor="hire-email" className="block text-sm font-medium mb-1.5">
              {labels.email}
            </label>
            <input
              id="hire-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputCls}
            />
          </div>
          {/* honeypot — hidden from real users, tempting for bots */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="hire-website">Website</label>
            <input id="hire-website" name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="hire-message" className="block text-sm font-medium mb-1.5">
              {labels.message}
            </label>
            <textarea
              id="hire-message"
              name="message"
              required
              rows={4}
              defaultValue={labels.messagePrefill}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={state === "sending"}
              className="rounded-lg bg-accent text-accent-contrast font-semibold px-6 py-2.5 hover:bg-accent-strong transition-colors disabled:opacity-60"
            >
              {state === "sending" ? labels.sending : labels.send}
            </button>
            {state === "error" && (
              <p role="alert" className="text-sm text-score-red">
                {labels.error}{" "}
                <a className="underline" href={`mailto:${contactEmail}`}>
                  {contactEmail}
                </a>
              </p>
            )}
          </div>
          <p className="sm:col-span-2 text-xs text-muted">{labels.privacy}</p>
        </form>
      )}
    </section>
  );
}
