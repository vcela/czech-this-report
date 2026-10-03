import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { getSite, listCompetitors, siteHistory } from "@/lib/sites";
import { aiConfigured, citedInstead, geoHistory, getSuggestion, MAX_PROMPTS, type TopicIdea } from "@/lib/ai";
import {
  addCompetitorAction, auditCompetitorAction, findCompetitorsAction, removeCompetitorAction, runGeoAction,
  savePromptsAction, suggestPromptsAction, suggestTopicsAction,
} from "../../../account-actions";
import { SubmitButton } from "@/components/account/Forms";
import { CARD, Flash, Hidden, fill } from "@/components/account/Ui";
import { bandOf } from "@/components/report/ScoreGauge";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; siteId: string }>;
  searchParams: Promise<{ msg?: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isLocale(locale)) return {};
  return { title: getDict(locale).account.tabs.ai, robots: { index: false } };
}

const score = (n: number | undefined) =>
  n === undefined ? <span className="text-muted">—</span> : <span style={{ color: `var(--${bandOf(n)})` }} className="font-semibold">{n}</span>;

export default async function AiPage(props: Props) {
  const { locale, siteId } = await props.params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale);
  const site = getSite(user.id, siteId);
  if (!site) notFound();
  const { msg } = await props.searchParams;
  const dict = getDict(locale);
  const t = dict.account.ai;
  const hidden = <Hidden locale={locale} siteId={site.id} />;
  const ready = aiConfigured();
  const dt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const runs = geoHistory(site.id);
  const latest = runs[0];
  const rivals = citedInstead(latest, site.host);
  const topics = getSuggestion<TopicIdea[]>(site.id, `topics-${locale}`);
  const competitors = listCompetitors(site.id);
  const own = siteHistory(site.id)[0];
  const pillars = ["ai", "seo", "a11y"] as const;
  const inputCls = "w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-foreground placeholder:text-muted/60 focus:border-accent";

  return (
    <div>
      <Flash msg={msg} text={msg ? dict.account.msgs[msg] : undefined} />
      {!ready && <p className="mb-6 rounded-lg border border-score-orange text-score-orange px-4 py-3 text-sm">{t.notConfigured}</p>}

      {/* ---------------- GEO: is ChatGPT citing us? ---------------- */}
      <section id="geo" className={`${CARD} scroll-mt-20`} aria-labelledby="geo-h">
        <h2 id="geo-h" className="text-xl font-semibold mb-2">{t.geoTitle}</h2>
        <p className="text-muted mb-5">{t.geoIntro}</p>

        <form action={savePromptsAction} className="mb-4">
          {hidden}
          <label htmlFor="prompts" className="block font-medium mb-1.5">{t.promptsLabel}</label>
          <textarea id="prompts" name="prompts" rows={6} defaultValue={site.geo_prompts} className={`${inputCls} mb-3 text-sm`} maxLength={MAX_PROMPTS * 300} />
          <label htmlFor="brand" className="block font-medium mb-1.5">{t.brandLabel}</label>
          <input id="brand" name="brand" defaultValue={site.brand} placeholder={site.host.split(".")[0]} className={`${inputCls} mb-3 max-w-sm`} />
          <div>
            <SubmitButton variant="secondary">{t.promptsSave}</SubmitButton>
          </div>
        </form>
        {ready && (
          <div className="flex flex-wrap gap-3 mb-6">
            <form action={suggestPromptsAction}>
              {hidden}
              <SubmitButton variant="secondary" pendingLabel={t.topicsRunning}>{t.promptsSuggest}</SubmitButton>
            </form>
            {site.geo_prompts && (
              <form action={runGeoAction}>
                {hidden}
                <SubmitButton pendingLabel={t.geoRunning}>{t.geoRun}</SubmitButton>
              </form>
            )}
          </div>
        )}

        {!latest ? (
          <p className="text-muted">{t.geoNoRuns}</p>
        ) : (
          <>
            <p className="text-lg mb-3">
              {fill(t.geoLast, {
                date: dt.format(new Date(latest.runAt)),
                cited: latest.results.filter((r) => r.cited).length,
                mentioned: latest.results.filter((r) => r.mentioned).length,
                n: latest.results.length,
              })}
            </p>
            <ul className="divide-y divide-border mb-6">
              {latest.results.map((r, i) => (
                <li key={i} className="py-2.5">
                  <div className="flex flex-wrap gap-x-4 items-baseline">
                    <span className="flex-1 min-w-60">{r.prompt}</span>
                    <span className={`text-sm font-semibold ${r.cited ? "text-score-green" : r.mentioned ? "text-score-orange" : "text-score-red"}`}>
                      {r.cited ? t.cited : r.mentioned ? t.mentioned : t.notCited}
                    </span>
                  </div>
                  <details className="mt-1">
                    <summary className="text-sm text-muted cursor-pointer">{t.showAnswer}</summary>
                    <p className="text-sm whitespace-pre-line mt-2 text-muted">{r.answer}</p>
                    {r.citedUrls.length > 0 && (
                      <ul className="text-xs mt-2 break-all">
                        {r.citedUrls.map((u) => (
                          <li key={u}><a href={u} rel="noopener nofollow" className="text-accent hover:underline">{u}</a></li>
                        ))}
                      </ul>
                    )}
                  </details>
                </li>
              ))}
            </ul>
            {rivals.length > 0 && (
              <>
                <h3 className="font-semibold mb-2">{t.instead}</h3>
                <ul className="text-sm mb-6 flex flex-wrap gap-2">
                  {rivals.map((r) => (
                    <li key={r.domain} className="rounded-md border border-border px-2 py-1">{r.domain} <span className="text-muted">×{r.count}</span></li>
                  ))}
                </ul>
              </>
            )}
            {runs.length > 1 && (
              <>
                <h3 className="font-semibold mb-2">{t.history}</h3>
                <ul className="text-sm text-muted space-y-1">
                  {runs.map((run) => (
                    <li key={run.runAt}>
                      {dt.format(new Date(run.runAt))}: {t.cited.toLowerCase()} {run.results.filter((r) => r.cited).length}/{run.results.length}, {t.mentioned.toLowerCase()} {run.results.filter((r) => r.mentioned).length}/{run.results.length}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </section>

      {/* ---------------- Topic ideas ---------------- */}
      <section id="topics" className={`${CARD} scroll-mt-20`} aria-labelledby="topics-h">
        <h2 id="topics-h" className="text-xl font-semibold mb-2">{t.topicsTitle}</h2>
        <p className="text-muted mb-4">{t.topicsIntro}</p>
        {ready && (
          <form action={suggestTopicsAction} className="mb-5">
            {hidden}
            <SubmitButton variant="secondary" pendingLabel={t.topicsRunning}>{t.topicsRun}</SubmitButton>
          </form>
        )}
        {!topics ? (
          <p className="text-muted">{t.topicsNone}</p>
        ) : (
          <>
            <p className="text-sm text-muted mb-3">{fill(t.topicsDate, { date: dt.format(new Date(topics.createdAt)) })}</p>
            <ul className="divide-y divide-border">
              {topics.data.map((x, i) => (
                <li key={i} className="py-3">
                  <p className="font-semibold">{x.title}</p>
                  <p className="text-sm">{x.reason}</p>
                  <p className="text-xs text-muted mt-1">
                    {t.types[x.type] ?? x.type} · {t.basis[x.basis] ?? x.basis}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ---------------- Competitors ---------------- */}
      <section id="competitors" className={`${CARD} scroll-mt-20`} aria-labelledby="comp-h">
        <h2 id="comp-h" className="text-xl font-semibold mb-2">{t.competitorsTitle}</h2>
        <p className="text-muted mb-4">{t.competitorsIntro}</p>
        <div className="flex flex-wrap gap-3 mb-5">
          {ready && (
            <form action={findCompetitorsAction}>
              {hidden}
              <SubmitButton variant="secondary" pendingLabel={t.competitorsFinding}>{t.competitorsFind}</SubmitButton>
            </form>
          )}
          <form action={addCompetitorAction} className="flex gap-2">
            {hidden}
            <label htmlFor="comp-domain" className="sr-only">{t.competitorPlaceholder}</label>
            <input id="comp-domain" name="domain" placeholder={t.competitorPlaceholder} className="rounded-lg border border-border bg-surface-2 px-3 py-2" />
            <SubmitButton variant="secondary">{t.competitorAdd}</SubmitButton>
          </form>
        </div>
        {competitors.length === 0 ? (
          <p className="text-muted">{t.noCompetitors}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted text-left">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">{t.competitorsTitle}</th>
                  <th scope="col" className="py-2 px-2 font-medium text-right">{dict.account.overall}</th>
                  {pillars.map((p) => (
                    <th key={p} scope="col" className="py-2 px-2 font-medium text-right">{dict.report.pillarNames[p]}</th>
                  ))}
                  <th scope="col"><span className="sr-only">{t.compare}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="font-semibold">
                  <td className="py-2 pr-3">{t.you} · {site.host}</td>
                  <td className="py-2 px-2 text-right">{score(own?.overall)}</td>
                  {pillars.map((p) => <td key={p} className="py-2 px-2 text-right">{score(own?.pillars[p].score)}</td>)}
                  <td />
                </tr>
                {competitors.map((c) => (
                  <tr key={c.domain}>
                    <td className="py-2 pr-3">
                      {c.domain}
                      <span className="block text-xs text-muted">{[t.sources[c.source], c.reason].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      {c.report ? <Link href={`/${locale}/report/${c.report.id}`} className="hover:underline">{score(c.report.overall)}</Link> : score(undefined)}
                    </td>
                    {pillars.map((p) => <td key={p} className="py-2 px-2 text-right">{score(c.report?.pillars[p].score)}</td>)}
                    <td className="py-2 pl-2">
                      <div className="flex gap-2 justify-end">
                        <form action={auditCompetitorAction}>
                          {hidden}
                          <input type="hidden" name="domain" value={c.domain} />
                          <SubmitButton variant="secondary" pendingLabel={t.comparing}>{t.compare}</SubmitButton>
                        </form>
                        <form action={removeCompetitorAction}>
                          {hidden}
                          <input type="hidden" name="domain" value={c.domain} />
                          <button type="submit" className="text-sm text-muted hover:text-score-red px-2">{t.remove}</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
