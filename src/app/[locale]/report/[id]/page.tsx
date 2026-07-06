import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getReport } from "@/lib/db";
import { CATALOG, ROLE_INFO } from "@/lib/audit/catalog";
import { MANUAL_CHECKLIST } from "@/lib/audit/checks/a11y";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { ScoreGauge, bandOf } from "@/components/report/ScoreGauge";
import { FindingsExplorer, type UiFinding } from "@/components/report/FindingsExplorer";
import { FixPrompt } from "@/components/report/FixPrompt";
import { buildFixPrompt } from "@/lib/audit/fixPrompt";
import { ShareBar } from "@/components/report/ShareBar";
import { ContactForm } from "@/components/report/ContactForm";
import { AiSelfTest } from "@/components/report/AiSelfTest";
import { AuditForm } from "@/components/AuditForm";
import { CREATOR } from "@/lib/site";
import type { Report } from "@/lib/audit/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, id } = await props.params;
  if (!isLocale(locale)) return {};
  const dict = getDict(locale);
  const report = getReport(id);
  if (!report) return { title: dict.report.notFoundTitle };
  const host = new URL(report.finalUrl).hostname;
  return {
    title: `${host} — ${report.overall}/100 | ${dict.report.title}`,
    description: `${dict.report.pillarNames.ai} ${report.pillars.ai.score}, ${dict.report.pillarNames.seo} ${report.pillars.seo.score}, ${dict.report.pillarNames.a11y} ${report.pillars.a11y.score}.`,
    robots: { index: false }, // reports are private-by-link
    alternates: {
      canonical: `/${locale}/report/${id}`,
      languages: { en: `/en/report/${id}`, cs: `/cs/report/${id}` },
    },
  };
}

function toUiFindings(report: Report, locale: Locale): UiFinding[] {
  return report.findings.map((f) => {
    const def = CATALOG[f.checkId];
    return {
      checkId: f.checkId,
      pillar: f.pillar,
      priority: f.priority,
      quickWin: f.quickWin,
      confidence: f.confidence,
      roles: f.roles.map((r) => ({ id: r, label: ROLE_INFO[r]?.[locale] ?? r })),
      title: def?.title[locale] ?? f.checkId,
      why: def?.why[locale] ?? "",
      fix: def?.fix[locale] ?? "",
      evidence: f.evidence.map((e) => e[locale]),
      wcag: f.wcag ? `${f.wcag.criterion} (${f.wcag.level})` : undefined,
    };
  });
}

function DeltaBadge({ prev, curr }: { prev: number; curr: number }) {
  const d = curr - prev;
  if (d === 0) return <span className="text-muted">±0</span>;
  return d > 0 ? (
    <span className="text-score-green font-semibold">▲ +{d}</span>
  ) : (
    <span className="text-score-red font-semibold">▼ {d}</span>
  );
}

export default async function ReportPage(props: Props) {
  const { locale: rawLocale, id } = await props.params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const dict = getDict(locale);
  const t = dict.report;

  const report = getReport(id);
  if (!report) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold mb-3">{t.notFoundTitle}</h1>
        <p className="text-muted mb-6">{t.notFoundText}</p>
        <Link
          href={`/${locale}`}
          className="inline-block rounded-lg bg-accent text-accent-contrast font-semibold px-6 py-3 hover:bg-accent-strong transition-colors"
        >
          {t.runNew}
        </Link>
      </div>
    );
  }

  const prev = report.prevId ? getReport(report.prevId) : null;
  const findings = toUiFindings(report, locale);
  const host = new URL(report.finalUrl).hostname;
  const dateFmt = new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const pillarKeys = ["ai", "seo", "a11y"] as const;
  const roleOptions = Object.entries(ROLE_INFO).map(([idKey, v]) => ({
    id: idKey,
    label: v[locale],
  }));

  const passedByPillar = pillarKeys.map((pk) => ({
    pillar: pk,
    items: report.passed
      .filter((p) => p.pillar === pk && CATALOG[p.checkId])
      .map((p) => CATALOG[p.checkId].passTitle[locale]),
  }));

  const conf = report.a11y.conformance;
  const perf = report.perf;

  const fixPromptText = buildFixPrompt(report.finalUrl, findings, {
    lead: t.fixPrompt.lead,
    rules: t.fixPrompt.rules,
    findingsHeading: t.fixPrompt.findingsHeading,
    noFindings: t.fixPrompt.noFindings,
    whyLabel: t.fixPrompt.whyLabel,
    evidenceLabel: t.fixPrompt.evidenceLabel,
    fixLabel: t.fixPrompt.fixLabel,
    wcagLabel: t.fixPrompt.wcagLabel,
    whoLabel: t.fixPrompt.whoLabel,
    measured: t.finding.measured,
    estimated: t.finding.estimated,
    notTested: t.finding.notTested,
    closing: t.fixPrompt.closing,
    priorities: t.priorities,
    pillarNames: t.pillarNames,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-10">
      {/* Header */}
      <header>
        <p className="text-sm text-muted">
          {t.for}{" "}
          <a href={report.finalUrl} rel="noopener nofollow" className="text-accent hover:underline break-all">
            {report.finalUrl}
          </a>
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold mt-1 break-words">
          {report.siteTitle || host}
        </h1>
        <p className="text-sm text-muted mt-2">
          {t.scanned} {dateFmt.format(new Date(report.createdAt))} · {t.duration}{" "}
          {(report.durationMs / 1000).toFixed(1)} s
        </p>
      </header>

      {/* Scores */}
      <section
        aria-label={t.pillarScores}
        className="rounded-2xl border border-border bg-surface p-6 sm:p-8"
      >
        <div className="flex flex-wrap justify-center gap-8 sm:gap-12 items-center">
          <ScoreGauge
            score={report.overall}
            label={t.overall}
            bandLabel={t.bands[bandOf(report.overall)]}
            size={160}
          />
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
            {pillarKeys.map((pk) => (
              <ScoreGauge
                key={pk}
                score={report.pillars[pk].score}
                label={t.pillarNames[pk]}
                bandLabel={t.bands[bandOf(report.pillars[pk].score)]}
                size={116}
              />
            ))}
          </div>
        </div>

        {prev && (
          <div className="mt-6 pt-5 border-t border-border">
            <h2 className="font-semibold mb-2">{t.compare.title}</h2>
            <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted">{t.compare.overall}:</dt>
                <dd>
                  {prev.overall} → {report.overall} <DeltaBadge prev={prev.overall} curr={report.overall} />
                </dd>
              </div>
              {pillarKeys.map((pk) => (
                <div key={pk} className="flex gap-2">
                  <dt className="text-muted">{t.pillarNames[pk]}:</dt>
                  <dd>
                    {prev.pillars[pk].score} → {report.pillars[pk].score}{" "}
                    <DeltaBadge prev={prev.pillars[pk].score} curr={report.pillars[pk].score} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>

      {/* Fix it with AI — one-click prompt for an AI coding assistant */}
      <FixPrompt
        prompt={fixPromptText}
        labels={{
          title: t.fixPrompt.title,
          intro: t.fixPrompt.intro,
          copy: t.fixPrompt.copy,
          copied: t.fixPrompt.copied,
          hint: t.fixPrompt.hint,
          show: t.fixPrompt.show,
          hide: t.fixPrompt.hide,
        }}
      />

      {/* Findings */}
      <FindingsExplorer
        reportId={report.id}
        findings={findings}
        roleOptions={roleOptions}
        labels={{
          fixFirst: t.fixFirst,
          fixFirstNote: t.fixFirstNote,
          allFindings: t.allFindings,
          filters: t.filters,
          finding: t.finding,
          priorities: t.priorities,
          pillarNames: t.pillarNames,
        }}
      />

      {/* Accessibility conformance + manual checklist */}
      <section aria-labelledby="conf-title" className="rounded-xl border border-border bg-surface p-6">
        <h2 id="conf-title" className="text-xl font-bold mb-2">
          {t.conformance.title}
        </h2>
        <p className="text-2xl font-semibold mb-3">
          <span
            className={
              conf === "below-a"
                ? "text-score-red"
                : conf === "a"
                  ? "text-score-orange"
                  : conf === "aa"
                    ? "text-score-green"
                    : "text-muted"
            }
          >
            {t.conformance[conf]}
          </span>
        </p>
        <p className="text-sm text-muted leading-relaxed mb-2">{t.conformance.note}</p>
        <p className="text-sm text-muted leading-relaxed">{t.conformance.legal}</p>

        <h3 className="text-lg font-bold mt-6 mb-1">{t.manualTitle}</h3>
        <p className="text-sm text-muted mb-4">{t.manualNote}</p>
        <div className="space-y-2">
          {MANUAL_CHECKLIST.map((item) => (
            <details key={item.id} className="group rounded-lg border border-border bg-surface-2/50">
              <summary className="flex items-center gap-2 cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-90 select-none">
                  ▸
                </span>
                <span className="font-medium text-sm flex-1">{item[locale].title}</span>
                <span className="text-xs font-mono text-muted whitespace-nowrap">WCAG {item.wcag}</span>
              </summary>
              <div className="px-4 pb-4 pt-1 text-sm text-muted leading-relaxed">
                <span className="font-semibold text-foreground">{t.manualHow}: </span>
                {item[locale].how}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Honest AI testing note */}
      <section aria-labelledby="ai-note" className="rounded-xl border border-dashed border-accent/50 bg-surface p-6">
        <h2 id="ai-note" className="text-lg font-bold mb-2">
          {t.aiNote.title}
        </h2>
        <p className="text-sm text-muted leading-relaxed mb-2">{t.aiNote.text}</p>
        <p className="text-sm leading-relaxed">
          <a href="#hire" className="text-accent hover:underline font-medium">
            {t.aiNote.cta}
          </a>
        </p>
        <AiSelfTest labels={t.aiNote.selfTest} host={host} />
      </section>

      {/* Performance detail */}
      <section aria-labelledby="perf-title" className="rounded-xl border border-border bg-surface p-6">
        <h2 id="perf-title" className="text-lg font-bold mb-3">
          {perf.source === "psi" ? t.perf.titleMeasured : t.perf.titleBasic}
        </h2>
        {perf.source === "basic" && (
          <p className="text-sm text-muted mb-4">{t.perf.basicNote}</p>
        )}
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {perf.source === "psi" && perf.performanceScore !== undefined && (
            <div>
              <dt className="text-muted">{t.perf.score}</dt>
              <dd className="text-xl font-semibold">{perf.performanceScore}/100</dd>
            </div>
          )}
          {perf.source === "psi" && perf.lcpMs !== undefined && (
            <div>
              <dt className="text-muted">{t.perf.lcp}</dt>
              <dd className="text-xl font-semibold">{(perf.lcpMs / 1000).toFixed(1)} s</dd>
            </div>
          )}
          {perf.source === "psi" && perf.cls !== undefined && (
            <div>
              <dt className="text-muted">{t.perf.cls}</dt>
              <dd className="text-xl font-semibold">{perf.cls}</dd>
            </div>
          )}
          {perf.ttfbMs !== undefined && (
            <div>
              <dt className="text-muted">{t.perf.ttfb}</dt>
              <dd className="text-xl font-semibold">{(perf.ttfbMs / 1000).toFixed(2)} s</dd>
            </div>
          )}
          {perf.htmlBytes !== undefined && (
            <div>
              <dt className="text-muted">{t.perf.htmlSize}</dt>
              <dd className="text-xl font-semibold">{Math.round(perf.htmlBytes / 1024)} kB</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Passed checks */}
      <section aria-labelledby="passed-title">
        <h2 id="passed-title" className="text-xl font-bold mb-1">
          {t.passedTitle}{" "}
          <span className="text-muted font-normal text-base">
            ({report.passed.length} {t.passedNote})
          </span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-3 mt-4">
          {passedByPillar.map(({ pillar, items }) => (
            <div key={pillar} className="rounded-xl border border-border bg-surface p-5">
              <h3 className="font-semibold text-sm mb-3">{t.pillarNames[pillar]}</h3>
              <ul className="space-y-1.5 text-sm text-muted">
                {items.map((title, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden="true" className="text-score-green">✓</span>
                    {title}
                  </li>
                ))}
                {items.length === 0 && <li>—</li>}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Share + rescan */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ShareBar labels={t.share} />
        <div className="no-print rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold mb-3">{t.share.rescan}</h2>
          <AuditForm
            locale={locale}
            compact
            prefillUrl={report.finalUrl}
            prevId={report.id}
            rescanLabel={t.share.rescan}
            rescanningLabel={t.share.rescanning}
            labels={{
              urlLabel: dict.home.urlLabel,
              urlPlaceholder: dict.home.urlPlaceholder,
              submit: t.share.rescan,
              submitting: t.share.rescanning,
              progress: dict.home.progress,
              errors: {
                invalid: dict.home.errorInvalid,
                unreachable: dict.home.errorUnreachable,
                siteError: dict.home.errorSiteError,
                rateLimit: dict.home.errorRateLimit,
                generic: dict.home.errorGeneric,
              },
            }}
          />
        </div>
      </div>

      <details className="no-print rounded-xl border border-dashed border-border bg-surface p-5">
        <summary className="font-semibold cursor-pointer">{t.share.staleTitle}</summary>
        <p className="text-sm text-muted leading-relaxed mt-3">{t.share.staleText}</p>
      </details>

      {/* Hire form */}
      <ContactForm labels={t.hire} reportId={report.id} contactEmail={CREATOR.email} />
    </div>
  );
}
