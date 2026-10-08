import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { getSite } from "@/lib/sites";
import {
  checkSetupAction, deleteSiteAction, disconnectGoogleAction, saveGoalsAction, setPropertyAction, verifySiteAction,
} from "../../../account-actions";
import { googleConfigured, hasGoogle, listProperties } from "@/lib/google";
import { OPTIONAL, STEPS, buildSetupPrompt, setupStatus, siteSnippets, type StepId, type StepState } from "@/lib/setup";
import { SubmitButton } from "@/components/account/Forms";
import { CopyButton } from "@/components/account/CopyButton";
import { Flash, Hidden, fill } from "@/components/account/Ui";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; siteId: string }>;
  searchParams: Promise<{ error?: string; saved?: string; google?: string; checked?: string; msg?: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isLocale(locale)) return {};
  return { title: getDict(locale).account.tabs.setup, robots: { index: false } };
}

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-surface-2 rounded-lg p-3 text-sm overflow-x-auto mb-4">
      <code>{children}</code>
    </pre>
  );
}

const STATE_STYLE: Record<StepState, { ring: string; text: string; icon: string }> = {
  done: { ring: "border-score-green bg-score-green/15 text-score-green", text: "text-score-green", icon: "✓" },
  partial: { ring: "border-score-orange text-score-orange", text: "text-score-orange", icon: "…" },
  todo: { ring: "border-border text-muted", text: "text-muted", icon: "" },
};

/** A setup step: open while it needs doing, collapsed (and green) once it's verified. */
function Step({
  n,
  id,
  state,
  title,
  note,
  stateLabel,
  optional,
  children,
}: {
  n: number;
  id: StepId;
  state: StepState;
  title: string;
  note: string;
  stateLabel: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const st = STATE_STYLE[state];
  return (
    <details
      id={`step-${id}`}
      open={state !== "done" && !(optional && state === "todo")}
      className={`group rounded-xl border bg-surface mb-3 scroll-mt-20 ${state === "done" ? "border-score-green/40" : "border-border"}`}
    >
      <summary className="flex items-center gap-4 p-4 sm:px-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-bold ${st.ring}`}>
          {st.icon || n}
        </span>
        <span className="flex-1 min-w-0">
          <span className="font-semibold">
            {title}
          </span>
          <span className="block text-sm text-muted">{note}</span>
        </span>
        <span className={`text-sm font-semibold whitespace-nowrap ${st.text}`}>{stateLabel}</span>
        <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-border">{children}</div>
    </details>
  );
}

export default async function SetupPage(props: Props) {
  const { locale, siteId } = await props.params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale);
  const site = getSite(user.id, siteId);
  if (!site) notFound();
  const sp = await props.searchParams;
  const dict = getDict(locale);
  const t = dict.account;
  const s = t.setup;
  const hidden = <Hidden locale={locale} siteId={site.id} />;
  const snip = siteSnippets(site);
  const status = setupStatus(site, user.id);
  const prompt = buildSetupPrompt(site, status, s.prompt);
  const required = STEPS.filter((x) => !OPTIONAL.includes(x));
  const doneCount = required.filter((x) => status[x] === "done").length;

  const googleConnected = googleConfigured() && hasGoogle(user.id);
  let properties: string[] = [];
  if (googleConnected) {
    try {
      properties = await listProperties(user.id);
    } catch {
      /* shown as "no matching property" */
    }
  }

  const step = (id: StepId, n: number, children: React.ReactNode) => (
    <Step
      key={id}
      n={n}
      id={id}
      state={status[id]}
      title={s.stepTitles[id]}
      note={s.stepNotes[`${id}_${status[id]}`] ?? s.stepNotes[`${id}_todo`]}
      stateLabel={OPTIONAL.includes(id) && status[id] === "todo" ? s.states.optional : s.states[status[id]]}
      optional={OPTIONAL.includes(id)}
    >
      {children}
    </Step>
  );

  const bodies: Record<StepId, React.ReactNode> = {
    verify: (
      <>
        <p className="text-muted my-3">{t.verifyIntro}</p>
        <p className="text-sm font-medium mb-1.5">{t.verifyMetaLabel}</p>
        <Code>{snip.verifyMeta}</Code>
        <p className="text-sm font-medium mb-1.5">{t.verifyDnsLabel}</p>
        <Code>{snip.verifyDns}</Code>
        <p className="text-sm text-muted mb-4 -mt-2">{t.verifyDnsHint}</p>
        {status.verify !== "done" && (
          <form action={verifySiteAction}>
            {hidden}
            <SubmitButton variant="secondary">{t.verifySubmit}</SubmitButton>
          </form>
        )}
        {sp.error === "verify" && <p role="alert" className="text-sm text-score-red mt-3">{t.verifyFailed}</p>}
      </>
    ),
    snippet: (
      <>
        <p className="text-muted my-3">{s.installText}</p>
        <Code>{`${snip.stub}\n${snip.script}`}</Code>
        <p className="text-sm text-muted">{s.cspNote.replace("{host}", new URL(snip.origin).host)}</p>
      </>
    ),
    consent: (
      <>
        <p className="text-muted my-3">{s.consentText}</p>
        <Code>{`ctr('consent', true);`}</Code>
        <p className="text-sm text-muted mb-1.5">{s.consentRevoke}</p>
        <Code>{`ctr('consent', false);`}</Code>
        <p className="text-sm text-muted">{s.privacyNote}</p>
      </>
    ),
    conversions: (
      <>
        <p className="text-muted my-3">{s.conversionsText}</p>
        <Code>{`<script>ctr('purchase', 1290);</script>`}</Code>
        <p className="text-sm text-muted mb-1.5">{s.eventText}</p>
        <Code>{`ctr('event', 'phone-click');`}</Code>
        <form action={saveGoalsAction} className="mt-2">
          {hidden}
          <label htmlFor="goals" className="block font-medium mb-1">{s.goalsLabel}</label>
          <p id="goals-help" className="text-sm text-muted mb-2">{s.goalsHelp}</p>
          <textarea
            id="goals"
            name="goals"
            rows={3}
            defaultValue={site.goal_paths}
            placeholder={s.goalsPlaceholder}
            aria-describedby="goals-help"
            className="w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-foreground placeholder:text-muted/60 focus:border-accent mb-3 font-mono text-sm"
          />
          <div className="flex items-center gap-3">
            <SubmitButton variant="secondary">{s.goalsSave}</SubmitButton>
            {sp.saved && <p role="status" className="text-sm text-score-green">{s.saved}</p>}
          </div>
        </form>
      </>
    ),
    google: (
      <>
        <p className="text-muted my-3">{s.googleText}</p>
        {sp.google === "error" && <p role="alert" className="text-sm text-score-red mb-4">{s.googleError}</p>}
        {!googleConfigured() ? (
          <p className="text-sm text-score-orange">{s.googleMissingConfig}</p>
        ) : !googleConnected ? (
          <a
            href={`/api/google/connect?locale=${locale}&site=${site.id}`}
            className="inline-block rounded-lg bg-accent text-accent-contrast font-semibold px-5 py-2.5 hover:bg-accent-strong"
          >
            {s.googleConnect}
          </a>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <p className="text-score-green">{s.googleConnected}</p>
              <form action={disconnectGoogleAction}>
                {hidden}
                <button type="submit" className="text-sm text-muted underline hover:text-foreground">{s.googleDisconnect}</button>
              </form>
            </div>
            {properties.length === 0 ? (
              <p className="text-sm text-score-orange">{s.propertyNone}</p>
            ) : (
              <form action={setPropertyAction} className="flex flex-wrap items-end gap-3">
                {hidden}
                <div>
                  <label htmlFor="property" className="block text-sm font-medium mb-1.5">{s.propertyLabel}</label>
                  <select id="property" name="property" defaultValue={site.gsc_property ?? ""} className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                    {!site.gsc_property && <option value="">—</option>}
                    {properties.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <SubmitButton variant="secondary">{s.propertySave}</SubmitButton>
              </form>
            )}
          </>
        )}
      </>
    ),
    indexnow: (
      <>
        <p className="text-muted my-3">{s.indexNowText}</p>
        <Code>{snip.indexNowFile}</Code>
        <p className="text-sm text-muted mb-1.5">{s.indexNowContent}</p>
        <Code>{snip.indexNowKey}</Code>
        <p className="text-sm text-muted break-all">
          <a href={snip.indexNowUrl} rel="noopener" className="text-accent hover:underline">{snip.indexNowUrl}</a>
        </p>
      </>
    ),
    bots: (
      <>
        <p className="text-muted my-3">{s.botsText}</p>
        <p className="text-sm mb-1.5">{s.botsPhp}</p>
        <Code>{snip.php}</Code>
        <p className="text-sm mb-1.5">{s.botsNext}</p>
        <Code>{snip.next}</Code>
        <p className="text-sm text-score-orange">{s.botsSecret}</p>
      </>
    ),
  };

  return (
    <div>
      <Flash msg={sp.msg} text={sp.msg ? t.msgs[sp.msg] : undefined} />

      {/* ---------- Progress + the two big buttons ---------- */}
      <section aria-labelledby="wiz-h" className="rounded-xl border border-border bg-surface p-5 sm:p-6 mb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
          <h2 id="wiz-h" className="text-xl font-semibold">{s.wizardTitle}</h2>
          <p className={`font-semibold ${doneCount === required.length ? "text-score-green" : "text-muted"}`}>
            {fill(s.progress, { done: doneCount, total: required.length })}
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={required.length}
          aria-valuenow={doneCount}
          aria-label={fill(s.progress, { done: doneCount, total: required.length })}
          className="h-2 rounded-full bg-surface-2 mb-5 overflow-hidden"
        >
          <div className="h-full rounded-full bg-score-green transition-all" style={{ width: `${(doneCount / required.length) * 100}%` }} />
        </div>

        <div className="grid md:grid-cols-[1fr_auto] gap-5 items-start">
          <div>
            <h3 className="font-semibold mb-1">{s.aiTitle}</h3>
            <p className="text-sm text-muted">{prompt ? s.aiText : s.aiAllDone}</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            {prompt && <CopyButton text={prompt} label={s.aiCopy} copied={s.aiCopied} />}
            <form action={checkSetupAction}>
              {hidden}
              <SubmitButton variant="secondary" pendingLabel={s.checking}>{s.checkButton}</SubmitButton>
            </form>
          </div>
        </div>
        {prompt && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted">{s.aiShow}</summary>
            <pre className="mt-2 bg-surface-2 rounded-lg p-3 text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">{prompt}</pre>
          </details>
        )}
        {sp.checked && <p role="status" className="text-sm text-muted mt-4">{s.checked}</p>}
      </section>

      {/* ---------- Steps ---------- */}
      {STEPS.map((id, i) => step(id, i + 1, bodies[id]))}

      {/* Two steps on purpose: removing a site deletes its statistics for good. */}
      <details className="mt-8 pt-4 border-t border-border">
        <summary className="cursor-pointer text-sm text-score-red w-fit">{t.deleteSite}</summary>
        <form action={deleteSiteAction} className="mt-3">
          {hidden}
          <p className="text-sm text-muted mb-3">{t.deleteNote}</p>
          <SubmitButton variant="danger">{t.deleteSite}</SubmitButton>
        </form>
      </details>
    </div>
  );
}
