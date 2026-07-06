import type { SiteSnapshot } from "../fetcher";
import type { Finding, PassedCheck, PerfMetrics } from "../types";
import { ev, evRaw, finding, passed } from "../build";

export interface SeoResult {
  findings: Finding[];
  passed: PassedCheck[];
}

function robotsBlocksAll(robots: string): boolean {
  // true if a `User-agent: *` group contains `Disallow: /` (exactly root)
  const lines = robots.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim());
  let inStar = false;
  for (const line of lines) {
    const ua = line.match(/^user-agent:\s*(.+)$/i);
    if (ua) {
      inStar = ua[1].trim() === "*";
      continue;
    }
    if (inStar) {
      const dis = line.match(/^disallow:\s*(.*)$/i);
      if (dis && dis[1].trim() === "/") return true;
      const allow = line.match(/^allow:\s*\/\s*$/i);
      if (allow) return false;
    }
  }
  return false;
}

type CookieControlStatus = "none" | "simple-banner" | "consent-manager";
type CookieGapType = "complete" | "settings-only" | "policy-only" | "privacy-only" | "mixed-gap";

function detectCookieControls(text: string, linksText: string, scriptsText: string): {
  needsControls: boolean;
  status: CookieControlStatus;
  hasCookieSettings: boolean;
  hasCookiePolicy: boolean;
  hasPrivacyPage: boolean;
  detectedSignals: string[];
  gapType: CookieGapType;
} {
  const combined = `${text}\n${linksText}\n${scriptsText}`.toLowerCase();
  const hasTrackingSignal = /(google analytics|gtag|googletagmanager|gtm|matomo|hotjar|clarity|segment|mixpanel|facebook pixel|analytics|tracking)/i.test(combined);
  const hasCookieBannerSignal = /cookie(?:s)?\s*(?:banner|notice|consent)|consent manager|accept all|reject all|manage (?:preferences|cookies)|cookie settings|privacy settings|learn more about cookies/i.test(combined);
  const hasConsentManagerSignal = /(cookiebot|onetrust|usercentrics|didomi|osano|klaro|cookieyes|iubenda|consentmanager|consent management)/i.test(combined);
  const hasCookieSettings = /cookie(?:s)?\s*(?:settings?|preferences?|consent)|manage cookies|consent preferences|accept all|reject all/i.test(`${text}\n${linksText}`);
  const hasCookiePolicy = /\bcookie(?:s)?\s*(?:policy|declaration|list|information|notice)|cookies? policy|cookie declaration|cookie statement/i.test(linksText);
  const hasPrivacyPage = /\b(privacy|gdpr|data protection|data privacy|privacy policy|privacy notice)\b/i.test(linksText);

  const needsControls = hasTrackingSignal || hasCookieBannerSignal || hasCookieSettings || hasCookiePolicy || hasPrivacyPage;
  const status: CookieControlStatus = hasConsentManagerSignal
    ? "consent-manager"
    : hasCookieBannerSignal || hasCookieSettings
      ? "simple-banner"
      : "none";

  const detectedSignals: string[] = [];
  if (hasTrackingSignal) detectedSignals.push("tracking scripts");
  if (hasCookieBannerSignal) detectedSignals.push("cookie banner / notice");
  if (hasConsentManagerSignal) detectedSignals.push("consent manager script");
  if (hasCookieSettings) detectedSignals.push("cookie settings UI");
  if (hasCookiePolicy) detectedSignals.push("cookie policy link");
  if (hasPrivacyPage) detectedSignals.push("privacy/GDPR link");

  const missing = [
    !hasCookieSettings ? "settings" : null,
    !hasCookiePolicy ? "policy" : null,
    !hasPrivacyPage ? "privacy" : null,
  ].filter(Boolean) as string[];
  const gapType: CookieGapType = missing.length === 0
    ? "complete"
    : missing.length === 1
      ? (missing[0] === "settings" ? "settings-only" : missing[0] === "policy" ? "policy-only" : "privacy-only")
      : "mixed-gap";

  return {
    needsControls,
    status,
    hasCookieSettings,
    hasCookiePolicy,
    hasPrivacyPage,
    detectedSignals,
    gapType,
  };
}

export function runSeoChecks(site: SiteSnapshot, perf: PerfMetrics): SeoResult {
  const f: Finding[] = [];
  const p: PassedCheck[] = [];
  const { $, page } = site;
  const finalUrl = page.finalUrl;

  /* ---- title ---- */
  const title = $("head > title").first().text().trim();
  if (!title) {
    f.push(finding("seo-title-missing", [evRaw(`URL: ${finalUrl}`)]));
  } else {
    p.push(passed("seo-title-missing"));
    if (title.length < 15 || title.length > 65) {
      f.push(
        finding("seo-title-length", [
          ev(
            `Current title (${title.length} characters): “${title}”`,
            `Aktuální titulek (${title.length} znaků): „${title}“`
          ),
        ])
      );
    } else {
      p.push(passed("seo-title-length"));
    }
  }

  /* ---- meta description ---- */
  const desc = $('head meta[name="description"]').attr("content")?.trim() ?? "";
  if (!desc) {
    f.push(finding("seo-meta-description-missing", [evRaw(`URL: ${finalUrl}`)]));
  } else {
    p.push(passed("seo-meta-description-missing"));
    if (desc.length < 50 || desc.length > 165) {
      f.push(
        finding("seo-meta-description-length", [
          ev(
            `Current description (${desc.length} characters): “${desc.slice(0, 180)}”`,
            `Aktuální popisek (${desc.length} znaků): „${desc.slice(0, 180)}“`
          ),
        ])
      );
    } else {
      p.push(passed("seo-meta-description-length"));
    }
  }

  /* ---- cookie / privacy controls ---- */
  const pageText = $("body").text().toLowerCase();
  const linksText = $("a[href]")
    .map((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      const href = ($(el).attr("href") ?? "").toLowerCase();
      return `${text} ${href}`;
    })
    .get()
    .join("\n");
  const scriptsText = $("script[src]")
    .map((_, el) => ($(el).attr("src") ?? "").toLowerCase())
    .get()
    .join("\n");
  const cookieControls = detectCookieControls(pageText, linksText, scriptsText);

  if (!cookieControls.needsControls) {
    p.push(passed("seo-cookie-consent"));
  } else {
    const missing: string[] = [];
    if (!cookieControls.hasCookieSettings) missing.push("cookie notice/settings");
    if (!cookieControls.hasCookiePolicy) missing.push("cookie policy page");
    if (!cookieControls.hasPrivacyPage) missing.push("privacy/GDPR page");

    const statusText = cookieControls.status === "consent-manager"
      ? "a consent manager appears to be present"
      : cookieControls.status === "simple-banner"
        ? "a basic cookie banner or notice appears to be present"
        : "no obvious cookie-control UI was detected";

    const gapLabel = cookieControls.gapType === "settings-only"
      ? "This looks like a settings-control gap"
      : cookieControls.gapType === "policy-only"
        ? "This looks like a cookie-policy gap"
        : cookieControls.gapType === "privacy-only"
          ? "This looks like a privacy/GDPR-page gap"
          : "This looks like a broader consent setup gap";

    if (missing.length > 0) {
      f.push(
        finding("seo-cookie-consent", [
          ev(
            `${gapLabel}. The page appears to use cookies or tracking and ${statusText}, but the required notice/settings control or obvious links to a cookie policy and a privacy/GDPR page were not fully found. Missing: ${missing.join(", ")}. Detected signals: ${cookieControls.detectedSignals.join(", ") || "none"}.`,
            `${gapLabel.replace("This", "Zdá se").replace("looks", "že jde").replace("a ", "")}. Stránka používá cookies nebo sledování a ${statusText}, ale potřebný prvek pro oznámení/nastavení nebo zjevné odkazy na stránku o cookies a ochranu osobních údajů/GDPR nebyly úplně nalezeny. Chybí: ${missing.join(", ")}. Zjištěné signály: ${cookieControls.detectedSignals.join(", ") || "žádné"}.`
          ),
        ])
      );
    } else {
      p.push(passed("seo-cookie-consent"));
    }
  }

  /* ---- headings ---- */
  const h1s = $("h1");
  if (h1s.length === 0) {
    f.push(finding("seo-h1-missing", [evRaw(`URL: ${finalUrl}`)]));
  } else {
    p.push(passed("seo-h1-missing"));
    if (h1s.length > 1) {
      const texts = h1s
        .map((_, el) => $(el).text().trim().slice(0, 60))
        .get()
        .slice(0, 5);
      f.push(
        finding("seo-h1-multiple", [
          ev(`Found ${h1s.length} H1 headings:`, `Nalezeno ${h1s.length} nadpisů H1:`),
          ...texts.map((t) => evRaw(`• “${t}”`)),
        ])
      );
    } else {
      p.push(passed("seo-h1-multiple"));
    }
  }

  const headings = $("h1,h2,h3,h4,h5,h6")
    .map((_, el) => ({ level: Number(el.tagName[1]), text: $(el).text().trim().slice(0, 50) }))
    .get();
  const skips: string[] = [];
  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level > headings[i - 1].level + 1) {
      skips.push(
        `H${headings[i - 1].level} (“${headings[i - 1].text}”) → H${headings[i].level} (“${headings[i].text}”)`
      );
    }
  }
  if (headings.length > 1) {
    if (skips.length > 0) {
      f.push(
        finding("seo-heading-hierarchy", [
          ev(
            `${skips.length} skipped level(s), e.g.:`,
            `Přeskočené úrovně (${skips.length}×), např.:`
          ),
          ...skips.slice(0, 4).map((s) => evRaw(`• ${s}`)),
        ])
      );
    } else {
      p.push(passed("seo-heading-hierarchy"));
    }
  }

  /* ---- indexability ---- */
  const robotsMeta = $('head meta[name="robots"]').attr("content")?.toLowerCase() ?? "";
  const xRobots = (page.headers["x-robots-tag"] ?? "").toLowerCase();
  if (robotsMeta.includes("noindex") || xRobots.includes("noindex")) {
    f.push(
      finding("seo-noindex", [
        robotsMeta.includes("noindex")
          ? evRaw(`<meta name="robots" content="${robotsMeta}">`)
          : evRaw(`HTTP header: X-Robots-Tag: ${xRobots}`),
      ])
    );
  } else {
    p.push(passed("seo-noindex"));
  }

  if (site.robotsTxt !== null) {
    if (robotsBlocksAll(site.robotsTxt)) {
      f.push(
        finding("seo-robots-blocks-all", [
          evRaw(`robots.txt: User-agent: * / Disallow: /`),
        ])
      );
    } else {
      p.push(passed("seo-robots-blocks-all"));
    }
  }

  /* ---- sitemap ---- */
  if (site.sitemapUrls.length === 0) {
    f.push(
      finding("seo-sitemap-missing", [
        ev(
          `Checked: ${site.sitemapCheckedUrls.join(", ")} — none returned a valid sitemap.`,
          `Zkontrolováno: ${site.sitemapCheckedUrls.join(", ")} — žádná adresa nevrátila platnou sitemapu.`
        ),
      ])
    );
  } else {
    p.push(passed("seo-sitemap-missing"));
    const inRobots = site.robotsTxt ? /^\s*sitemap:/im.test(site.robotsTxt) : false;
    if (!inRobots) {
      f.push(
        finding("seo-sitemap-not-in-robots", [
          ev(
            `Sitemap found at ${site.sitemapUrls[0]}, but robots.txt has no “Sitemap:” line.`,
            `Sitemapa nalezena na ${site.sitemapUrls[0]}, ale robots.txt neobsahuje řádek „Sitemap:“.`
          ),
        ])
      );
    } else {
      p.push(passed("seo-sitemap-not-in-robots"));
    }
  }

  /* ---- canonical ---- */
  const canonical = $('head link[rel="canonical"]').attr("href");
  if (!canonical) {
    f.push(finding("seo-canonical-missing", [evRaw(`URL: ${finalUrl}`)]));
  } else {
    p.push(passed("seo-canonical-missing"));
  }

  /* ---- HTTPS ---- */
  if (!finalUrl.startsWith("https://")) {
    f.push(evHttps(finalUrl));
  } else {
    p.push(passed("seo-https-missing"));
    if (site.httpRedirects === false) {
      f.push(
        finding("seo-http-no-redirect", [
          ev(
            `${finalUrl.replace("https://", "http://")} loads without redirecting to HTTPS.`,
            `${finalUrl.replace("https://", "http://")} se načte bez přesměrování na HTTPS.`
          ),
        ])
      );
    } else if (site.httpRedirects === true) {
      p.push(passed("seo-http-no-redirect"));
    }
    const hsts = page.headers["strict-transport-security"];
    if (!hsts) {
      f.push(
        finding("seo-hsts-missing", [
          ev(
            "The Strict-Transport-Security response header is not set.",
            "Hlavička odpovědi Strict-Transport-Security není nastavena."
          ),
        ])
      );
    } else {
      p.push(passed("seo-hsts-missing"));
    }
  }

  /* ---- viewport / mobile ---- */
  const viewport = $('head meta[name="viewport"]').attr("content") ?? "";
  if (!viewport) {
    f.push(finding("seo-viewport-missing", [evRaw(`URL: ${finalUrl}`)]));
  } else {
    p.push(passed("seo-viewport-missing"));
  }

  /* ---- Open Graph ---- */
  const ogTitle = $('head meta[property="og:title"]').attr("content");
  const ogImage = $('head meta[property="og:image"]').attr("content");
  if (!ogTitle && !ogImage) {
    f.push(
      finding("seo-og-missing", [
        ev(
          "No og:title, og:description or og:image meta tags found.",
          "Nenalezeny meta značky og:title, og:description ani og:image."
        ),
      ])
    );
  } else {
    p.push(passed("seo-og-missing"));
  }

  /* ---- favicon ---- */
  const favicon = $('head link[rel~="icon"], head link[rel="shortcut icon"], head link[rel="apple-touch-icon"]').length;
  if (favicon === 0) {
    f.push(
      finding("seo-favicon-missing", [
        ev(
          "No <link rel=\"icon\"> found in <head>. (A /favicon.ico file may still exist, but an explicit link is more reliable.)",
          "V <head> nebyl nalezen <link rel=\"icon\">. (Soubor /favicon.ico může existovat, ale explicitní odkaz je spolehlivější.)"
        ),
      ])
    );
  } else {
    p.push(passed("seo-favicon-missing"));
  }

  /* ---- compression ---- */
  const encoding = page.headers["content-encoding"] ?? "";
  if (!/gzip|br|zstd|deflate/.test(encoding)) {
    f.push(
      finding("seo-compression-missing", [
        ev(
          `Response Content-Encoding header: ${encoding || "(none)"} for a ${Math.round(page.htmlBytes / 1024)} kB page.`,
          `Hlavička odpovědi Content-Encoding: ${encoding || "(žádná)"} u stránky o velikosti ${Math.round(page.htmlBytes / 1024)} kB.`
        ),
      ])
    );
  } else {
    p.push(passed("seo-compression-missing"));
  }

  /* ---- TTFB ---- */
  if (page.ttfbMs > 1500) {
    f.push(
      finding("seo-ttfb-slow", [
        ev(
          `Server response took ${(page.ttfbMs / 1000).toFixed(1)} s (good is under 0.8 s). Measured once from our server; a repeat scan may vary.`,
          `Odpověď serveru trvala ${(page.ttfbMs / 1000).toFixed(1).replace(".", ",")} s (dobrá hodnota je do 0,8 s). Měřeno jednorázově z našeho serveru; opakovaný sken se může lišit.`
        ),
      ])
    );
  } else {
    p.push(passed("seo-ttfb-slow"));
  }

  /* ---- HTML size ---- */
  if (page.htmlBytes > 400_000) {
    f.push(
      finding("seo-html-too-large", [
        ev(
          `HTML size: ${Math.round(page.htmlBytes / 1024)} kB (typical pages are under 100 kB).`,
          `Velikost HTML: ${Math.round(page.htmlBytes / 1024)} kB (běžné stránky mají do 100 kB).`
        ),
      ])
    );
  } else {
    p.push(passed("seo-html-too-large"));
  }

  /* ---- Core Web Vitals (from PSI when available) ---- */
  if (perf.source === "psi" && perf.performanceScore !== undefined) {
    if (perf.performanceScore < 50) {
      f.push(
        finding("seo-cwv-poor", [
          ev(
            `Lighthouse performance score: ${perf.performanceScore}/100.`,
            `Skóre výkonu Lighthouse: ${perf.performanceScore}/100.`
          ),
          ...(perf.lcpMs
            ? [ev(`Largest Contentful Paint: ${(perf.lcpMs / 1000).toFixed(1)} s (good ≤ 2.5 s).`,
                 `Largest Contentful Paint: ${(perf.lcpMs / 1000).toFixed(1).replace(".", ",")} s (dobré ≤ 2,5 s).`)]
            : []),
          ...(perf.cls !== undefined
            ? [ev(`Cumulative Layout Shift: ${perf.cls} (good ≤ 0.1).`,
                 `Cumulative Layout Shift: ${perf.cls} (dobré ≤ 0,1).`)]
            : []),
        ])
      );
    } else {
      p.push(passed("seo-cwv-poor"));
    }
  }
  // When PSI is unavailable we skip the CWV check entirely rather than guess —
  // TTFB and HTML size above are the honestly-measured fallback signals.

  /* ---- internal links ---- */
  const host = new URL(finalUrl).hostname;
  const internal = $("a[href]")
    .map((_, el) => $(el).attr("href")!)
    .get()
    .filter((href) => {
      try {
        const u = new URL(href, finalUrl);
        return u.hostname === host && u.pathname !== new URL(finalUrl).pathname;
      } catch {
        return false;
      }
    });
  if (internal.length < 3) {
    f.push(
      finding("seo-internal-links-few", [
        ev(
          `Only ${internal.length} internal link(s) found on the page.`,
          `Na stránce jsme našli jen ${internal.length} interních odkazů.`
        ),
      ])
    );
  } else {
    p.push(passed("seo-internal-links-few"));
  }

  return { findings: f, passed: p };
}

function evHttps(finalUrl: string): Finding {
  return finding("seo-https-missing", [
    ev(`The site is served from ${finalUrl}`, `Web běží na adrese ${finalUrl}`),
  ]);
}
