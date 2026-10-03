import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { VERIFY_META, getSite } from "@/lib/sites";
import { SITE_URL } from "@/lib/site";
import { deleteSiteAction, saveGoalsAction, verifySiteAction } from "../../../account-actions";
import { SubmitButton } from "@/components/account/Forms";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; siteId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
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

export default async function SetupPage(props: Props) {
  const { locale, siteId } = await props.params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale);
  const site = getSite(user.id, siteId);
  if (!site) notFound();
  const { error, saved } = await props.searchParams;
  const t = getDict(locale).account;
  const s = t.setup;
  const hidden = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="siteId" value={site.id} />
    </>
  );
  const card = "rounded-xl border border-border bg-surface p-5 sm:p-6 mb-8";
  const snippet = `<script>window.ctr=window.ctr||function(){(ctr.q=ctr.q||[]).push(arguments)}</script>
<script defer src="${SITE_URL}/ctr.js" data-site="${site.id}"></script>`;

  return (
    <div>
      <section className={card} aria-labelledby="install-h">
        <h2 id="install-h" className="text-xl font-semibold mb-2">{s.installTitle}</h2>
        <p className="text-muted mb-4">{s.installText}</p>
        <Code>{snippet}</Code>

        <h2 className="text-xl font-semibold mb-2 mt-8">{s.consentTitle}</h2>
        <p className="text-muted mb-4">{s.consentText}</p>
        <Code>{`ctr('consent', true);`}</Code>
        <p className="text-sm text-muted mb-1.5">{s.consentRevoke}</p>
        <Code>{`ctr('consent', false);`}</Code>

        <h2 className="text-xl font-semibold mb-2 mt-8">{s.conversionsTitle}</h2>
        <p className="text-muted mb-4">{s.conversionsText}</p>
        <Code>{`<script>ctr('purchase', 1290);</script>`}</Code>
        <p className="text-sm text-muted mb-1.5">{s.eventText}</p>
        <Code>{`ctr('event', 'phone-click');`}</Code>

        <form action={saveGoalsAction} className="mt-6">
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
            {saved && <p role="status" className="text-sm text-score-green">{s.saved}</p>}
          </div>
        </form>

        <p className="text-sm text-muted mt-8 border-t border-border pt-4">{s.privacyNote}</p>
      </section>

      <section className={card} aria-labelledby="verify-h">
        {site.verified_at ? (
          <p id="verify-h" className="text-score-green">{s.verifyDone}</p>
        ) : (
          <>
            <h2 id="verify-h" className="text-xl font-semibold mb-2">{t.verifyTitle}</h2>
            <p className="text-muted mb-5">{t.verifyIntro}</p>
            <p className="text-sm font-medium mb-1.5">{t.verifyMetaLabel}</p>
            <Code>{`<meta name="${VERIFY_META}" content="${site.verify_token}">`}</Code>
            <p className="text-sm font-medium mb-1.5">{t.verifyDnsLabel}</p>
            <Code>{`${site.host}  TXT  "${VERIFY_META}=${site.verify_token}"`}</Code>
            <p className="text-sm text-muted mb-5 -mt-2">{t.verifyDnsHint}</p>
            <form action={verifySiteAction}>
              {hidden}
              <SubmitButton>{t.verifySubmit}</SubmitButton>
            </form>
            {error === "verify" && (
              <p role="alert" className="text-sm text-score-red mt-3">{t.verifyFailed}</p>
            )}
          </>
        )}
      </section>

      {/* Two steps on purpose: removing a site deletes its statistics for good. */}
      <details className="pt-4 border-t border-border">
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
