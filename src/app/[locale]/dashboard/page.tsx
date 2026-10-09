import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { listSites } from "@/lib/sites";
import { portfolio, type PortfolioRow } from "@/lib/portfolio";
import { addSiteAction, logout } from "../account-actions";
import { SubmitButton } from "@/components/account/Forms";
import { fill } from "@/components/account/Ui";
import { CreditPill } from "@/components/account/CreditPill";
import { aiConfigured } from "@/lib/ai";
import { bandOf } from "@/components/report/ScoreGauge";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; sort?: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isLocale(locale)) return {};
  return { title: getDict(locale).account.dashboardTitle, robots: { index: false } };
}

type Dict = ReturnType<typeof getDict>;

/** Sort keys; every one puts "no data" last so empty sites never win a column. */
const SORTS: Record<string, (r: PortfolioRow) => number | null> = {
  attention: (r) => r.attention,
  visitors: (r) => r.visitors,
  growth: (r) => (r.prevVisitors >= 20 ? r.change : null),
  ctr: (r) => (r.gsc && r.gsc.impressions >= 100 ? r.gsc.ctr : null),
  potential: (r) => r.gsc?.potential ?? null,
  health: (r) => r.score,
  ai: (r) => r.aiVisits,
};

function sortRows(rows: PortfolioRow[], key: string): PortfolioRow[] {
  const f = SORTS[key] ?? SORTS.attention;
  return [...rows].sort((a, b) => {
    const x = f(a);
    const y = f(b);
    if (x === null && y === null) return b.visitors - a.visitors;
    if (x === null) return 1;
    if (y === null) return -1;
    return y - x || b.visitors - a.visitors;
  });
}

/** 30-day trend; each day is a hover target with its own tooltip. */
function Sparkline({ row, label, locale }: { row: PortfolioRow; label: string; locale: Locale }) {
  const w = 120;
  const h = 32;
  const max = Math.max(1, ...row.daily);
  const step = w / (row.daily.length - 1);
  const pts = row.daily.map((n, i) => [i * step, h - 2 - (n / max) * (h - 4)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric" });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-[120px] h-8 overflow-visible" role="img" aria-label={label}>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill="var(--accent)" opacity="0.15" />
      <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
      {pts.map(([x], i) => (
        <rect key={i} x={x - step / 2} y="0" width={step} height={h} fill="transparent">
          <title>{`${fmt.format(new Date(row.days[i]))}: ${row.daily[i]}`}</title>
        </rect>
      ))}
    </svg>
  );
}

function RankMove({ row, t }: { row: PortfolioRow; t: Dict["account"]["portfolio"] }) {
  if (!row.visitors) return null;
  if (row.prevRank === null) return <span className="text-xs text-accent">{t.newRank}</span>;
  const d = row.prevRank - row.rank;
  if (!d) return <span className="text-xs text-muted" aria-hidden="true">–</span>;
  return (
    <span className={`text-xs font-semibold ${d > 0 ? "text-score-green" : "text-score-red"}`}>
      {d > 0 ? `▲${d}` : `▼${-d}`}
    </span>
  );
}

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted">—</span>;
  const cls = value > 0 ? "text-score-green" : value < 0 ? "text-score-red" : "text-muted";
  return <span className={cls}>{value > 0 ? `+${value}` : value} %</span>;
}

export default async function DashboardPage(props: Props) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale);
  const { error, sort = "attention" } = await props.searchParams;
  const dict = getDict(locale);
  const t = dict.account;
  const p = t.portfolio;
  const sites = listSites(user.id);
  const rows = await portfolio(user.id, sites);
  const sorted = sortRows(rows, sort);
  const num = new Intl.NumberFormat(locale);
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const maxVisitors = Math.max(1, ...rows.map((r) => r.visitors));
  const href = (r: PortfolioRow, tab = "") => `/${locale}/dashboard/${r.site.id}${tab}`;
  const recText = (r: PortfolioRow["recs"][number]) =>
    fill(t.recs[r.key], Object.fromEntries(Object.entries(r.params).map(([k, v]) => [k, typeof v === "number" ? num.format(v) : v])));
  const counts = (r: PortfolioRow) => {
    const n = (tone: string) => r.recs.filter((x) => x.tone === tone).length;
    return [
      n("fix") ? { cls: "text-score-red", text: fill(p.fixes, { n: n("fix") }) } : null,
      n("idea") ? { cls: "text-accent", text: fill(p.ideas, { n: n("idea") }) } : null,
      n("setup") ? { cls: "text-score-orange", text: fill(p.setup, { n: n("setup") }) } : null,
    ].filter(Boolean) as { cls: string; text: string }[];
  };

  // Portfolio totals
  const total = rows.reduce((a, r) => a + r.visitors, 0);
  const prevTotal = rows.reduce((a, r) => a + r.prevVisitors, 0);
  const totalChange = prevTotal ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;
  const withGsc = rows.filter((r) => r.gsc);
  const needFix = rows.filter((r) => r.recs.some((x) => x.tone === "fix")).length;

  // Hall of fame: one winner per category, only among sites with data for it
  const best = (key: string) => {
    const r = sortRows(rows, key)[0];
    return r && SORTS[key](r) !== null && (SORTS[key](r) ?? 0) > 0 ? r : null;
  };
  const records = [
    { key: "visitors", row: best("visitors"), value: (r: PortfolioRow) => num.format(r.visitors) },
    { key: "growth", row: best("growth"), value: (r: PortfolioRow) => `+${r.change} %` },
    { key: "ctr", row: best("ctr"), value: (r: PortfolioRow) => pct.format(r.gsc!.ctr) },
    { key: "potential", row: best("potential"), value: (r: PortfolioRow) => num.format(r.gsc!.potential) },
    { key: "health", row: best("health"), value: (r: PortfolioRow) => `${r.score}/100` },
    { key: "ai", row: best("ai"), value: (r: PortfolioRow) => num.format(r.aiVisits) },
  ].filter((x) => x.row);

  const attention = sortRows(rows, "attention").filter((r) => r.attention > 0).slice(0, 3);

  const addForm = (
    <form action={addSiteAction} noValidate>
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
  );

  const cell = "lg:sr-only text-xs text-muted block";

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <h1 className="text-3xl font-bold">{t.dashboardTitle}</h1>
        <div className="flex flex-wrap items-center gap-4">
          {aiConfigured() && <CreditPill userId={user.id} locale={locale} />}
        <form action={logout} className="flex items-center gap-3 text-sm text-muted">
          <input type="hidden" name="locale" value={locale} />
          <span>{user.email}</span>
          <button type="submit" className="underline hover:text-foreground">
            {t.logout}
          </button>
        </form>
        </div>
      </div>

      {rows.length === 0 ? (
        <>
          <p className="text-muted mb-8">{t.dashboardIntro}</p>
          {addForm}
          <p className="text-muted mt-8">{t.noSites}</p>
        </>
      ) : (
        <>
          <p className="text-muted mb-8">{p.intro}</p>

          {/* ---------- Totals ---------- */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
            <div className="rounded-xl bg-surface border border-border p-4">
              <p className="text-sm text-muted">{p.totalVisitors}</p>
              <p className="text-3xl font-bold mt-1">{num.format(total)}</p>
              <p className="text-xs mt-1">
                <Change value={totalChange} /> <span className="text-muted">{p.vsPrevious}</span>
              </p>
            </div>
            <div className="rounded-xl bg-surface border border-border p-4">
              <p className="text-sm text-muted">{p.totalConversions}</p>
              <p className="text-3xl font-bold mt-1">{num.format(rows.reduce((a, r) => a + r.conversions, 0))}</p>
            </div>
            <div className="rounded-xl bg-surface border border-border p-4">
              <p className="text-sm text-muted">{p.totalClicks}</p>
              <p className="text-3xl font-bold mt-1">{withGsc.length ? num.format(withGsc.reduce((a, r) => a + r.gsc!.clicks, 0)) : "—"}</p>
              <p className="text-xs text-muted mt-1">{p.totalClicksHelp}</p>
            </div>
            <div className="rounded-xl bg-surface border border-border p-4">
              <p className="text-sm text-muted">{p.needAttention}</p>
              <p className={`text-3xl font-bold mt-1 ${needFix ? "text-score-red" : "text-score-green"}`}>
                {needFix} <span className="text-base font-normal text-muted">/ {rows.length}</span>
              </p>
            </div>
          </div>

          {/* ---------- Where to spend time ---------- */}
          <section aria-labelledby="att-h" className="mb-10">
            <h2 id="att-h" className="text-xl font-semibold mb-4">{p.attentionTitle}</h2>
            {attention.length === 0 ? (
              <p className="text-muted">{p.attentionEmpty}</p>
            ) : (
              <ol className="grid md:grid-cols-3 gap-4">
                {attention.map((r, i) => (
                  <li key={r.site.id}>
                    <Link
                      href={href(r)}
                      className="block h-full rounded-xl border border-border bg-surface p-5 hover:border-accent transition-colors"
                    >
                      <p className="flex items-baseline gap-3">
                        <span className="text-3xl font-bold text-accent" aria-hidden="true">{i + 1}</span>
                        <span className="font-semibold text-lg break-all">{r.site.host}</span>
                      </p>
                      <p className="flex flex-wrap gap-x-3 text-xs font-semibold mt-2">
                        {counts(r).map((c) => (
                          <span key={c.text} className={c.cls}>{c.text}</span>
                        ))}
                      </p>
                      <ul className="mt-3 space-y-2 text-sm">
                        {r.recs.slice(0, 2).map((x) => (
                          <li key={x.key} className="text-muted leading-relaxed">{recText(x)}</li>
                        ))}
                      </ul>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* ---------- Hall of fame ---------- */}
          {records.length > 0 && (
            <section aria-labelledby="rec-h" className="mb-10">
              <h2 id="rec-h" className="text-xl font-semibold mb-4">{p.recordsTitle}</h2>
              <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {records.map(({ key, row, value }) => (
                  <li key={key}>
                    <Link
                      href={`?sort=${key}#ranking`}
                      className="block h-full rounded-xl bg-surface border border-border p-4 hover:border-accent transition-colors"
                    >
                      <p className="text-xs text-muted">{p.records[key]}</p>
                      <p className="text-2xl font-bold mt-1">{value(row!)}</p>
                      <p className="text-sm font-medium break-all mt-1">{row!.site.host}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ---------- Ranking ---------- */}
          <section id="ranking" aria-labelledby="rank-h" className="mb-10 scroll-mt-20">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 id="rank-h" className="text-xl font-semibold">{p.sortLabel}</h2>
              <nav aria-label={p.sortLabel} className="flex flex-wrap gap-1">
                {Object.keys(SORTS).map((k) => (
                  <Link
                    key={k}
                    href={`?sort=${k}#ranking`}
                    aria-current={k === sort ? "page" : undefined}
                    className={`rounded-md px-3 py-1.5 text-sm border transition-colors ${
                      k === sort ? "border-accent text-accent font-semibold" : "border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {p.sorts[k]}
                  </Link>
                ))}
              </nav>
            </div>

            <div
              aria-hidden="true"
              className="hidden lg:grid grid-cols-[4rem_minmax(14rem,2fr)_8rem_10rem_5rem_5rem_6rem_4rem_8rem] gap-4 px-4 pb-2 text-xs text-muted"
            >
              <span>#</span>
              <span>{p.site}</span>
              <span>{p.trend}</span>
              <span>{p.visitors}</span>
              <span>{p.change}</span>
              <span>{p.ctr}</span>
              <span>{p.potential}</span>
              <span>{p.score}</span>
              <span>{p.todo}</span>
            </div>
            <ol className="space-y-2">
              {sorted.map((r, i) => {
                const top = r.recs[0];
                return (
                  <li key={r.site.id}>
                    <Link
                      href={href(r)}
                      className="grid grid-cols-[3rem_1fr_1fr] lg:grid-cols-[4rem_minmax(14rem,2fr)_8rem_10rem_5rem_5rem_6rem_4rem_8rem] gap-x-4 gap-y-2 items-center rounded-xl border border-border bg-surface px-4 py-3 hover:border-accent transition-colors"
                    >
                      <span className="flex flex-col items-start self-start row-span-5 lg:row-span-1 lg:self-center">
                        <span className="text-xl font-bold">{i + 1}.</span>
                        {sort === "visitors" && <RankMove row={r} t={p} />}
                      </span>
                      <span className="min-w-0 col-span-2 lg:col-span-1">
                        <span className="font-semibold break-all">{r.site.host}</span>
                        {top && <span className="block text-xs text-muted truncate">{recText(top)}</span>}
                      </span>
                      <span>
                        <span className={cell}>{p.trend}</span>
                        {r.visitors ? (
                          <Sparkline row={r} locale={locale} label={fill(p.sparkline, { min: Math.min(...r.daily), max: Math.max(...r.daily) })} />
                        ) : (
                          <span className="text-xs text-muted">{p.noData}</span>
                        )}
                      </span>
                      <span>
                        <span className={cell}>{p.visitors}</span>
                        <span className="font-semibold">{num.format(r.visitors)}</span>
                        <span className="block h-1.5 mt-1 rounded-full bg-surface-2" aria-hidden="true">
                          <span className="block h-full rounded-full bg-accent" style={{ width: `${(r.visitors / maxVisitors) * 100}%` }} />
                        </span>
                      </span>
                      <span>
                        <span className={cell}>{p.change}</span>
                        <Change value={r.change} />
                      </span>
                      <span>
                        <span className={cell}>{p.ctr}</span>
                        {r.gsc ? pct.format(r.gsc.ctr) : <span className="text-muted">—</span>}
                      </span>
                      <span>
                        <span className={cell}>{p.potential}</span>
                        {r.gsc ? num.format(r.gsc.potential) : <span className="text-muted">—</span>}
                      </span>
                      <span>
                        <span className={cell}>{p.score}</span>
                        {r.score !== null ? (
                          <span className="font-semibold" style={{ color: `var(--${bandOf(r.score)})` }}>{r.score}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </span>
                      <span className="text-xs font-semibold">
                        <span className={cell}>{p.todo}</span>
                        {counts(r).map((c) => (
                          <span key={c.text} className={`block ${c.cls}`}>{c.text}</span>
                        ))}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>

          <details className="mb-10 text-sm">
            <summary className="cursor-pointer text-muted">{p.legendTitle}</summary>
            <ul className="mt-3 space-y-2 text-muted max-w-3xl list-disc pl-5">
              {p.legend.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </details>

          <details className="rounded-xl border border-border bg-surface p-5" open={error === "url"}>
            <summary className="cursor-pointer font-semibold">{p.addAnother}</summary>
            <div className="mt-4">{addForm}</div>
          </details>
        </>
      )}
    </div>
  );
}
