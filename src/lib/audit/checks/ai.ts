import type { SiteSnapshot } from "../fetcher";
import type { Finding, PassedCheck } from "../types";
import { ev, evRaw, finding, passed } from "../build";

export interface AiResult {
  findings: Finding[];
  passed: PassedCheck[];
}

const AI_BOTS = [
  { agent: "GPTBot", label: "ChatGPT (OpenAI)" },
  { agent: "ClaudeBot", label: "Claude (Anthropic)" },
  { agent: "PerplexityBot", label: "Perplexity" },
  { agent: "Google-Extended", label: "Google Gemini / AI training" },
  { agent: "CCBot", label: "Common Crawl (used to train many models)" },
];

/**
 * Parse robots.txt: is `path /` disallowed for a given user-agent?
 * Uses most-specific-group-wins like real crawlers do (simplified).
 */
function isBotBlocked(robots: string, agent: string): boolean {
  const lines = robots.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim());
  type Group = { agents: string[]; rules: { allow: boolean; path: string }[] };
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;
  for (const line of lines) {
    const ua = line.match(/^user-agent:\s*(.+)$/i);
    if (ua) {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(ua[1].trim().toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    const rule = line.match(/^(allow|disallow):\s*(.*)$/i);
    if (rule && current) {
      current.rules.push({ allow: rule[1].toLowerCase() === "allow", path: rule[2].trim() });
    }
  }
  const lc = agent.toLowerCase();
  // Prefer the group that names this bot; fall back to *
  const specific = groups.find((g) => g.agents.some((a) => a === lc));
  const star = groups.find((g) => g.agents.includes("*"));
  const group = specific ?? star;
  if (!group) return false;
  // Root access: blocked if a rule `Disallow: /` applies and no `Allow: /`
  let blocked = false;
  for (const r of group.rules) {
    if (r.path === "/" || r.path === "/*") blocked = !r.allow ? true : blocked;
    if (r.allow && (r.path === "/" || r.path === "")) return false;
  }
  return blocked;
}

interface JsonLdInfo {
  blocks: number;
  invalid: string[];
  types: Set<string>;
  hasSameAs: boolean;
}

function parseJsonLd(site: SiteSnapshot): JsonLdInfo {
  const { $ } = site;
  const info: JsonLdInfo = { blocks: 0, invalid: [], types: new Set(), hasSameAs: false };
  $('script[type="application/ld+json"]').each((i, el) => {
    info.blocks++;
    const raw = $(el).text();
    try {
      const data = JSON.parse(raw);
      const items = Array.isArray(data) ? data : data["@graph"] && Array.isArray(data["@graph"]) ? data["@graph"] : [data];
      for (const item of items) {
        if (item && typeof item === "object") {
          const t = item["@type"];
          const types = Array.isArray(t) ? t : t ? [t] : [];
          types.forEach((x: unknown) => typeof x === "string" && info.types.add(x));
          if (item.sameAs && (Array.isArray(item.sameAs) ? item.sameAs.length > 0 : true)) {
            info.hasSameAs = true;
          }
        }
      }
    } catch (e) {
      info.invalid.push(`Block #${i + 1}: ${(e as Error).message.slice(0, 100)}`);
    }
  });
  return info;
}

function visibleText(site: SiteSnapshot): string {
  const $ = site.$;
  const clone = $("body").clone();
  clone.find("script,style,noscript,svg,template").remove();
  return clone.text().replace(/\s+/g, " ").trim();
}

export function runAiChecks(site: SiteSnapshot): AiResult {
  const f: Finding[] = [];
  const p: PassedCheck[] = [];
  const { $ } = site;

  /* ---- AI crawler access ---- */
  if (site.robotsTxt) {
    const blocked = AI_BOTS.filter((b) => isBotBlocked(site.robotsTxt!, b.agent));
    const allowed = AI_BOTS.filter((b) => !isBotBlocked(site.robotsTxt!, b.agent));
    if (blocked.length > 0) {
      f.push(
        finding("ai-crawlers-blocked", [
          ev(
            `Blocked (${blocked.length}): ${blocked.map((b) => `${b.agent} — ${b.label}`).join("; ")}`,
            `Blokováno (${blocked.length}): ${blocked.map((b) => `${b.agent} — ${b.label}`).join("; ")}`
          ),
          ...(allowed.length
            ? [ev(
                `Allowed: ${allowed.map((b) => b.agent).join(", ")}`,
                `Povoleno: ${allowed.map((b) => b.agent).join(", ")}`
              )]
            : []),
        ])
      );
    } else {
      p.push(passed("ai-crawlers-blocked"));
    }
  } else {
    // no robots.txt at all → nothing is blocked
    p.push(passed("ai-crawlers-blocked"));
  }

  /* ---- structured data ---- */
  const jsonLd = parseJsonLd(site);
  if (jsonLd.blocks === 0) {
    f.push(
      finding("ai-no-structured-data", [
        ev(
          "No <script type=\"application/ld+json\"> blocks found on the page.",
          "Na stránce nebyly nalezeny žádné bloky <script type=\"application/ld+json\">."
        ),
      ])
    );
  } else {
    p.push(passed("ai-no-structured-data"));

    if (jsonLd.invalid.length > 0) {
      f.push(
        finding("ai-jsonld-invalid", [
          ev(
            `${jsonLd.invalid.length} of ${jsonLd.blocks} block(s) failed to parse:`,
            `${jsonLd.invalid.length} z ${jsonLd.blocks} bloků se nepodařilo zpracovat:`
          ),
          ...jsonLd.invalid.slice(0, 3).map((m) => evRaw(`• ${m}`)),
        ])
      );
    } else {
      p.push(passed("ai-jsonld-invalid"));
    }

    const orgTypes = ["Organization", "LocalBusiness", "Corporation", "OnlineStore", "Restaurant", "Store", "ProfessionalService", "MedicalBusiness", "LegalService", "Person"];
    const hasOrg = [...jsonLd.types].some((t) => orgTypes.some((o) => t.includes(o)));
    if (!hasOrg) {
      f.push(
        finding("ai-org-schema-missing", [
          ev(
            `Schema types found: ${[...jsonLd.types].slice(0, 8).join(", ") || "(none)"} — none identifies the organization.`,
            `Nalezené typy schémat: ${[...jsonLd.types].slice(0, 8).join(", ") || "(žádné)"} — žádný neidentifikuje organizaci.`
          ),
        ])
      );
    } else {
      p.push(passed("ai-org-schema-missing"));
      if (!jsonLd.hasSameAs) {
        f.push(
          finding("ai-sameas-missing", [
            ev(
              "The Organization schema contains no sameAs property.",
              "Schéma Organization neobsahuje vlastnost sameAs."
            ),
          ])
        );
      } else {
        p.push(passed("ai-sameas-missing"));
      }
    }
  }

  /* ---- FAQ / Q&A content ---- */
  const hasFaqSchema = [...jsonLd.types].some((t) => t === "FAQPage" || t === "QAPage" || t === "Question");
  const questionHeadings = $("h1,h2,h3,h4")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => /\?\s*$/.test(t));
  if (!hasFaqSchema && questionHeadings.length === 0) {
    f.push(
      finding("ai-faq-missing", [
        ev(
          "No FAQPage schema and no question-style headings found on the page.",
          "Na stránce není schéma FAQPage ani nadpisy ve formě otázek."
        ),
      ])
    );
  } else {
    p.push(passed("ai-faq-missing"));
  }

  /* ---- content volume ---- */
  const text = visibleText(site);
  const wordCount = text ? text.split(/\s+/).length : 0;
  if (wordCount < 150) {
    f.push(
      finding("ai-thin-content", [
        ev(
          `The page contains roughly ${wordCount} words of visible text. (If the site renders content only via JavaScript, crawlers that don't run JS see even less — that itself is a visibility problem.)`,
          `Stránka obsahuje zhruba ${wordCount} slov viditelného textu. (Pokud web vykresluje obsah jen JavaScriptem, roboti bez podpory JS vidí ještě méně — což je samo o sobě problém viditelnosti.)`
        ),
      ])
    );
  } else {
    p.push(passed("ai-thin-content"));

    /* ---- citability structure (only meaningful with enough text) ---- */
    const lists = $("ul li, ol li").length;
    const tables = $("table").length;
    const paragraphs = $("p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((t) => t.length > 0);
    const longParas = paragraphs.filter((t) => t.length > 700).length;
    const subheadings = $("h2,h3").length;
    const problems: { en: string; cs: string }[] = [];
    if (wordCount > 300 && subheadings === 0)
      problems.push({ en: "no H2/H3 subheadings to break up the text", cs: "žádné podnadpisy H2/H3, které by text členily" });
    if (wordCount > 300 && lists === 0 && tables === 0)
      problems.push({ en: "no bullet lists or tables", cs: "žádné odrážkové seznamy ani tabulky" });
    if (longParas > 2)
      problems.push({ en: `${longParas} very long paragraphs (700+ characters)`, cs: `${longParas} velmi dlouhých odstavců (700+ znaků)` });
    if (problems.length >= 2) {
      f.push(
        finding("ai-citability-weak", [
          ev(
            problems.map((x) => x.en).join("; ") + ".",
            problems.map((x) => x.cs).join("; ") + "."
          ),
        ])
      );
    } else {
      p.push(passed("ai-citability-weak"));
    }
  }

  /* ---- E-E-A-T signals ---- */
  const links = $("a[href]")
    .map((_, el) => ({ href: ($(el).attr("href") ?? "").toLowerCase(), text: $(el).text().toLowerCase() }))
    .get();
  const hasAbout = links.some(
    (l) => /about|o-nas|onas|o_nas|kdo-jsme|our-story|team/.test(l.href) || /about|o nás|kdo jsme|our story/.test(l.text)
  );
  const hasContact =
    links.some((l) => /contact|kontakt/.test(l.href) || /contact|kontakt/.test(l.text)) ||
    $('a[href^="mailto:"], a[href^="tel:"]').length > 0;
  const missing: { en: string; cs: string }[] = [];
  if (!hasAbout) missing.push({ en: "no visible “About” page link", cs: "chybí viditelný odkaz na stránku „O nás“" });
  if (!hasContact) missing.push({ en: "no visible contact link (contact page, e-mail or phone)", cs: "chybí viditelný kontakt (stránka kontaktů, e-mail nebo telefon)" });
  if (missing.length > 0) {
    f.push(
      finding("ai-eeat-weak", [
        ev(missing.map((m) => m.en).join("; ") + ".", missing.map((m) => m.cs).join("; ") + "."),
      ])
    );
  } else {
    p.push(passed("ai-eeat-weak"));
  }

  /* ---- llms.txt (experimental, informational) ---- */
  if (site.llmsTxt === null) {
    f.push(
      finding("ai-llms-txt-info", [
        ev("No file found at /llms.txt.", "Na adrese /llms.txt nebyl nalezen žádný soubor."),
      ])
    );
  } else {
    p.push(passed("ai-llms-txt-info"));
  }

  return { findings: f, passed: p };
}
