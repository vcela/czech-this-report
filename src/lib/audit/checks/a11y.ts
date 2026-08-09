import { JSDOM, VirtualConsole } from "jsdom";
import axeCore from "axe-core";
import type { SiteSnapshot } from "../fetcher";
import type { A11ySummary, Finding, PassedCheck } from "../types";
import { ev, evRaw, finding, passed } from "../build";

export interface A11yResult {
  findings: Finding[];
  passed: PassedCheck[];
  summary: A11ySummary;
}

/** axe rule id → our catalog check id (rules that share a check are grouped) */
const RULE_MAP: Record<string, string> = {
  "html-has-lang": "a11y-lang-missing",
  "html-lang-valid": "a11y-lang-missing",
  "image-alt": "a11y-img-alt",
  "input-image-alt": "a11y-img-alt",
  "area-alt": "a11y-img-alt",
  "object-alt": "a11y-img-alt",
  "svg-img-alt": "a11y-img-alt",
  label: "a11y-form-labels",
  "select-name": "a11y-form-labels",
  "link-name": "a11y-link-name",
  "button-name": "a11y-button-name",
  "input-button-name": "a11y-button-name",
  "meta-viewport": "a11y-zoom-disabled",
  bypass: "a11y-bypass",
  region: "a11y-bypass",
  tabindex: "a11y-tabindex-positive",
  "frame-title": "a11y-iframe-title",
};

const ARIA_PREFIX_CHECK = "a11y-aria-misuse";

/**
 * Memory here scales with element count, not page size: jsdom builds a node tree
 * and axe builds a second flattened tree over it, so a densely marked-up page can
 * cost hundreds of MB regardless of how few kilobytes it weighs. Past this many
 * elements we skip axe and fall back to the static checks — the same honest
 * "conformance: unknown" path used when axe fails for any other reason.
 * Real pages sit well under this; 25k elements is already an extreme outlier.
 */
const MAX_AXE_ELEMENTS = 25_000;

interface AxeViolationLite {
  id: string;
  help: string;
  helpUrl: string;
  impact: string | null;
  tags: string[];
  nodes: { target: string[]; html: string }[];
}

async function runAxe(site: SiteSnapshot): Promise<AxeViolationLite[] | null> {
  // cheap pre-check on the cheerio tree we already built, before paying for jsdom
  if (site.$("*").length > MAX_AXE_ELEMENTS) return null;

  // `pretendToBeVisual` starts a requestAnimationFrame loop that keeps the whole
  // window — DOM tree plus the ~700 kB of axe source eval'd into it — reachable
  // forever. It must be closed on every path, or each failed audit leaks a DOM.
  let dom: JSDOM | undefined;
  try {
    const virtualConsole = new VirtualConsole(); // swallow CSS/JS parse noise
    dom = new JSDOM(site.page.html, {
      url: site.page.finalUrl,
      pretendToBeVisual: true,
      virtualConsole,
      runScripts: "outside-only",
    });
    const { window } = dom;
    // inject axe into the jsdom window
    window.eval(axeCore.source);
    const axe = (window as unknown as { axe: typeof axeCore }).axe;
    const results = await axe.run(window.document.documentElement, {
      // rules that need real layout/rendering can't run in jsdom
      rules: {
        "color-contrast": { enabled: false },
        "color-contrast-enhanced": { enabled: false },
        "target-size": { enabled: false },
        "scrollable-region-focusable": { enabled: false },
      },
      resultTypes: ["violations", "passes"],
      elementRef: false,
    });
    const out = results.violations.map((v) => ({
      id: v.id,
      help: v.help,
      helpUrl: v.helpUrl,
      impact: v.impact ?? null,
      tags: v.tags,
      nodes: v.nodes.slice(0, 5).map((n) => ({
        target: n.target.map(String),
        html: n.html.slice(0, 160),
      })),
    }));
    (out as AxeViolationLite[] & { passCount?: number }).passCount = results.passes.length;
    return out;
  } catch {
    return null; // axe failed (unusual markup etc.) — fall back to static checks only
  } finally {
    dom?.window.close();
  }
}

function conformanceFromViolations(violations: AxeViolationLite[]): A11ySummary["conformance"] {
  const hasA = violations.some((v) => v.tags.includes("wcag2a") || v.tags.includes("wcag21a") || v.tags.includes("wcag22a"));
  const hasAA = violations.some((v) => v.tags.includes("wcag2aa") || v.tags.includes("wcag21aa") || v.tags.includes("wcag22aa"));
  if (hasA) return "below-a";
  if (hasAA) return "a";
  return "aa";
}

export async function runA11yChecks(site: SiteSnapshot): Promise<A11yResult> {
  const f: Finding[] = [];
  const p: PassedCheck[] = [];
  const { $ } = site;

  const violations = await runAxe(site);

  /* ---------- static checks that work even if axe fails ---------- */
  const lang = $("html").attr("lang")?.trim();
  const axeCoveredLang = violations?.some((v) => RULE_MAP[v.id] === "a11y-lang-missing");
  if (!lang && !axeCoveredLang) {
    f.push(finding("a11y-lang-missing", [evRaw("<html> has no lang attribute.")]));
  }

  const viewport = $('head meta[name="viewport"]').attr("content")?.toLowerCase() ?? "";
  const zoomBlocked =
    viewport.includes("user-scalable=no") ||
    viewport.includes("user-scalable=0") ||
    /maximum-scale\s*=\s*(1(\.\d+)?|0\.\d+)\b/.test(viewport);
  const axeCoveredZoom = violations?.some((v) => RULE_MAP[v.id] === "a11y-zoom-disabled");
  if (zoomBlocked && !axeCoveredZoom) {
    f.push(finding("a11y-zoom-disabled", [evRaw(`<meta name="viewport" content="${viewport}">`)]));
  }

  /* ---------- axe results mapped to catalog ---------- */
  let axeViolationCount = 0;
  let axePassCount = 0;
  let conformance: A11ySummary["conformance"] = "unknown";

  if (violations) {
    axeViolationCount = violations.reduce((acc, v) => acc + Math.max(v.nodes.length, 1), 0);
    axePassCount = (violations as AxeViolationLite[] & { passCount?: number }).passCount ?? 0;
    conformance = conformanceFromViolations(violations);

    const grouped = new Map<string, AxeViolationLite[]>();
    const other: AxeViolationLite[] = [];
    for (const v of violations) {
      const checkId = RULE_MAP[v.id] ?? (v.id.startsWith("aria-") ? ARIA_PREFIX_CHECK : null);
      if (checkId) {
        const list = grouped.get(checkId) ?? [];
        list.push(v);
        grouped.set(checkId, list);
      } else {
        other.push(v);
      }
    }

    for (const [checkId, vs] of grouped) {
      const evidence = vs.flatMap((v) => [
        ev(
          `Rule “${v.id}”: ${v.help} (${vs.length > 1 ? "" : ""}${v.nodes.length} element(s) affected)`,
          `Pravidlo „${v.id}“: ${v.help} (dotčené prvky: ${v.nodes.length})`
        ),
        ...v.nodes.slice(0, 3).map((n) => evRaw(`  • ${n.target.join(" ")} — ${n.html}`)),
      ]);
      f.push(finding(checkId, evidence));
    }

    if (other.length > 0) {
      f.push(
        finding(
          "a11y-axe-other",
          other.flatMap((v) => [
            evRaw(`• ${v.id}: ${v.help} (${v.nodes.length}×) — ${v.helpUrl}`),
            ...v.nodes.slice(0, 2).map((n) => evRaw(`    ${n.target.join(" ")}`)),
          ])
        )
      );
    }

    // record passes for checks that produced no violations
    const failedCheckIds = new Set(f.map((x) => x.checkId));
    const allMapped = new Set([...Object.values(RULE_MAP), ARIA_PREFIX_CHECK, "a11y-axe-other"]);
    for (const checkId of allMapped) {
      if (!failedCheckIds.has(checkId)) p.push(passed(checkId));
    }
  } else {
    // axe unavailable — only report the static checks' passes
    if (lang) p.push(passed("a11y-lang-missing"));
    if (!zoomBlocked && viewport) p.push(passed("a11y-zoom-disabled"));
  }

  return {
    findings: f,
    passed: p,
    summary: {
      axeViolationCount,
      axePassCount,
      conformance,
      automatedCoverageNote: true,
    },
  };
}

/**
 * Items automated tools cannot verify — shown as a manual checklist.
 * WCAG automated coverage is only ~30–50 %, so this list is essential
 * for honest reporting.
 */
export const MANUAL_CHECKLIST: {
  id: string;
  wcag: string;
  en: { title: string; how: string };
  cs: { title: string; how: string };
}[] = [
  {
    id: "keyboard",
    wcag: "2.1.1 (A)",
    en: {
      title: "Everything works with a keyboard alone",
      how: "Unplug your mouse and try to use the whole site with Tab, Enter and arrow keys — menus, forms, pop-ups, carousels. If you get stuck anywhere, so does anyone who can't use a mouse.",
    },
    cs: {
      title: "Vše funguje jen s klávesnicí",
      how: "Odpojte myš a zkuste celý web ovládat jen klávesami Tab, Enter a šipkami — menu, formuláře, vyskakovací okna, carousely. Kde se zaseknete vy, tam se zasekne každý, kdo myš používat nemůže.",
    },
  },
  {
    id: "focus-visible",
    wcag: "2.4.7 (AA)",
    en: {
      title: "You can always see which element is focused",
      how: "While tabbing through the site, a visible outline must show where you are. If the outline was removed for aesthetics, keyboard users are navigating blind.",
    },
    cs: {
      title: "Vždy je vidět, který prvek je vybraný",
      how: "Při procházení webu tabulátorem musí být viditelný rámeček ukazující, kde se nacházíte. Pokud byl kvůli vzhledu odstraněn, uživatelé klávesnice se pohybují poslepu.",
    },
  },
  {
    id: "contrast",
    wcag: "1.4.3 (AA)",
    en: {
      title: "Text has enough contrast against its background",
      how: "Check grey-on-white texts, text over photos and buttons with a contrast checker (e.g. WebAIM Contrast Checker). Normal text needs a ratio of at least 4.5:1. Note: automated scans of live pages can measure this; our HTML-level scan cannot, so verify it manually or with a browser extension.",
    },
    cs: {
      title: "Text má dostatečný kontrast vůči pozadí",
      how: "Zkontrolujte šedé texty na bílé, texty přes fotky a tlačítka nástrojem na kontrast (např. WebAIM Contrast Checker). Běžný text potřebuje poměr aspoň 4,5:1. Pozn.: automatické testy v prohlížeči to změřit umí; náš sken na úrovni HTML ne, proto ověřte ručně nebo rozšířením prohlížeče.",
    },
  },
  {
    id: "target-size",
    wcag: "2.5.8 (AA)",
    en: {
      title: "Buttons and links are big enough to tap",
      how: "On a phone, every tap target should be at least 24×24 px (ideally 44×44) with spacing between targets. Tiny close buttons and cramped menus fail this.",
    },
    cs: {
      title: "Tlačítka a odkazy jsou dost velké na doťuknutí",
      how: "Na mobilu by měl mít každý dotykový cíl aspoň 24×24 px (ideálně 44×44) a rozestupy od okolních. Miniaturní zavírací křížky a natěsnaná menu tímto neprojdou.",
    },
  },
  {
    id: "media-alternatives",
    wcag: "1.2.2 / 1.2.5 (A/AA)",
    en: {
      title: "Videos have captions, podcasts have transcripts",
      how: "Every video with speech needs captions (not just auto-generated ones full of errors); audio content needs a text transcript.",
    },
    cs: {
      title: "Videa mají titulky, podcasty přepisy",
      how: "Každé video s mluveným slovem potřebuje titulky (ne jen automatické plné chyb); zvukový obsah potřebuje textový přepis.",
    },
  },
  {
    id: "error-messages",
    wcag: "3.3.1 / 3.3.3 (A/AA)",
    en: {
      title: "Form errors say what's wrong and how to fix it",
      how: "Submit a form with mistakes on purpose. The error must be announced in text next to the field (“Enter an e-mail in the format name@domain.com”), not just by turning the border red.",
    },
    cs: {
      title: "Chyby ve formulářích říkají, co je špatně a jak to opravit",
      how: "Odešlete formulář schválně s chybami. Chyba musí být oznámena textem u pole („Zadejte e-mail ve formátu jmeno@domena.cz“), ne jen červeným rámečkem.",
    },
  },
  {
    id: "motion",
    wcag: "2.2.2 (A)",
    en: {
      title: "Moving content can be paused",
      how: "Auto-playing carousels, videos and animations longer than 5 seconds need a pause button. Motion can make content unreadable for many people and triggers vestibular disorders.",
    },
    cs: {
      title: "Pohyblivý obsah jde zastavit",
      how: "Automaticky jedoucí carousely, videa a animace delší než 5 vteřin potřebují tlačítko pauzy. Pohyb mnoha lidem znemožňuje čtení a spouští vestibulární potíže.",
    },
  },
  {
    id: "zoom-200",
    wcag: "1.4.10 (AA)",
    en: {
      title: "The site stays usable at 200 % zoom",
      how: "Press Ctrl and + until the browser shows 200 %. All content must remain readable and functional without horizontal scrolling.",
    },
    cs: {
      title: "Web zůstává použitelný při 200% přiblížení",
      how: "Stiskněte Ctrl a + dokud prohlížeč neukáže 200 %. Veškerý obsah musí zůstat čitelný a funkční bez vodorovného posouvání.",
    },
  },
];
