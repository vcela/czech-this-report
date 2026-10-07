import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { getSite } from "@/lib/sites";
import { RANGES, type Range } from "@/lib/analytics";
import { getSearchSummaryForSite, googleConfigured, hasGoogle, listSitemaps, type SitemapStatus } from "@/lib/google";
import { indexRows, lastInspection, type CoverageGroup } from "@/lib/indexing";
import { BOTS, KEY_BOTS, botSummary } from "@/lib/bots";
import { indexNowAction, inspectAction, submitSitemapAction } from "../../../account-actions";
import { SubmitButton } from "@/components/account/Forms";
import { CARD, Flash, Hidden, Metric, Table, fill } from "@/components/account/Ui";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; siteId: string }>;
  searchParams: Promise<{ range?: string; msg?: string; n?: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isLocale(locale)) return {};
  return { title: getDict(locale).account.tabs.search, robots: { index: false } };
}

export default async function SearchPage(props: Props) {
  const { locale, siteId } = await props.params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale);
  const site = getSite(user.id, siteId);
  if (!site) notFound();
  const sp = await props.searchParams;
  const dict = getDict(locale);
  const t = dict.account.search;
  const base = `/${locale}/dashboard/${site.id}`;
  const range = (RANGES as readonly number[]).includes(Number(sp.range)) ? (Number(sp.range) as Range) : 30;
  const num = new Intl.NumberFormat(locale);
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const dt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const d = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const google = googleConfigured() && hasGoogle(user.id);
  const gsc = await getSearchSummaryForSite(user.id, site, range);
  let sitemaps: SitemapStatus[] = [];
  if (google && site.gsc_property) {
    try {
      sitemaps = await listSitemaps(user.id, site.gsc_property);
    } catch {
      /* shown as no sitemap info */
    }
  }
  const rows = indexRows(site.id);
  const lastCheck = lastInspection(site.id);
  const groups = new Map<CoverageGroup, typeof rows>();
  for (const r of rows) groups.set(r.group, [...(groups.get(r.group) ?? []), r]);
  const indexed = groups.get("indexed")?.length ?? 0;
  const bots = botSummary(site.id);
  const hidden = <Hidden locale={locale} siteId={site.id} />;
  const flash = sp.msg ? dict.account.msgs[sp.msg] : undefined;

  return (
    <div>
      <Flash msg={sp.msg} text={flash && fill(flash, { n: sp.n ?? "" })} />

      {/* ---------------- Search Console performance ---------------- */}
      <section className={CARD} aria-labelledby="gsc-h">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 id="gsc-h" className="text-xl font-semibold">{t.gscTitle}</h2>
          {gsc && (
            <nav aria-label={dict.account.traffic.rangeLabel} className="flex gap-1">
              {RANGES.map((x) => (
                <Link
                  key={x}
                  href={`${base}/search?range=${x}`}
                  aria-current={x === range ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm border ${x === range ? "border-accent text-accent font-semibold" : "border-border text-muted hover:text-foreground"}`}
                >
                  {dict.account.traffic.ranges[x]}
                </Link>
              ))}
            </nav>
          )}
        </div>
        {!google || !site.gsc_property ? (
          <p className="text-muted">
            {!google ? t.notConnected : t.noProperty}{" "}
            <Link href={`${base}/setup`} className="text-accent hover:underline">{t.goSetup} →</Link>
          </p>
        ) : !gsc ? (
          <p className="text-muted">{t.noRows}</p>
        ) : (
          <>
            <p className="text-sm text-muted mb-4">{fill(t.gscPeriod, { days: range, to: d.format(new Date(gsc.to)) })}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <Metric label={t.clicks} value={num.format(gsc.totals.clicks)} help={t.clicksHelp} />
              <Metric label={t.impressions} value={num.format(gsc.totals.impressions)} help={t.impressionsHelp} />
              <Metric label={t.ctr} value={pct.format(gsc.totals.ctr)} help={t.ctrHelp} />
              <Metric label={t.position} value={gsc.totals.position ? gsc.totals.position.toFixed(1) : "—"} help={t.positionHelp} />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <Table
                title={t.queriesTitle}
                empty={t.noRows}
                head={[t.query, t.clicks, t.impressions, t.position]}
                rows={gsc.queries.slice(0, 25).map((q) => [q.key, num.format(q.clicks), num.format(q.impressions), q.position.toFixed(1)])}
              />
              <Table
                title={t.pagesTitle}
                empty={t.noRows}
                head={[t.page, t.clicks, t.impressions]}
                rows={gsc.pages.map((q) => [new URL(q.key).pathname, num.format(q.clicks), num.format(q.impressions)])}
              />
            </div>
          </>
        )}
      </section>

      {/* ---------------- Index coverage ---------------- */}
      {((google && site.gsc_property) || rows.length > 0) && (
        <section className={CARD} aria-labelledby="index-h">
          <h2 id="index-h" className="text-xl font-semibold mb-2">{t.indexTitle}</h2>
          <p className="text-muted mb-1">{t.indexIntro}</p>
          <p className="text-sm text-muted mb-4">{lastCheck ? fill(t.indexLast, { date: dt.format(new Date(lastCheck)) }) : t.indexNever}</p>
          {rows.length > 0 && <p className="text-lg mb-4">{fill(t.indexCount, { ok: indexed, total: rows.length })}</p>}
          {[...groups.entries()]
            .filter(([g]) => g !== "indexed")
            .map(([g, list]) => {
              const [label, advice] = t.coverage[g];
              return (
                <details key={g} className="mb-3 rounded-lg border border-border p-3">
                  <summary className="cursor-pointer">
                    <span className="font-semibold">{label}</span> <span className="text-muted">({list.length})</span>
                    <span className="block text-sm text-muted mt-1">{advice}</span>
                  </summary>
                  <ul className="mt-2 text-sm space-y-1 break-all">
                    {list.slice(0, 100).map((r) => (
                      <li key={r.url}>
                        <a href={r.url} rel="noopener" className="text-accent hover:underline">{new URL(r.url).pathname}</a>
                        {g === "other" && r.coverage && <span className="text-muted"> — {r.coverage}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          {google && site.gsc_property && (
            <form action={inspectAction} className="mt-4">
              {hidden}
              <SubmitButton variant="secondary" pendingLabel={t.indexRunning}>{t.indexRun}</SubmitButton>
            </form>
          )}
        </section>
      )}

      {/* ---------------- Sitemap + IndexNow ---------------- */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <section className="rounded-xl border border-border bg-surface p-5" aria-labelledby="sm-h">
          <h2 id="sm-h" className="font-semibold mb-2">{t.sitemapTitle}</h2>
          <p className="text-sm text-muted mb-3">{t.sitemapIntro}</p>
          {sitemaps.map((s) => (
            <p key={s.path} className="text-sm mb-2 break-all">
              {s.path}
              {s.lastDownloaded && <span className="block text-muted">{fill(t.sitemapLast, { date: dt.format(new Date(s.lastDownloaded)) })}</span>}
              {Number(s.errors) > 0 && <span className="block text-score-red">{fill(t.sitemapErrors, { n: s.errors ?? 0 })}</span>}
            </p>
          ))}
          {google && site.gsc_property ? (
            <form action={submitSitemapAction}>
              {hidden}
              <SubmitButton variant="secondary">{t.sitemapSubmit}</SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-muted">{t.notConnected}</p>
          )}
        </section>
        <section className="rounded-xl border border-border bg-surface p-5" aria-labelledby="in-h">
          <h2 id="in-h" className="font-semibold mb-2">{t.indexNowTitle}</h2>
          <p className="text-sm text-muted mb-3">{t.indexNowIntro}</p>
          {site.indexnow_last_at && <p className="text-sm text-muted mb-3">{fill(t.indexNowLast, { date: dt.format(new Date(site.indexnow_last_at)) })}</p>}
          <form action={indexNowAction}>
            {hidden}
            <SubmitButton variant="secondary">{t.indexNowSubmit}</SubmitButton>
          </form>
        </section>
      </div>

      {/* ---------------- Crawlers ---------------- */}
      <section className={CARD} aria-labelledby="bots-h">
        <h2 id="bots-h" className="text-xl font-semibold mb-3">{t.botsTitle}</h2>
        {!bots.installed ? (
          <p className="text-muted">
            {t.botsNotInstalled}{" "}
            <Link href={`${base}/setup#bots`} className="text-accent hover:underline">{t.goSetup} →</Link>
          </p>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            <Table
              empty=""
              head={[t.bot, t.visits, t.lastVisit]}
              rows={BOTS.filter((b) => KEY_BOTS.includes(b.id) || bots.bots.some((x) => x.id === b.id)).map((b) => {
                const s = bots.bots.find((x) => x.id === b.id);
                return [
                  <span key="b">
                    {b.name} <span className="text-muted">· {b.operator}</span>
                    <span className="block text-xs text-muted">
                      {t.kinds[b.kind]}
                      {!b.verify && ` · ${t.unverifiable}`}
                    </span>
                    {s && s.fake > 0 && <span className="block text-xs text-score-orange">{fill(t.fake, { n: s.fake })}</span>}
                    {s && s.errors > 0 && <span className="block text-xs text-score-red">{fill(t.errors, { n: s.errors })}</span>}
                  </span>,
                  s?.hits ? num.format(s.hits) : "0",
                  s?.last ? d.format(new Date(s.last)) : <span key="n" className="text-score-orange">{t.never}</span>,
                ];
              })}
            />
            <Table
              title={t.aiPagesTitle}
              empty="—"
              head={[t.page, t.visits]}
              rows={bots.aiPages.map((x) => [x.path, num.format(x.hits)])}
            />
          </div>
        )}
      </section>
    </div>
  );
}
