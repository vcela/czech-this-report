import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { listSites } from "@/lib/sites";
import { addSiteAction, logout } from "../account-actions";
import { SubmitButton } from "@/components/account/Forms";
import { bandOf } from "@/components/report/ScoreGauge";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isLocale(locale)) return {};
  return { title: getDict(locale).account.dashboardTitle, robots: { index: false } };
}

export default async function DashboardPage(props: Props) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale);
  const { error } = await props.searchParams;
  const t = getDict(locale).account;
  const sites = listSites(user.id);
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <h1 className="text-3xl font-bold">{t.dashboardTitle}</h1>
        <form action={logout} className="flex items-center gap-3 text-sm text-muted">
          <input type="hidden" name="locale" value={locale} />
          <span>{user.email}</span>
          <button type="submit" className="underline hover:text-foreground">
            {t.logout}
          </button>
        </form>
      </div>
      <p className="text-muted mb-8">{t.dashboardIntro}</p>

      <form action={addSiteAction} className="mb-10" noValidate>
        <input type="hidden" name="locale" value={locale} />
        <label htmlFor="site-url" className="block text-sm font-medium mb-1.5 text-muted">
          {t.addSiteLabel}
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="site-url"
            name="url"
            type="text"
            inputMode="url"
            required
            placeholder={t.addSitePlaceholder}
            aria-describedby={error ? "add-error" : undefined}
            aria-invalid={error ? true : undefined}
            className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted/60 focus:border-accent"
          />
          <SubmitButton>{t.addSiteSubmit}</SubmitButton>
        </div>
        {error === "url" && (
          <p id="add-error" role="alert" className="text-sm text-score-red mt-2">
            {t.addSiteError}
          </p>
        )}
      </form>

      {sites.length === 0 ? (
        <p className="text-muted">{t.noSites}</p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-xl bg-surface">
          {sites.map((s) => (
            <li key={s.id}>
              <Link
                href={`/${locale}/dashboard/${s.id}`}
                className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4 hover:bg-surface-2 transition-colors"
              >
                <span className="font-semibold flex-1 min-w-48">{s.host}</span>
                <span className={`text-sm ${s.verified_at ? "text-score-green" : "text-score-orange"}`}>
                  {s.verified_at ? t.verified : t.notVerified}
                </span>
                <span className="text-sm text-muted">
                  {s.last_audit_at
                    ? `${t.lastAudit}: ${fmt.format(new Date(s.last_audit_at))}`
                    : t.neverAudited}
                </span>
                {s.last_overall !== null && (
                  <span className="text-xl font-bold w-12 text-right"
                    style={{ color: `var(--${bandOf(s.last_overall)})` }}>
                    {s.last_overall}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
