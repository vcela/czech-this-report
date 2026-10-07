"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "@/app/[locale]/account-actions";

const input =
  "w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted/60 focus:border-accent";

/** Submit button that shows its own pending label while the server action runs. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const { pending } = useFormStatus();
  const cls = {
    primary: "bg-accent text-accent-contrast hover:bg-accent-strong",
    secondary: "border border-accent text-accent hover:bg-accent hover:text-accent-contrast",
    danger: "border border-score-red text-score-red hover:bg-score-red hover:text-background",
  }[variant];
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={`rounded-lg font-semibold px-5 py-2.5 transition-colors disabled:opacity-60 disabled:cursor-wait ${cls}`}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

export function LoginForm({
  locale,
  labels,
}: {
  locale: string;
  labels: { email: string; password: string; submit: string; invalid: string; rateLimit: string };
}) {
  const [state, action] = useActionState<LoginState, FormData>(login, undefined);
  const error = state?.error === "rate-limit" ? labels.rateLimit : state?.error ? labels.invalid : null;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1.5 text-muted">
          {labels.email}
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={input} />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1.5 text-muted">
          {labels.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby={error ? "login-error" : undefined}
          aria-invalid={error ? true : undefined}
          className={input}
        />
      </div>
      <div role="status" aria-live="polite" className="min-h-6">
        {error && (
          <p id="login-error" className="text-sm text-score-red">
            {error}
          </p>
        )}
      </div>
      <SubmitButton>{labels.submit}</SubmitButton>
    </form>
  );
}
