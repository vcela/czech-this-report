import { getDb } from "./db";
import { fetchTextIfOk } from "./audit/fetcher";
import { BOT_UA_PATTERN } from "./bots";
import { googleConfigured, hasGoogle } from "./google";
import { checkIndexNowKey, indexNowKeyUrl } from "./indexing";
import { SITE_URL } from "./site";
import { VERIFY_META, verifySite, type Site } from "./sites";

/** Setup steps in the order an owner should do them. */
export const STEPS = ["verify", "snippet", "consent", "conversions", "google", "indexnow", "bots"] as const;
export type StepId = (typeof STEPS)[number];

/**
 * done    – verified from real evidence (data arrived, file found…)
 * partial – in place but not yet proven (code found, no visit yet)
 * todo    – missing
 * Optional steps never count against the site.
 */
export type StepState = "done" | "partial" | "todo";
export const OPTIONAL: StepId[] = ["conversions", "bots"];
/** Steps a coding assistant can do in the site's code (Google needs the owner's own sign-in). */
export const CODE_STEPS: Exclude<StepId, "google">[] = ["verify", "snippet", "consent", "conversions", "indexnow", "bots"];

const has = (sql: string, ...p: unknown[]) => !!getDb().prepare(sql).get(...p);

/** Status from what we already know — no network, so it's cheap on every page view. */
export function setupStatus(site: Site, userId: number): Record<StepId, StepState> {
  const anyEvent = has("SELECT 1 FROM events WHERE site_id = ? LIMIT 1", site.id);
  return {
    verify: site.verified_at ? "done" : "todo",
    snippet: anyEvent ? "done" : site.snippet_found_at ? "partial" : "todo",
    consent: has("SELECT 1 FROM events WHERE site_id = ? AND visitor LIKE 'c:%' LIMIT 1", site.id)
      ? "done"
      : anyEvent
        ? "partial"
        : "todo",
    conversions: has("SELECT 1 FROM events WHERE site_id = ? AND type IN ('form','event') LIMIT 1", site.id) || site.goal_paths
      ? "done"
      : "todo",
    google: googleConfigured() && hasGoogle(userId) && site.gsc_property ? "done" : "todo",
    indexnow: site.indexnow_ok_at ? "done" : "todo",
    bots: has("SELECT 1 FROM bot_hits WHERE site_id = ? LIMIT 1", site.id) ? "done" : "todo",
  };
}

/**
 * Look at the live site for everything we can see from outside: the
 * verification tag, the measuring code and the IndexNow key file. Runs on the
 * "Check deployment" button and, throttled, whenever Settings is opened with
 * one of those steps still open.
 */
export async function runSetupChecks(site: Site): Promise<void> {
  const db = getDb();
  const [{ text: html }] = await Promise.all([fetchTextIfOk(site.url), checkIndexNowKey(site).catch(() => null)]);
  const found = !!html && html.includes(`data-site="${site.id}"`) && html.includes("ctr.js");
  db.prepare("UPDATE sites SET snippet_found_at = ? WHERE id = ?").run(found ? Date.now() : null, site.id);
  if (!site.verified_at) await verifySite(site);
}

const lastAutoCheck = new Map<string, number>();

/** Re-check open steps when Settings is opened, at most once a minute per site. */
export async function autoCheck(site: Site, status: Record<StepId, StepState>): Promise<boolean> {
  const open = status.verify !== "done" || status.snippet === "todo" || status.indexnow !== "done";
  const last = lastAutoCheck.get(site.id) ?? 0;
  if (!open || Date.now() - last < 60_000) return false;
  lastAutoCheck.set(site.id, Date.now());
  try {
    await runSetupChecks(site);
  } catch (e) {
    console.error("Setup auto-check failed", e);
  }
  return true;
}

/** Every snippet the owner (or their AI) needs, filled in for this site. */
export function siteSnippets(site: Site) {
  const origin = new URL(SITE_URL).origin;
  const endpoint = `${origin}/api/bots`;
  return {
    origin,
    verifyMeta: `<meta name="${VERIFY_META}" content="${site.verify_token}">`,
    verifyDns: `${site.host}  TXT  "${VERIFY_META}=${site.verify_token}"`,
    stub: `<script>window.ctr=window.ctr||function(){(ctr.q=ctr.q||[]).push(arguments)}</script>`,
    script: `<script defer src="${origin}/ctr.js" data-site="${site.id}"></script>`,
    indexNowFile: `${site.indexnow_key}.txt`,
    indexNowKey: site.indexnow_key ?? "",
    indexNowUrl: indexNowKeyUrl(site),
    php: `<?php
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
            CURLOPT_POSTFIELDS => json_encode(['s' => '${site.id}', 'k' => '${site.bot_key}', 'ua' => $ua, 'ip' => $ip, 'path' => $path, 'status' => http_response_code()]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_CONNECTTIMEOUT => 1,
            CURLOPT_TIMEOUT => 2,
            CURLOPT_RETURNTRANSFER => true,
        ]);
        curl_exec($ch);
    });
})();`,
    next: `import { after } from "next/server";

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
}`,
  };
}

export interface PromptCopy {
  intro: string;
  stack: string;
  verify: string;
  snippet: string;
  consent: string;
  conversions: string;
  indexnow: string;
  bots: string;
  outro: string;
}

const fillIn = (tpl: string, v: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? `{${k}}`);

/** One prompt for a coding assistant with only the steps that are still missing. */
export function buildSetupPrompt(site: Site, status: Record<StepId, StepState>, copy: PromptCopy): string | null {
  const s = siteSnippets(site);
  const steps = CODE_STEPS.filter((id) => status[id] !== "done" && !(id === "snippet" && status.snippet === "partial"));
  if (!steps.length) return null;
  const v: Record<string, string> = {
    host: site.host,
    origin: s.origin,
    verifyMeta: s.verifyMeta,
    stub: s.stub,
    script: s.script,
    indexNowFile: s.indexNowFile,
    indexNowKey: s.indexNowKey,
    indexNowUrl: s.indexNowUrl,
    php: s.php,
    next: s.next,
  };
  const body = steps.map((id, i) => `${i + 1}. ${fillIn(copy[id], v)}`).join("\n\n");
  return [fillIn(copy.intro, v), copy.stack, body, copy.outro].join("\n\n");
}
