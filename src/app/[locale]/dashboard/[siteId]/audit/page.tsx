import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { getUser, requireUser } from "@/lib/auth";
import { AUDIT_INTERVAL_DAYS, getSite, siteHistory } from "@/lib/sites";
import { CATALOG } from "@/lib/audit/catalog";
import type { Report } from "@/lib/audit/types";
import { auditSiteAction } from "../../../account-actions";
import { SubmitButton } from "@/components/account/Forms";
import { bandOf } from "@/components/report/ScoreGauge";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; siteId: string }>;
  searchParams: Promise<{ error?: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { siteId } = await props.params;
  const user = await getUser();
  const site = user ? getSite(user.id, siteId) : null;
  return { title: site?.host, robots: { index: false } };
}

const PILLARS = ["ai", "seo", "a11y"] as const;
const scoreColor = (n: number) => ({ color: `var(--${bandOf(n)})` });

/** Oldest → newest overall scores as a small line; the table below carries the same data accessibly. */
function Sparkline({ history }: { history: Report[] }) {
  if (history.length < 2) return null;
  const pts = [...history].reverse();
  const w = 600;
  const h = 80;
  const step = w / (pts.length - 1);
  const line = pts.map((r, i) => `${Math.round(i * step)},${Math.round(h - (r.overall / 100) * h)}`).join(" ");
  return (
    <svg viewBox={`-4 -4 ${w + 8} ${h + 8}`} className="w-full h-20 mb-4" aria-hidden="true">
      <polyline fill="none" stroke="var(--accent)" strokeWidth="2.5" points={line} />
    </svg>
  );
}

function Changes({ latest, prev, locale, t }: { latest: Report; prev: Report; locale: Locale; t: ReturnType<typeof getDict>["account"] }) {
  const now = new Set(latest.findings.map((f) => f.checkId));
  const before = new Set(prev.findings.map((f) => f.checkId));
  const fixed = [...before].filter((id) => !now.has(id));
  const added = [...now].filter((id) => !before.has(id));
  const title = (id: string) => CATALOG[id]?.title[locale] ?? id;
  if (!fixed.length && !added.length) return <p className="text-muted">{t.noChanges}</p>;
  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {[
        { label: t.fixedTitle, ids: fixed, color: "var(--green)", mark: "✓" },
        { label: t.newTitle, ids: added, color: "var(--red)", mark: "!" },
      ].map((col) =>
        col.ids.length ? (
          <div key={col.label}>
            <h3 className="font-semibold mb-2" style={{ color: col.color }}>
              {col.label} ({col.ids.length})
            </h3>
            <ul className="space-y-1.5 text-sm">
              {col.ids.map((id) => (
                <li key={id} className="flex gap-2">
                  <span aria-hidden="true" style={{ color: col.color }}>{col.mark}</span>
                  {title(id)}
                </li>
              ))}
            </ul>
          </div>
        ) : null
      )}
    </div>
  );
}

export default async function SitePage(props: Props) {
  const { locale, siteId } = await props.params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale);
  const site = getSite(user.id, siteId);
  if (!site) notFound();
  const { error } = await props.searchParams;
  const dict = getDict(locale);
  const t = dict.account;
  const history = siteHistory(site.id);
  const latest = history[0];
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const fmtDate = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const nextAudit = latest
    ? new Date(new Date(latest.createdAt).getTime() + AUDIT_INTERVAL_DAYS * 86_400_000)
    : null;
  const hidden = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="siteId" value={site.id} />
    </>
  );
  const card = "rounded-xl border border-border bg-surface p-5 sm:p-6 mb-8";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <form action={auditSiteAction}>
          {hidden}
          <SubmitButton variant={site.verified_at ? "primary" : "secondary"} pendingLabel={t.running}>
            {t.runAudit}
          </SubmitButton>
        </form>
        {site.verified_at && (
          <p className="text-sm text-muted">
            {t.nextAudit}:{" "}
            {nextAudit && nextAudit > new Date() ? fmtDate.format(nextAudit) : t.nextAuditSoon}
          </p>
        )}
      </div>
      {error === "audit" && (
        <p role="alert" className="text-sm text-score-red -mt-4 mb-8">{t.auditFailed}</p>
      )}

      {history.length >= 2 && (
        <section className={card} aria-labelledby="changes-h">
          <h2 id="changes-h" className="text-xl font-semibold mb-4">{t.changesTitle}</h2>
          <Changes latest={history[0]} prev={history[1]} locale={locale} t={t} />
        </section>
      )}

      <section className={card} aria-labelledby="history-h">
        <h2 id="history-h" className="text-xl font-semibold mb-4">{t.historyTitle}</h2>
        {history.length === 0 ? (
          <p className="text-muted">{t.historyEmpty}</p>
        ) : (
          <>
            <Sparkline history={history} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted text-left">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-medium">{t.date}</th>
                    <th scope="col" className="py-2 pr-4 font-medium">{t.overall}</th>
                    {PILLARS.map((p) => (
                      <th key={p} scope="col" className="py-2 pr-4 font-medium">{dict.report.pillarNames[p]}</th>
                    ))}
                    <th scope="col"><span className="sr-only">{t.openReport}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-4 whitespace-nowrap">{fmt.format(new Date(r.createdAt))}</td>
                      <td className="py-2 pr-4 font-bold" style={scoreColor(r.overall)}>{r.overall}</td>
                      {PILLARS.map((p) => (
                        <td key={p} className="py-2 pr-4" style={scoreColor(r.pillars[p].score)}>
                          {r.pillars[p].score}
                        </td>
                      ))}
                      <td className="py-2 text-right">
                        <Link href={`/${locale}/report/${r.id}`} className="text-accent hover:underline whitespace-nowrap">
                          {t.openReport}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

    </div>
  );
}
