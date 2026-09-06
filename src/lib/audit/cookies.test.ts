/**
 * Run with: npm run test:cookies
 *
 * The cases below are trimmed from real Czech sites we ran the detector against
 * — a custom Czech banner, a CMP script, a bare GTM page, a bot-blocked shell.
 * They exist to keep the false-positive rate down: before this module, every
 * one of these reported "cookie controls are missing".
 */
import assert from "node:assert/strict";
import test from "node:test";
import { analyzeConsent, type ConsentInput } from "./cookies";

function run(html: string, extra: Partial<ConsentInput> = {}) {
  return analyzeConsent({
    html,
    bodyText: extra.bodyText ?? "",
    links: extra.links ?? [],
    setCookieNames: extra.setCookieNames ?? [],
    ...extra,
  });
}

const GTM = `<script src="https://www.googletagmanager.com/gtm.js?id=GTM-ABC123"></script>`;

test("bare tracking with nothing else is the one case we flag", () => {
  const a = run(`<html><body>${GTM}<p>Vítejte</p></body></html>`);
  assert.deepEqual(a.trackers, ["Google Tag Manager"]);
  assert.equal(a.needsConsent, true);
  assert.equal(a.hasConsentTooling, false);
});

test("a page with no tracking at all needs no consent", () => {
  const a = run(`<html><body><h1>Kominictví</h1></body></html>`);
  assert.equal(a.needsConsent, false);
});

test("custom Czech banner counts as consent tooling (kytary.cz)", () => {
  const a = run(
    `<html><body>${GTM}<div id="cookieBox"><button onclick="cookies.acceptAll()">Přijmout vše</button></div></body></html>`,
    { bodyText: "Přijmout vše Nastavení cookies" }
  );
  assert.equal(a.cmps.length, 0);
  assert.ok(a.uiSignals.length >= 2, `expected markup + wording signals, got ${a.uiSignals}`);
  assert.equal(a.hasConsentTooling, true);
});

test("Czech wording matches with diacritics stripped", () => {
  const a = run(GTM, { bodyText: "Souhlasím s používáním souborů cookie" });
  assert.equal(a.hasConsentTooling, true);
});

test("accept wording alone, without any mention of cookies, is not consent UI", () => {
  const a = run(GTM, { bodyText: "Souhlasím s obchodními podmínkami" });
  assert.equal(a.hasConsentTooling, false);
});

test("named CMPs are recognised", () => {
  const a = run(`<script src="https://consent.cookiebot.com/uc.js" data-cbid="x"></script>${GTM}`);
  assert.deepEqual(a.cmps, ["Cookiebot"]);
  assert.equal(a.hasConsentTooling, true);
});

test("consent mode defaults count, even with unblocked tags", () => {
  const a = run(`<script>gtag('consent', 'default', {ad_storage: 'denied'});</script>${GTM}`);
  assert.equal(a.consentMode, true);
  assert.equal(a.hasConsentTooling, true);
});

test("scripts parked behind consent are counted", () => {
  const a = run(
    `<script type="text/plain" data-cookieconsent="statistics" src="https://www.google-analytics.com/analytics.js"></script>`
  );
  assert.equal(a.blockedScripts, 1);
  assert.equal(a.hasConsentTooling, true);
});

test("only known tracking cookies count as set before consent", () => {
  const a = run("", { setCookieNames: ["PHPSESSID", "cart", "_ga", "_fbp", "__RequestVerificationToken"] });
  assert.deepEqual(a.preConsentCookies, ["_ga", "_fbp"]);
  assert.equal(a.needsConsent, true);
});

test("privacy policy links are found in Czech text and in the URL", () => {
  const czech = run("", { links: [{ text: "Zásady ochrany osobních údajů", href: "/gdpr-info" }] });
  assert.equal(czech.privacyPolicyLink, "/gdpr-info");
  const byHref = run("", { links: [{ text: "Více", href: "/zpracovani-osobnich-udaju" }] });
  assert.equal(byHref.privacyPolicyLink, "/zpracovani-osobnich-udaju");
  const none = run("", { links: [{ text: "Kontakt", href: "/kontakt" }] });
  assert.equal(none.privacyPolicyLink, null);
});

test("Matomo configured cookieless needs no consent (czso.cz)", () => {
  const snippet = `<script>var _paq=[];_paq.push(["disableCookies"]);</script><script src="https://stats.example.cz/matomo.js"></script>`;
  assert.deepEqual(run(snippet).trackers, []);
  assert.equal(run(snippet.replace('_paq.push(["disableCookies"]);', "")).trackers.length, 1);
});

test("a bot-blocked shell is not treated as a navigable page", () => {
  const a = run("<html><body><a href='/'>Home</a></body></html>", {
    links: [{ text: "Home", href: "/" }],
  });
  assert.equal(a.navigable, false);
  assert.equal(a.needsConsent, false);
});
