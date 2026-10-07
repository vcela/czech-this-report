import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { VERIFY_META, getSite } from "@/lib/sites";
import { SITE_URL } from "@/lib/site";
import {
  deleteSiteAction, disconnectGoogleAction, saveGoalsAction, setPropertyAction, verifySiteAction,
} from "../../../account-actions";
import { googleConfigured, hasGoogle, listProperties } from "@/lib/google";
import { indexNowKeyUrl } from "@/lib/indexing";
import { BOT_UA_PATTERN } from "@/lib/bots";
import { SubmitButton } from "@/components/account/Forms";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; siteId: string }>;
  searchParams: Promise<{ error?: string; saved?: string; google?: string }>;
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
  const { error, saved, google: googleMsg } = await props.searchParams;
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

  const googleConnected = googleConfigured() && hasGoogle(user.id);
  let properties: string[] = [];
  if (googleConnected) {
    try {
      properties = await listProperties(user.id);
    } catch {
      /* shown as "no matching property" */
    }
  }

  const endpoint = `${SITE_URL}/api/bots`;
  const payload = `'s' => '${site.id}', 'k' => '${site.bot_key}'`;
  const phpSnippet = `<?php
// Czech Th!s Report — crawler log. Sends nothing for human visitors.
(function () {
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    if (!preg_match('/${BOT_UA_PATTERN}/i', $ua)) return;
    $path = $_SERVER['REQUEST_URI'] ?? '/';
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    register_shutdown_function(function () use ($ua, $path, $ip) {
        if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
        $ch = curl_init('${endpoint}');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode([${payload}, 'ua' => $ua, 'ip' => $ip, 'path' => $path, 'status' => http_response_code()]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_CONNECTTIMEOUT => 1,
            CURLOPT_TIMEOUT => 2,
            CURLOPT_RETURNTRANSFER => true,
        ]);
        curl_exec($ch);
    });
})();`;
  const nextSnippet = `import { after } from "next/server";

const BOTS = /${BOT_UA_PATTERN}/i;

// inside your proxy (middleware) function, before returning:
const ua = request.headers.get("user-agent") ?? "";
if (BOTS.test(ua)) {
  after(() =>
    fetch("${endpoint}", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        s: "${site.id}",
        k: "${site.bot_key}",
        ua,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
        path: request.nextUrl.pathname,
      }),
    }).catch(() => {})
  );
}`;

  return (
    <div>
      <section className={card} aria-labelledby="install-h">
        <h2 id="install-h" className="text-xl font-semibold mb-2">{s.installTitle}</h2>
        <p className="text-muted mb-4">{s.installText}</p>
        <Code>{snippet}</Code>
        <p className="text-sm text-muted mb-4">{s.cspNote.replace("{host}", new URL(SITE_URL).host)}</p>

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

      <section className={card} aria-labelledby="google-h">
        <h2 id="google-h" className="text-xl font-semibold mb-2">{s.googleTitle}</h2>
        <p className="text-muted mb-4">{s.googleText}</p>
        {googleMsg === "error" && <p role="alert" className="text-sm text-score-red mb-4">{s.googleError}</p>}
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
                  <select
                    id="property"
                    name="property"
                    defaultValue={site.gsc_property ?? ""}
                    className="rounded-lg border border-border bg-surface-2 px-3 py-2.5"
                  >
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
      </section>

      <section className={card} aria-labelledby="indexnow-h">
        <h2 id="indexnow-h" className="text-xl font-semibold mb-2">{s.indexNowTitle}</h2>
        <p className="text-muted mb-4">{s.indexNowText}</p>
        <Code>{`${site.indexnow_key}.txt`}</Code>
        <p className="text-sm text-muted mb-1.5">{s.indexNowContent}</p>
        <Code>{site.indexnow_key ?? ""}</Code>
        <p className="text-sm text-muted break-all">
          <a href={indexNowKeyUrl(site)} rel="noopener" className="text-accent hover:underline">{indexNowKeyUrl(site)}</a>
        </p>
      </section>

      <section id="bots" className={`${card} scroll-mt-20`} aria-labelledby="bots-h">
        <h2 id="bots-h" className="text-xl font-semibold mb-2">{s.botsTitle}</h2>
        <p className="text-muted mb-4">{s.botsText}</p>
        <p className="text-sm mb-1.5">{s.botsPhp}</p>
        <Code>{phpSnippet}</Code>
        <p className="text-sm mb-1.5">{s.botsNext}</p>
        <Code>{nextSnippet}</Code>
        <p className="text-sm text-score-orange">{s.botsSecret}</p>
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
