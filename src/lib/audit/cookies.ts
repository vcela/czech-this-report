/**
 * Cookie / consent detection.
 *
 * We only ever see the server-rendered HTML — no JavaScript is executed — so a
 * banner injected at runtime (Cookiebot's auto-blocking, a GTM consent
 * template, most SPA footers) is invisible here. Everything below is therefore
 * built to answer "did we find positive evidence?" rather than "is the banner
 * missing?", and the one case where we do claim a gap is reported as an
 * estimate, with the signals we did find listed as evidence.
 */

export interface ConsentLink {
  text: string;
  href: string;
}

export interface ConsentInput {
  /** Raw server HTML — script srcs, inline scripts, id/class attributes. */
  html: string;
  /** Decoded visible text of <body>. */
  bodyText: string;
  links: ConsentLink[];
  /** Cookie names the site set in the HTTP response, i.e. before any consent. */
  setCookieNames: string[];
}

export interface ConsentAnalysis {
  /** Named analytics/ad/heatmap tools found in the markup. */
  trackers: string[];
  /** Named consent management platforms found in the markup. */
  cmps: string[];
  /** Consent UI recognised without naming a vendor (markup or wording). */
  uiSignals: string[];
  /** Google/WP consent mode wiring — trackers may load unblocked on purpose. */
  consentMode: boolean;
  /** Scripts parked for a consent tool (type="text/plain", data-*-src, …). */
  blockedScripts: number;
  cookiePolicyLink: string | null;
  privacyPolicyLink: string | null;
  /** Known third-party tracking cookies set by the server on the first hit. */
  preConsentCookies: string[];
  /** Enough links that "it isn't in the footer either" means something. */
  navigable: boolean;
  needsConsent: boolean;
  hasConsentTooling: boolean;
}

/** Strip diacritics so Czech copy matches plain-ASCII patterns. */
function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// ponytail: first 400 KB of markup only — consent wiring lives in <head> and in
// the banner container, never at the bottom of a 2 MB product listing.
const SCAN_LIMIT = 400_000;

/** Consent management platforms, by the fingerprint they leave in the markup. */
const CMP_VENDORS: Array<[RegExp, string]> = [
  [/cookiebot|cybotcookiebot/i, "Cookiebot"],
  [/onetrust|cookielaw\.org|optanon|otsdkstub/i, "OneTrust"],
  [/usercentrics/i, "Usercentrics"],
  [/didomi/i, "Didomi"],
  [/osano/i, "Osano"],
  [/cookieyes|cky-consent|cookie-law-info|cookielawinfo/i, "CookieYes / GDPR Cookie Consent"],
  [/iubenda/i, "Iubenda"],
  [/consentmanager\.net|cmpbox/i, "consentmanager.net"],
  [/quantcast|__cmpapi|__tcfapi/i, "IAB TCF consent framework"],
  [/sourcepoint|sp_message|sp-prod/i, "Sourcepoint"],
  [/trustarc|truste\.com/i, "TrustArc"],
  [/termly\.io/i, "Termly"],
  [/axeptio/i, "Axeptio"],
  [/cookiefirst/i, "CookieFirst"],
  [/cookie-?script\.com|cookiescript/i, "CookieScript"],
  [/tarteaucitron/i, "tarteaucitron"],
  [/borlabs-?cookie/i, "Borlabs Cookie"],
  [/complianz|cmplz/i, "Complianz"],
  [/real-?cookie-?banner|devowl/i, "Real Cookie Banner"],
  [/moove_?gdpr|moove-gdpr/i, "Moove GDPR Cookie Compliance"],
  [/cookie-notice\/|cn-set-cookie|cookie_notice_accept/i, "Cookie Notice (WordPress)"],
  [/civiccomputing|civiccookiecontrol/i, "Civic Cookie Control"],
  [/klaro/i, "Klaro"],
  [/secureprivacy|seersco/i, "Secure Privacy / Seers"],
  [/cookieconsent|cookie-consent|cc-window/i, "cookieconsent (open source)"],
  [/cmp\.seznam\.cz|szn-cmp/i, "Seznam CMP"],
  [/shoptet\.consent|cookiesconsent/i, "Shoptet consent"],
];

/** Tools that set cookies or fingerprint visitors, i.e. that need consent. */
const TRACKERS: Array<[RegExp, string]> = [
  [/googletagmanager\.com|["'/]gtm-[a-z0-9]{4,}/i, "Google Tag Manager"],
  [/google-analytics\.com|gtag\(\s*['"]config|["'/]ua-\d{4,}-\d/i, "Google Analytics"],
  [/googleadservices|googlesyndication|doubleclick\.net/i, "Google Ads / DoubleClick"],
  [/connect\.facebook\.net|fbq\(\s*['"]init/i, "Meta (Facebook) Pixel"],
  [/static\.hotjar\.com|hotjar\.com|_hjsettings/i, "Hotjar"],
  [/clarity\.ms/i, "Microsoft Clarity"],
  [/bat\.bing\.com|uetq/i, "Microsoft Ads (UET)"],
  [/smartlook/i, "Smartlook"],
  [/cdn\.segment\.com|segment\.io/i, "Segment"],
  [/mixpanel/i, "Mixpanel"],
  [/matomo\.js|piwik\.js|matomo\.php/i, "Matomo / Piwik"],
  [/analytics\.tiktok\.com|ttq\.load/i, "TikTok Pixel"],
  [/snap\.licdn\.com|_linkedin_partner_id/i, "LinkedIn Insight Tag"],
  [/static\.ads-twitter\.com/i, "X (Twitter) Ads"],
  [/pintrk\(|s\.pinimg\.com\/ct/i, "Pinterest Tag"],
  [/criteo/i, "Criteo"],
  [/rtbhouse/i, "RTB House"],
  [/mc\.yandex\.ru/i, "Yandex Metrica"],
  [/js\.hs-scripts\.com|js\.hubspot/i, "HubSpot"],
  [/widget\.intercom\.io|intercomsettings/i, "Intercom"],
  [/c\.seznam\.cz|sklik|seznam\.cz\/rc\//i, "Sklik / Seznam retargeting"],
  [/leady\.com|leady\.cz/i, "Leady"],
  [/gemius/i, "Gemius"],
  [/glami\.[a-z]{2,3}\/pixel|glami_pixel/i, "Glami Pixel"],
  [/heureka\.cz\/direct|roiconv|heurekaroi/i, "Heureka konverze"],
  [/exponea|bloomreach/i, "Bloomreach / Exponea"],
  [/salesmanago|ecomail\.cz\/js|samba\.ai/i, "Marketing automation pixel"],
  [/adform\.net/i, "Adform"],
];

/** Container / attribute fingerprints of a consent UI whose vendor we can't name. */
const UI_MARKUP: Array<[RegExp, string]> = [
  [/(?:id|class)="[^"]{0,60}(?:cookie|consent|gdpr|souhlas|cmp[-_])/i, "consent container in the markup"],
  [/data-(?:cookie|consent|cmp|cookieconsent|cookiecategory|cookieblock)/i, "consent data-attributes"],
  [/on[a-z]+="[^"]{0,80}(?:cookie|consent|souhlas)/i, "consent handler on a button"],
];

/** Scripts a consent tool has parked until the visitor agrees. */
const BLOCKED_SCRIPT =
  /<script[^>]+(?:type="text\/plain"|data-cookieconsent=|data-cookieblock-src=|data-cmp-src=|data-cmplz)/gi;

const CONSENT_MODE =
  /gtag\(\s*['"]consent['"]|['"]consent['"]\s*,\s*['"](?:default|update)['"]|wp_consent|consent_?mode|google_tag_data/i;

/** Wording a consent dialog uses — Czech (diacritics folded) and English. */
const ACCEPT_WORDS =
  /prijmout|souhlasim|nesouhlasim|odmitnout|povolit vse|rozumim|beru na vedomi|upravit souhlas|spravovat souhlas|nastaveni souboru|nastaveni cookie|accept all|reject all|allow all|decline all|manage (?:cookies|preferences|consent)|cookie (?:settings|preferences)|i agree/i;
const COOKIE_WORDS = /cookie|osobnich udaju|personal data/i;

/** Cookies that are unambiguously analytics/advertising, never "essential". */
const TRACKING_COOKIE =
  /^(?:_ga(?:$|_)|_gid$|_gat|_gcl_|_fbp$|_fbc$|_hj|_clck$|_clsk$|_uet|_ttp$|_pk_(?:id|ses)|_pin_|_scid$|__utm|ide$|nid$|muid$|cto_bundle|sznab|_smartlook|li_sugr|li_fat_id|yandexuid|_ym_|hubspotutk|__hstc|mp_[a-z0-9]{16,})/i;

/**
 * Configurations that make an otherwise cookie-setting tool consent-free.
 * Matomo with `disableCookies` is the common one — several Czech public bodies
 * run exactly that, and flagging them would be plain wrong.
 * ponytail: one entry; add GA4's `client_storage: 'none'` if it ever shows up.
 */
const COOKIELESS: Array<[string, RegExp]> = [["Matomo / Piwik", /disablecookies/i]];

function collect(hay: string, table: Array<[RegExp, string]>): string[] {
  const out: string[] = [];
  for (const [re, label] of table) if (re.test(hay) && !out.includes(label)) out.push(label);
  return out;
}

export function analyzeConsent(input: ConsentInput): ConsentAnalysis {
  const markup = input.html.slice(0, SCAN_LIMIT);
  const foldedText = fold(input.bodyText).slice(0, SCAN_LIMIT);
  // Hyphens, slashes and underscores become spaces so one pattern matches both
  // "ochrana osobních údajů" in the link text and /ochrana-osobnich-udaju in the href.
  const linkHay = input.links.map((l) => fold(`${l.text} ${l.href}`).replace(/[^a-z0-9]+/g, " "));

  const trackers = collect(markup, TRACKERS).filter(
    (t) => !COOKIELESS.some(([label, re]) => label === t && re.test(markup))
  );
  const cmps = collect(markup, CMP_VENDORS);

  const uiSignals = collect(markup, UI_MARKUP);
  if (COOKIE_WORDS.test(foldedText) && ACCEPT_WORDS.test(foldedText)) {
    uiSignals.push("consent wording in the page text");
  }
  const blockedScripts = (markup.match(BLOCKED_SCRIPT) ?? []).length;
  if (blockedScripts > 0) uiSignals.push(`${blockedScripts} script(s) held back until consent`);

  const consentMode = CONSENT_MODE.test(markup);

  const cookiePolicyLink = input.links.find((_, i) => /cookie/.test(linkHay[i]))?.href ?? null;
  const privacyPolicyLink =
    input.links.find((_, i) =>
      /privacy|gdpr|data protection|ochran[ay] (?:osobnich|udaju|soukromi)|osobnich udaju|zpracovani (?:osobnich|udaju)|zasady ochrany|soukromi/.test(
        linkHay[i]
      )
    )?.href ?? null;

  const preConsentCookies = input.setCookieNames.filter((n) => TRACKING_COOKIE.test(n));

  return {
    trackers,
    cmps,
    uiSignals,
    consentMode,
    blockedScripts,
    cookiePolicyLink,
    privacyPolicyLink,
    preConsentCookies,
    navigable: input.links.length >= 10,
    needsConsent: trackers.length > 0 || preConsentCookies.length > 0,
    hasConsentTooling: cmps.length > 0 || consentMode || uiSignals.length > 0,
  };
}
