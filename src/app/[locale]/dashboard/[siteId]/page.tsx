import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { getSite } from "@/lib/sites";
import { RANGES, getStats, parseGoals, type Range, type Stats } from "@/lib/analytics";
import { recommend } from "@/lib/recommend";
import { recInput } from "@/lib/portfolio";
import { campaignCostAction } from "../../account-actions";
import { SubmitButton } from "@/components/account/Forms";
import { Hidden, Metric, Table, fill } from "@/components/account/Ui";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; siteId: string }>;
  searchParams: Promise<{ range?: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isLocale(locale)) return {};
  return { title: getDict(locale).account.tabs.traffic, robots: { index: false } };
}

type T = ReturnType<typeof getDict>["account"]["traffic"];

function change(curr: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

function Delta({ curr, prev, t }: { curr: number; prev: number; t: T }) {
  const d = change(curr, prev);
  if (d === null) return curr ? <span className="text-muted">{t.newMetric}</span> : null;
  const color = d > 0 ? "text-score-green" : d < 0 ? "text-score-red" : "text-muted";
  return (
    <span className={color}>
      {d > 0 ? "▲ +" : d < 0 ? "▼ " : "±"}
      {d} % <span className="text-muted">{t.vsPrevious}</span>
    </span>
  );
}

/** Every day of the period, zeros included, so gaps read as gaps. */
function Bars({ stats, t, locale }: { stats: Stats; t: T; locale: Locale }) {
  const byDay = new Map(stats.daily.map((d) => [d.day, d.visitors]));
  const days = stats.days.map((day) => ({ day, n: byDay.get(day) ?? 0 }));
  const max = Math.max(1, ...days.map((d) => d.n));
  const w = 800;
  const h = 140;
  const bw = w / days.length;
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric" });
  return (
    <figure className="rounded-xl bg-surface border border-border p-4 mb-8">
      <figcaption className="text-sm text-muted mb-3">{t.chartTitle}</figcaption>
      <svg viewBox={`0 0 ${w} ${h + 18}`} className="w-full h-40" role="img" aria-label={t.chartDesc}>
        {days.map((d, i) => {
          const bh = (d.n / max) * h;
          return (
            <rect key={d.day} x={i * bw + bw * 0.15} y={h - bh} width={bw * 0.7} height={Math.max(bh, d.n ? 1 : 0)} fill="var(--accent)" rx={Math.min(3, bw * 0.2)}>
              <title>{`${fmt.format(new Date(d.day))}: ${d.n}`}</title>
            </rect>
          );
        })}
        <text x="0" y={h + 14} fontSize="11" fill="var(--muted)">{fmt.format(new Date(days[0].day))}</text>
        <text x={w} y={h + 14} fontSize="11" fill="var(--muted)" textAnchor="end">{fmt.format(new Date(days[days.length - 1].day))}</text>
        <text x={w} y="10" fontSize="11" fill="var(--muted)" textAnchor="end">{max}</text>
      </svg>
    </figure>
  );
}

export default async function OverviewPage(props: Props) {
  const { locale, siteId } = await props.params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale);
  const site = getSite(user.id, siteId);
  if (!site) notFound();
  const dict = getDict(locale);
  const t = dict.account.traffic;
  const r = dict.account.recs;
  const { range: rawRange } = await props.searchParams;
  const range = (RANGES as readonly number[]).includes(Number(rawRange)) ? (Number(rawRange) as Range) : 30;
  const goals = parseGoals(site.goal_paths);
  const stats = getStats(site.id, range, goals);
  const base = `/${locale}/dashboard/${site.id}`;
  const num = new Intl.NumberFormat(locale);
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const czk = new Intl.NumberFormat(locale, { style: "currency", currency: "CZK", maximumFractionDigits: 0 });
  const { current: c, previous: p } = stats;

  // Recommendations always look at the last 30 days, whatever period is shown.
  const stats30 = range === 30 ? stats : getStats(site.id, 30, goals);
  const input = await recInput(user.id, site, stats30);
  const campaigns = input.campaigns;
  const recs = recommend(input);
  const toneCls = { fix: "text-score-red", idea: "text-accent", setup: "text-score-orange" };

  const recBox = (
    <section aria-labelledby="recs-h" className="rounded-xl border border-accent/40 bg-surface p-5 mb-8">
      <h2 id="recs-h" className="text-lg font-semibold mb-3">{r.title}</h2>
      {recs.length === 0 ? (
        <p className="text-muted">{r.empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {recs.map((x) => (
            <li key={x.key} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-2.5">
              <span className={`text-xs font-semibold uppercase tracking-wide w-24 shrink-0 pt-0.5 ${toneCls[x.tone]}`}>{r.tones[x.tone]}</span>
              <span className="flex-1 min-w-60">{fill(r[x.key], Object.fromEntries(Object.entries(x.params).map(([k, v]) => [k, typeof v === "number" ? num.format(v) : v])))}</span>
              <Link href={base + x.tab} className="text-sm text-accent hover:underline">{r.open} →</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  if (!stats.hasAnyData) {
    return (
      <div>
        {recBox}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold mb-2">{t.noDataTitle}</h2>
          <p className="text-muted mb-5">{t.noDataText}</p>
          <Link href={`${base}/setup`} className="inline-block rounded-lg bg-accent text-accent-contrast font-semibold px-5 py-2.5 hover:bg-accent-strong">
            {t.noDataCta}
          </Link>
        </div>
      </div>
    );
  }

  const top = stats.sources[0];
  // utm_source values come lower-case ("facebook"); hostnames stay as they are
  const sourceName = (kind: string, label: string) =>
    !label ? (t.kinds[kind] ?? kind) : label.includes(".") ? label : label[0].toUpperCase() + label.slice(1);
  const rule = new Intl.PluralRules(locale).select(c.visitors);
  const d = change(c.visitors, p.visitors);
  const summary =
    (rule === "one" ? t.summaryOne : rule === "few" ? t.summaryFew : t.summaryOther)
      .replace("{range}", t.rangeInSentence[range])
      .replace("{n}", num.format(c.visitors)) +
    (d !== null ? t.summaryChange.replace("{change}", `${d > 0 ? "+" : ""}${d} %`) : "") +
    (top ? t.summaryTop.replace("{source}", sourceName(top.kind, top.label)) : t.summaryEnd);
  const totalDeviceVisitors = stats.devices.reduce((a, x) => a + x.visitors, 0);

  return (
    <div>
      {recBox}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <p className="text-lg max-w-2xl">{summary}</p>
        <nav aria-label={t.rangeLabel} className="flex gap-1">
          {RANGES.map((x) => (
            <Link
              key={x}
              href={`${base}?range=${x}`}
              aria-current={x === range ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm border transition-colors ${
                x === range ? "border-accent text-accent font-semibold" : "border-border text-muted hover:text-foreground"
              }`}
            >
              {t.ranges[x]}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Metric label={t.visitors} value={num.format(c.visitors)} help={t.visitorsHelp} extra={<Delta curr={c.visitors} prev={p.visitors} t={t} />} />
        <Metric label={t.visits} value={num.format(c.visits)} help={t.visitsHelp} extra={<Delta curr={c.visits} prev={p.visits} t={t} />} />
        <Metric label={t.pageviews} value={num.format(c.pageviews)} help={t.pageviewsHelp} extra={<Delta curr={c.pageviews} prev={p.pageviews} t={t} />} />
        <Metric
          label={t.conversions}
          value={num.format(c.conversions)}
          help={t.conversionsHelp}
          extra={c.visits ? <span className="text-muted">{t.conversionRate.replace("{rate}", pct.format(c.conversions / c.visits))}</span> : null}
        />
        {c.revenue > 0 && (
          <Metric label={t.revenue} value={czk.format(c.revenue)} help={t.revenueHelp} extra={<Delta curr={c.revenue} prev={p.revenue} t={t} />} />
        )}
      </div>

      <Bars stats={stats} t={t} locale={locale} />

      <div className="grid md:grid-cols-2 gap-4">
        <Table
          title={t.sourcesTitle}
          empty={t.sourcesEmpty}
          head={[t.source, t.visits, t.conversions]}
          rows={stats.sources.map((s) => [
            <span key="s">
              {sourceName(s.kind, s.label)}
              {s.label && <span className="block text-xs text-muted">{t.kinds[s.kind]}</span>}
            </span>,
            num.format(s.visits),
            num.format(s.conversions),
          ])}
        />
        <Table
          title={t.pagesTitle}
          empty={t.emptyPeriod}
          head={[t.page, t.pageviews, t.visitors]}
          rows={stats.pages.map((x) => [x.path, num.format(x.pageviews), num.format(x.visitors)])}
        />
        <Table
          title={t.searchTitle}
          empty={t.searchEmpty}
          head={[t.searchQuery, t.times]}
          rows={stats.searches.map((x) => [
            <span key="q">
              {x.query}
              {x.noResults > 0 && (
                <span className="block text-xs text-score-orange">{t.noResults.replace("{n}", String(x.noResults))}</span>
              )}
            </span>,
            num.format(x.count),
          ])}
        />
        <Table
          title={t.goalsTitle}
          empty={t.goalsEmpty}
          head={[t.conversions, t.times]}
          rows={stats.goals.map((g) => [g.name, num.format(g.count)])}
        />
        <Table
          title={t.devicesTitle}
          empty={t.emptyPeriod}
          head={[t.devicesTitle, t.visitors]}
          rows={stats.devices.map((x) => [
            t.devices[x.device] ?? x.device,
            `${num.format(x.visitors)} (${pct.format(x.visitors / totalDeviceVisitors)})`,
          ])}
        />
      </div>

      <div className="mt-4">
        <Table
          id="campaigns"
          title={t.campaignsTitle}
          empty={t.campaignsEmpty}
          head={[t.campaign, t.visits, t.conversions, t.cost, t.costPerConversion]}
          rows={campaigns.map((x) => [
            <span key="n">
              {x.campaign}
              {x.revenue > 0 && <span className="block text-xs text-muted">{t.revenue}: {czk.format(x.revenue)}</span>}
            </span>,
            num.format(x.visits),
            num.format(x.conversions),
            <form key="f" action={campaignCostAction} className="flex justify-end gap-2">
              <Hidden locale={locale} siteId={site.id} />
              <input type="hidden" name="campaign" value={x.campaign} />
              <label className="sr-only" htmlFor={`cost-${x.campaign}`}>{`${t.cost} — ${x.campaign}`}</label>
              <input
                id={`cost-${x.campaign}`}
                name="amount"
                inputMode="decimal"
                defaultValue={x.cost ?? ""}
                className="w-24 rounded-md border border-border bg-surface-2 px-2 py-1 text-right"
              />
              <SubmitButton variant="secondary">{t.costSave}</SubmitButton>
            </form>,
            x.cost && x.conversions ? czk.format(x.cost / x.conversions) : "—",
          ])}
          footer={campaigns.length ? <p className="text-xs text-muted mt-3">{t.costNote}</p> : null}
        />
      </div>

      {c.pageviews > 0 && (
        <p className="text-sm text-muted mt-6">{t.consentNote.replace("{share}", pct.format(stats.consentedShare))}</p>
      )}
    </div>
  );
}
