import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai";
import { PRICES, creditOverview, scheduledCharges, type CreditKind } from "@/lib/credits";
import { fill } from "@/components/account/Ui";
import { CountUp } from "@/components/account/CountUp";
import { BoltIcon, CalendarIcon, ChartIcon, CoinsIcon, GlobeIcon, KIND_ICON, RefreshIcon } from "@/components/account/Icons";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isLocale(locale)) return {};
  return { title: getDict(locale).account.credits.title, robots: { index: false } };
}

/** Remaining credits as a ring; the arc fills in on load. */
function Ring({ value, max, tone }: { value: number; max: number; tone: string }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const share = max ? Math.min(1, value / max) : 0;
  return (
    <svg viewBox="0 0 180 180" className="h-44 w-44 -rotate-90" aria-hidden="true">
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="14" />
      <circle
        cx="90"
        cy="90"
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - share)}
        className="anim-ring"
        style={{ ["--ring-full" as string]: `${c}` }}
      />
    </svg>
  );
}

function Tile({ icon, label, children, sub, delay = 0 }: { icon: React.ReactNode; label: string; children: React.ReactNode; sub?: React.ReactNode; delay?: number }) {
  return (
    <div className="anim-rise rounded-xl border border-border bg-surface p-4" style={{ animationDelay: `${delay}ms` }}>
      <p className="flex items-center gap-2 text-sm text-muted">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-2 text-accent">{icon}</span>
        {label}
      </p>
      <p className="text-2xl font-bold mt-2">{children}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

/** Vertical bars with a native tooltip per bar; zero days keep a sliver so the rhythm reads. */
function Columns({ data, label, desc }: { data: { key: string; label: string; value: number }[]; label: (v: number) => string; desc: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 100 / data.length;
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-32" role="img" aria-label={desc}>
      {data.map((d, i) => {
        const h = Math.max(d.value ? 1.5 : 0.4, (d.value / max) * 38);
        return (
          <rect
            key={d.key}
            x={i * w + w * 0.18}
            y={40 - h}
            width={w * 0.64}
            height={h}
            rx={Math.min(1.2, w * 0.2)}
            fill={d.value ? "var(--accent)" : "var(--border)"}
            className="anim-grow-y"
            style={{ animationDelay: `${i * 25}ms` }}
          >
            <title>{`${d.label}: ${label(d.value)}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

export default async function CreditsPage(props: Props) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale);
  const dict = getDict(locale);
  const t = dict.account.credits;
  const o = creditOverview(user.id);
  const schedule = scheduledCharges(user.id);
  const num = new Intl.NumberFormat(locale);
  const dayFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric" });
  const dateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" });
  const monthFmt = new Intl.DateTimeFormat(locale, { month: "short" });
  const timeFmt = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });

  const share = o.allowance ? o.remaining / o.allowance : 0;
  const statusKey = o.remaining === 0 ? "out" : share <= 0.2 ? "low" : "ok";
  const tone = { ok: "var(--green)", low: "var(--orange)", out: "var(--red)" }[statusKey];
  const scheduledTotal = schedule.reduce((a, x) => a + x.credits * x.runsThisMonth, 0);
  const forecast = o.used + scheduledTotal;
  const maxKind = Math.max(1, ...o.byKind.map((k) => k.credits));
  const plural = new Intl.PluralRules(locale);
  const unitFor = (n: number) => t.units[plural.select(n)] ?? t.unit;
  const credits = (n: number) => `${num.format(n)} ${unitFor(n)}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Link href={`/${locale}/dashboard`} className="text-sm text-muted hover:text-foreground">
        ← {dict.account.back}
      </Link>
      <h1 className="text-3xl font-bold mt-3 mb-2 flex items-center gap-3">
        <span className="anim-float inline-flex text-accent">
          <CoinsIcon className="h-8 w-8" />
        </span>
        {t.title}
      </h1>
      <p className="text-muted mb-8 max-w-3xl">{t.intro}</p>
      {!aiConfigured() && (
        <p className="mb-6 rounded-lg border border-score-orange text-score-orange px-4 py-3 text-sm">{t.notConfigured}</p>
      )}

      {/* ---------- Balance ---------- */}
      <section aria-labelledby="bal-h" className="grid lg:grid-cols-[auto_1fr] gap-6 items-center rounded-2xl border border-border bg-surface p-6 mb-8">
        <h2 id="bal-h" className="sr-only">{t.title}</h2>
        <div className="relative mx-auto">
          <Ring value={o.remaining} max={o.allowance} tone={tone} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-bold">
              <CountUp to={o.remaining} locale={locale} />
            </span>
            <span className="text-sm text-muted">{t.remaining}</span>
            <span className="text-xs text-muted">{fill(t.of, { n: num.format(o.allowance) })}</span>
          </div>
        </div>
        <div>
          <p className="font-semibold text-lg mb-4" style={{ color: tone }}>
            {statusKey === "ok" ? "●" : "▲"} {t.status[statusKey]}
          </p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <Tile icon={<ChartIcon className="h-4 w-4" />} label={t.used} delay={0}>
              <CountUp to={o.used} locale={locale} />
            </Tile>
            <Tile icon={<RefreshIcon className="h-4 w-4" />} label={fill(t.reset, { date: dateFmt.format(o.reset) })} delay={80}>
              {fill(t.resetIn, { n: o.daysToReset })}
            </Tile>
            <Tile icon={<CalendarIcon className="h-4 w-4" />} label={t.scheduled} sub={t.scheduledHelp} delay={160}>
              {num.format(scheduledTotal)}
            </Tile>
            <Tile
              icon={<BoltIcon className="h-4 w-4" />}
              label={t.forecast}
              sub={<span className={forecast > o.allowance ? "text-score-orange" : "text-score-green"}>{forecast > o.allowance ? t.forecastOver : t.forecastOk}</span>}
              delay={240}
            >
              {num.format(forecast)} <span className="text-base font-normal text-muted">/ {num.format(o.allowance)}</span>
            </Tile>
          </div>
          <p className="text-xs text-muted mt-3">{t.allowanceNote}</p>
        </div>
      </section>

      {/* ---------- Where it went + charts ---------- */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <section aria-labelledby="kind-h" className="rounded-2xl border border-border bg-surface p-6">
          <h2 id="kind-h" className="text-lg font-semibold mb-4">{t.byKindTitle}</h2>
          {o.byKind.length === 0 ? (
            <p className="text-muted">{t.byKindEmpty}</p>
          ) : (
            <ul className="space-y-4">
              {o.byKind.map((k, i) => {
                const Icon = KIND_ICON[k.kind as CreditKind] ?? CoinsIcon;
                return (
                  <li key={k.kind}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-accent" />
                        {t.kinds[k.kind]?.name ?? k.kind}
                        <span className="text-muted">{fill(t.times, { n: k.count })}</span>
                      </span>
                      <span className="font-semibold">{credits(k.credits)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
                      <div className="anim-grow-x h-full rounded-full bg-accent" style={{ width: `${(k.credits / maxKind) * 100}%`, animationDelay: `${i * 90}ms` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="daily-h" className="rounded-2xl border border-border bg-surface p-6">
          <h2 id="daily-h" className="text-lg font-semibold mb-4">{t.dailyTitle}</h2>
          <Columns
            data={o.daily.map((d) => ({ key: d.day, label: dayFmt.format(new Date(d.day)), value: d.credits }))}
            label={credits}
            desc={t.chartDesc}
          />
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>{o.daily[0] && dayFmt.format(new Date(o.daily[0].day))}</span>
            <span>{o.daily.length > 0 && dayFmt.format(new Date(o.daily[o.daily.length - 1].day))}</span>
          </div>
          <h3 className="font-semibold mt-6 mb-3">{t.monthsTitle}</h3>
          <Columns
            data={o.months.map((m) => ({ key: m.month, label: monthFmt.format(new Date(`${m.month}-01`)), value: m.credits }))}
            label={credits}
            desc={t.chartDesc}
          />
          <div className="grid text-xs text-muted mt-1" style={{ gridTemplateColumns: `repeat(${o.months.length}, 1fr)` }}>
            {o.months.map((m) => (
              <span key={m.month} className="text-center">{monthFmt.format(new Date(`${m.month}-01`))}</span>
            ))}
          </div>
        </section>
      </div>

      {/* ---------- Price list ---------- */}
      <section aria-labelledby="price-h" className="mb-8">
        <h2 id="price-h" className="text-lg font-semibold mb-4">{t.priceTitle}</h2>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(PRICES) as CreditKind[]).map((k, i) => {
            const Icon = KIND_ICON[k];
            return (
              <li key={k} className="anim-rise rounded-2xl border border-border bg-surface p-5 flex flex-col" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-accent">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="text-right">
                    <span className="block text-2xl font-bold">{PRICES[k]}</span>
                    <span className="block text-xs text-muted">{unitFor(PRICES[k])} · {t.perAction}</span>
                  </span>
                </div>
                <p className="font-semibold">{t.kinds[k].name}</p>
                <p className="text-sm text-muted mt-1 flex-1">{t.kinds[k].desc}</p>
                {t.kinds[k].auto && (
                  <p className="text-xs text-accent mt-3 flex items-center gap-1.5">
                    <RefreshIcon className="h-3.5 w-3.5" />
                    {t.kinds[k].auto}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------- Automatic charges + measured usage ---------- */}
      <div className="grid lg:grid-cols-[3fr_2fr] gap-6 mb-8">
        <section aria-labelledby="sch-h" className="rounded-2xl border border-border bg-surface p-6">
          <h2 id="sch-h" className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-accent" />
            {t.scheduleTitle}
          </h2>
          {schedule.length === 0 ? (
            <p className="text-muted">{t.scheduleEmpty}</p>
          ) : (
            <ol className="relative border-l-2 border-border ml-2 space-y-5">
              {schedule.map((x) => (
                <li key={x.siteId} className="pl-5 relative">
                  <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-accent" aria-hidden="true" />
                  <p className="font-semibold">
                    <Link href={`/${locale}/dashboard/${x.siteId}/ai`} className="hover:underline">{x.host}</Link>
                    <span className="ml-2 text-sm font-normal text-muted">{fill(t.next, { date: dateFmt.format(new Date(x.next)) })}</span>
                  </p>
                  <p className="text-sm text-muted">{fill(t.scheduleRow, { credits: credits(x.credits), runs: x.runsThisMonth })}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="tok-h" className="rounded-2xl border border-border bg-surface p-6">
          <h2 id="tok-h" className="text-lg font-semibold mb-1">{t.tokensTitle}</h2>
          <p className="text-xs text-muted mb-4">{t.tokensHelp}</p>
          <dl className="space-y-3">
            {[
              { icon: <ChartIcon className="h-4 w-4" />, label: t.inputTokens, value: o.tokens.input },
              { icon: <BoltIcon className="h-4 w-4" />, label: t.outputTokens, value: o.tokens.output },
              { icon: <GlobeIcon className="h-4 w-4" />, label: t.searches, value: o.tokens.searches },
            ].map((x) => (
              <div key={x.label} className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-sm text-muted">
                  <span className="text-accent">{x.icon}</span>
                  {x.label}
                </dt>
                <dd className="font-semibold">
                  <CountUp to={x.value} locale={locale} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {/* ---------- Recent charges ---------- */}
      <section aria-labelledby="rec-h" className="rounded-2xl border border-border bg-surface p-6">
        <h2 id="rec-h" className="text-lg font-semibold mb-4">{t.recentTitle}</h2>
        {o.recent.length === 0 ? (
          <p className="text-muted">{t.recentEmpty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted text-left">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">{t.colWhen}</th>
                  <th scope="col" className="py-2 pr-3 font-medium">{t.colWhat}</th>
                  <th scope="col" className="py-2 pr-3 font-medium">{t.colSite}</th>
                  <th scope="col" className="py-2 pr-3 font-medium text-right">{t.colTokens}</th>
                  <th scope="col" className="py-2 font-medium text-right">{t.colCredits}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {o.recent.map((r, i) => {
                  const Icon = KIND_ICON[r.kind] ?? CoinsIcon;
                  return (
                    <tr key={i}>
                      <td className="py-2 pr-3 whitespace-nowrap text-muted">{timeFmt.format(new Date(r.ts))}</td>
                      <td className="py-2 pr-3">
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-accent" />
                          {t.kinds[r.kind]?.name ?? r.kind}
                        </span>
                      </td>
                      <td className="py-2 pr-3 break-all">{r.host ?? "—"}</td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap text-muted">
                        {num.format(r.input + r.output)}
                        {r.searches > 0 && <span className="ml-1">· <GlobeIcon className="inline h-3.5 w-3.5" /> {r.searches}</span>}
                      </td>
                      <td className="py-2 text-right font-semibold whitespace-nowrap text-score-red">−{r.credits}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
