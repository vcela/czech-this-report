import type { Locale } from "./index";

const en = {
  siteName: "Czech Th!s Report",
  tagline: "Free website audit: AI visibility, SEO & accessibility",

  nav: {
    home: "New audit",
    methodology: "Methodology",
    guides: "Guides",
    about: "About & contact",
    skipToContent: "Skip to content",
    switchLocale: "Přepnout do češtiny",
    switchLocaleShort: "Čeština",
  },

  home: {
    heroTitle: "Is your website invisible to Google, AI assistants — or actual people?",
    heroSubtitle:
      "Enter any address and get a free, prioritized report on AI search visibility, SEO and accessibility. In plain language: what's wrong, why it costs you customers, and who can fix it.",
    urlLabel: "Website address",
    urlPlaceholder: "e.g. your-company.com",
    submit: "Audit my website",
    submitting: "Auditing…",
    progress: [
      "Fetching your page…",
      "Reading robots.txt and sitemap…",
      "Checking structured data…",
      "Running accessibility tests…",
      "Measuring loading speed (this takes the longest)…",
      "Scoring and writing your report…",
    ],
    free: "Free for everyone. No sign-up. Results saved under a link you can share.",
    pillarsTitle: "What we check",
    pillars: {
      ai: {
        title: "AI search visibility",
        text: "Can ChatGPT, Perplexity and Google's AI answers read, understand and cite your site? AI assistants are becoming the first place people ask for recommendations.",
      },
      seo: {
        title: "SEO & Google",
        text: "The classics that still decide most traffic: titles, indexability, sitemap, mobile readiness, loading speed, structured data.",
      },
      a11y: {
        title: "Accessibility (WCAG 2.2)",
        text: "Whether people with impaired vision, motor skills or other limitations can use your site — and whether you meet the European Accessibility Act.",
      },
    },
    howTitle: "How it works",
    how: [
      { title: "Paste your address", text: "We fetch your homepage, robots.txt, sitemap and more — read-only, nothing is changed." },
      { title: "We run 40+ checks", text: "Real measurements across three pillars, scored by impact and ease of fix. Measured facts are clearly separated from estimates." },
      { title: "You get a to-do list", text: "Not a wall of text: the 3–5 things to fix first, what fixing them gets you, and which profession to hire for each." },
    ],
    errorInvalid: "That doesn't look like a valid public website address. Please check it and try again.",
    errorUnreachable: "We couldn't reach that website. Check the address, or try again in a minute.",
    errorSiteError: "The website responded with an error, so we couldn't audit it.",
    errorRateLimit: "You've run a lot of audits in a short time. Please wait a few minutes and try again.",
    errorGeneric: "Something went wrong on our side. Please try again.",
  },

  report: {
    title: "Audit report",
    for: "Report for",
    scanned: "Scanned",
    duration: "scan took",
    overall: "Overall score",
    pillarScores: "Pillar scores",
    fixFirst: "Fix these first",
    fixFirstNote: "The few changes with the biggest payoff for the least effort. Start here.",
    allFindings: "All findings",
    passedTitle: "What's already working",
    passedNote: "checks passed",
    filters: {
      all: "All",
      pillar: "Pillar",
      priority: "Priority",
      role: "Who fixes it",
    },
    finding: {
      why: "Why it matters",
      evidence: "How we know",
      fix: "How to fix it",
      who: "Who to task",
      wcag: "WCAG criterion",
      more: "Show details",
      less: "Hide details",
      resolved: "Mark as resolved",
      unresolved: "Resolved — undo",
      quickWin: "Quick win",
      measured: "Measured",
      estimated: "Estimate",
      notTested: "Not tested",
      measuredTip: "This value was actually measured on your site.",
      estimatedTip: "This is an estimate from indirect signals, not a direct measurement.",
    },
    priorities: { critical: "Critical", high: "High", medium: "Medium", low: "Low" },
    pillarNames: { ai: "AI visibility", seo: "SEO", a11y: "Accessibility" },
    bands: { red: "Needs urgent attention", orange: "Room to improve", green: "In good shape" },
    conformance: {
      title: "Estimated WCAG conformance",
      "below-a": "Does not meet level A",
      a: "Meets level A, not AA",
      aa: "No automated A/AA failures found",
      unknown: "Could not be determined automatically",
      note: "Automated tools cover only ~30–50 % of WCAG criteria. This estimate reflects automated checks only — full conformance requires the manual checks below.",
      legal: "Since June 2025, the European Accessibility Act (EAA) requires most e-shops and consumer services in the EU to meet WCAG 2.1 AA (per EN 301 549).",
    },
    manualTitle: "What a machine can't check — do this by hand",
    manualNote: "These require a human. Each takes a few minutes and covers the part of WCAG automated tests can't see.",
    manualHow: "How to check",
    aiNote: {
      title: "How we test AI visibility",
      text: "Everything above is measured directly on your site (crawler access, structured data, content signals). What this free scan does NOT do is query ChatGPT, Perplexity or Gemini with real customer prompts to see if they mention you — that requires paid API calls per scan. We'd rather tell you that openly than show you a made-up number.",
      cta: "Want a real AI mention test with live prompts? That's part of the paid deep audit — get in touch below.",
      selfTest: {
        show: "Show prompts to test it yourself",
        hide: "Hide prompts",
        intro: "You can do a quick version yourself in a few minutes. Open each assistant, paste a prompt below, and see whether it mentions your site. Replace anything in [square brackets] with your own product, service or region first.",
        chatsLabel: "Open an assistant:",
        note: "Claude and Gemini answer mostly from training data unless you turn on web search, so a missing mention there can just mean they haven't crawled you yet. ChatGPT (with search) and Perplexity look at the live web and cite sources — watch whether your domain appears among them.",
        copy: "Copy",
        copied: "Copied!",
        promptsLabel: "Prompts to try:",
        prompts: [
          {
            label: "Discovery — do they recommend you unprompted?",
            text: "I'm looking for [your product or service] in [city / region / country]. Recommend the 5 best options and say why for each one.",
          },
          {
            label: "Brand knowledge — what does the AI know about you?",
            text: "What do you know about the website {host}? What does it do, who is it for, and is it a trustworthy source?",
          },
          {
            label: "Comparison — how do you stack up against rivals?",
            text: "Compare {host} with its main competitors in [your field]. Who would you recommend to whom, and why?",
          },
        ],
      },
    },
    fixPrompt: {
      title: "Fix it with AI — ready-made prompt",
      intro:
        "Copy this prompt and paste it into an AI coding assistant (Claude Code, Cursor, Copilot…). It lists every finding with concrete fixes, so the assistant can apply them straight to your website's code.",
      copy: "Copy prompt",
      copied: "Copied!",
      hint: "Works best when you run the assistant inside your project, so it can read and edit your files. Always review its changes and re-scan afterwards.",
      show: "Preview prompt",
      hide: "Hide prompt",
      // --- building blocks of the prompt body itself ---
      lead:
        "You are an expert web developer. An automated audit of {url} (AI visibility, SEO and WCAG 2.2 accessibility) produced the findings below. Fix them directly in this project's source code.",
      rules:
        "Rules: work through the findings in the order given (most important first). For each one, locate the relevant code, apply the fix, and keep a short note of what you changed. Do not fabricate content, scores or metadata — if a fix needs real information (a business address, alt text, a meta description), ask me instead of inventing it. Findings marked \"Estimate\" or \"Not tested\" are based on indirect signals; verify them before making large changes.",
      findingsHeading: "FINDINGS TO FIX:",
      noFindings: "The audit found no actionable issues — there is nothing to fix. 🎉",
      whyLabel: "Why it matters",
      evidenceLabel: "Evidence",
      fixLabel: "How to fix",
      wcagLabel: "WCAG",
      whoLabel: "Typical role",
      closing:
        "When you're done, give me a concise summary of every change you made, grouped by finding, and list anything you couldn't fix and why.",
    },
    perf: {
      titleMeasured: "Loading speed (measured by Google Lighthouse)",
      titleBasic: "Loading speed (basic measurements)",
      basicNote: "Google's PageSpeed test wasn't available during this scan, so we only show what we measured ourselves — server response time and page size. Run a re-scan to try again.",
      score: "Performance score",
      lcp: "Largest content paint",
      cls: "Layout shift",
      ttfb: "Server response",
      htmlSize: "HTML size",
    },
    share: {
      title: "Share this report",
      note: "This report lives at a permanent link — send it to your developer or agency as-is.",
      copy: "Copy link",
      copied: "Link copied!",
      pdf: "Save as PDF",
      rescan: "Re-scan this site",
      rescanning: "Re-scanning…",
      staleTitle: "Already fixed it, but the finding didn't change?",
      staleText: "Every scan fetches your live page fresh — we never reuse an old result. If a fix still isn't reflected after a re-scan, check two things: (1) your host, CMS caching plugin or CDN (Cloudflare etc.) may still be serving a cached copy of the page — clear that cache and try again in a few minutes; (2) we read the page's raw HTML only, without running JavaScript — if your title or meta tags are inserted by a script rather than present in the server's response, view the page source (Ctrl/Cmd+U) to see exactly what we see.",
    },
    compare: {
      title: "Progress since last scan",
      overall: "Overall",
      improved: "improved",
      worsened: "dropped",
      unchanged: "unchanged",
    },
    hire: {
      title: "Want this fixed for you?",
      text: "I'm Ondřej Huk (Czech Th!s) — I build and repair websites exactly like this report describes. Send me the report and I'll tell you what I'd fix, in what order, and what it would cost. No obligation.",
      name: "Your name",
      email: "Your e-mail",
      message: "What would you like help with?",
      messagePrefill: "Hi, I'd like help with the findings in this report.",
      send: "Send enquiry",
      sending: "Sending…",
      sent: "Thanks! I'll get back to you within one business day.",
      error: "Sending failed — please try again or e-mail me directly.",
      privacy: "Your details are used only to reply to this enquiry. Nothing else.",
    },
    notFoundTitle: "Report not found",
    notFoundText: "This report doesn't exist or the link is incomplete. Reports are kept under their exact address — check the link, or run a new audit.",
    runNew: "Run a new audit",
  },

  methodology: {
    title: "Methodology: how scores are calculated",
    intro: "No black box. This page describes exactly what we check, how findings are prioritized, and how the numbers are computed — including what this tool can't measure.",
  },

  about: {
    title: "About this tool",
    contactTitle: "Get in touch",
  },

  donate: {
    title: "Support this tool",
    text: "The audit is free for everyone and always will be. If it saved you money or a bad decision, you can chip in for server and testing costs.",
    button: "Donate via Stripe",
  },

  footer: {
    made: "Created by",
    at: "at",
    freeNote: "Free audit tool — no sign-up, no paywall.",
    a11yStatement: "Accessibility statement",
  },

  errors: {
    notFound: "Page not found",
  },
};

/* Czech — written natively, not machine-translated */
const cs: typeof en = {
  siteName: "Czech Th!s Report",
  tagline: "Audit webu zdarma: AI viditelnost, SEO a přístupnost",

  nav: {
    home: "Nový audit",
    methodology: "Metodika",
    guides: "Průvodce",
    about: "O nástroji a kontakt",
    skipToContent: "Přeskočit na obsah",
    switchLocale: "Switch to English",
    switchLocaleShort: "English",
  },

  home: {
    heroTitle: "Je váš web neviditelný pro Google, AI asistenty — nebo pro živé lidi?",
    heroSubtitle:
      "Zadejte libovolnou adresu a dostanete zdarma priorizovaný report o viditelnosti v AI vyhledávání, SEO a přístupnosti. Lidskou řečí: co je špatně, proč vás to stojí zákazníky a kdo to umí spravit.",
    urlLabel: "Adresa webu",
    urlPlaceholder: "např. vase-firma.cz",
    submit: "Prověřit můj web",
    submitting: "Prověřuji…",
    progress: [
      "Načítám vaši stránku…",
      "Čtu robots.txt a sitemapu…",
      "Kontroluji strukturovaná data…",
      "Spouštím testy přístupnosti…",
      "Měřím rychlost načítání (trvá nejdéle)…",
      "Počítám skóre a píšu report…",
    ],
    free: "Zdarma pro všechny. Bez registrace. Výsledek se uloží pod odkaz, který můžete sdílet.",
    pillarsTitle: "Co kontrolujeme",
    pillars: {
      ai: {
        title: "Viditelnost v AI vyhledávání",
        text: "Umí ChatGPT, Perplexity a AI odpovědi Googlu váš web přečíst, pochopit a citovat? AI asistenti se stávají prvním místem, kde se lidé ptají na doporučení.",
      },
      seo: {
        title: "SEO a Google",
        text: "Klasika, která pořád rozhoduje o většině návštěvnosti: titulky, indexace, sitemapa, mobilní verze, rychlost, strukturovaná data.",
      },
      a11y: {
        title: "Přístupnost (WCAG 2.2)",
        text: "Jestli váš web zvládnou používat lidé se zhoršeným zrakem, motorikou a dalšími omezeními — a jestli plníte evropský akt o přístupnosti.",
      },
    },
    howTitle: "Jak to funguje",
    how: [
      { title: "Vložíte adresu", text: "Načteme vaši úvodní stránku, robots.txt, sitemapu a další — jen ke čtení, nic neměníme." },
      { title: "Proběhne 40+ kontrol", text: "Reálná měření napříč třemi pilíři, hodnocená podle dopadu a snadnosti opravy. Změřená fakta jasně oddělujeme od odhadů." },
      { title: "Dostanete seznam úkolů", text: "Žádná zeď textu: 3–5 věcí k opravě jako první, co vám oprava přinese a jakou profesi na kterou poptat." },
    ],
    errorInvalid: "Tohle nevypadá jako platná adresa veřejného webu. Zkontrolujte ji prosím a zkuste to znovu.",
    errorUnreachable: "Web se nám nepodařilo načíst. Zkontrolujte adresu, nebo to zkuste za chvíli.",
    errorSiteError: "Web odpověděl chybou, takže jsme ho nemohli prověřit.",
    errorRateLimit: "Spustili jste hodně auditů za krátkou dobu. Počkejte prosím pár minut a zkuste to znovu.",
    errorGeneric: "Něco se pokazilo na naší straně. Zkuste to prosím znovu.",
  },

  report: {
    title: "Výsledek auditu",
    for: "Report pro",
    scanned: "Prověřeno",
    duration: "sken trval",
    overall: "Celkové skóre",
    pillarScores: "Skóre pilířů",
    fixFirst: "Opravte nejdřív tohle",
    fixFirstNote: "Pár změn s největším přínosem za nejmenší námahu. Začněte tady.",
    allFindings: "Všechny nálezy",
    passedTitle: "Co už funguje dobře",
    passedNote: "kontrol prošlo",
    filters: {
      all: "Vše",
      pillar: "Pilíř",
      priority: "Priorita",
      role: "Kdo to spraví",
    },
    finding: {
      why: "Proč to vadí",
      evidence: "Jak to víme",
      fix: "Jak to spravit",
      who: "Koho úkolovat",
      wcag: "Kritérium WCAG",
      more: "Zobrazit detaily",
      less: "Skrýt detaily",
      resolved: "Označit jako vyřešené",
      unresolved: "Vyřešeno — vrátit zpět",
      quickWin: "Rychlá výhra",
      measured: "Změřeno",
      estimated: "Odhad",
      notTested: "Netestováno",
      measuredTip: "Tato hodnota byla na vašem webu skutečně změřena.",
      estimatedTip: "Toto je odhad z nepřímých signálů, ne přímé měření.",
    },
    priorities: { critical: "Kritické", high: "Vysoká", medium: "Střední", low: "Nízká" },
    pillarNames: { ai: "AI viditelnost", seo: "SEO", a11y: "Přístupnost" },
    bands: { red: "Vyžaduje okamžitou pozornost", orange: "Prostor ke zlepšení", green: "V dobré kondici" },
    conformance: {
      title: "Odhadovaná shoda s WCAG",
      "below-a": "Nesplňuje úroveň A",
      a: "Splňuje úroveň A, ne AA",
      aa: "Bez automaticky zjištěných chyb úrovně A/AA",
      unknown: "Nepodařilo se automaticky určit",
      note: "Automatické nástroje pokryjí jen ~30–50 % kritérií WCAG. Tento odhad vychází pouze z automatických kontrol — úplná shoda vyžaduje i ruční kontroly níže.",
      legal: "Od června 2025 vyžaduje evropský akt o přístupnosti (EAA), aby většina e-shopů a spotřebitelských služeb v EU splňovala WCAG 2.1 AA (dle EN 301 549).",
    },
    manualTitle: "Co stroj nezkontroluje — projděte ručně",
    manualNote: "Tady je potřeba člověk. Každá kontrola zabere pár minut a pokrývá část WCAG, kterou automatické testy nevidí.",
    manualHow: "Jak zkontrolovat",
    aiNote: {
      title: "Jak testujeme AI viditelnost",
      text: "Vše výše je změřeno přímo na vašem webu (přístup robotů, strukturovaná data, obsahové signály). Co tento bezplatný sken NEDĚLÁ: neptá se ChatGPT, Perplexity ani Gemini reálnými zákaznickými dotazy, jestli vás zmiňují — to vyžaduje placené API volání za každý sken. Radši vám to řekneme na rovinu, než abychom ukázali vymyšlené číslo.",
      cta: "Chcete skutečný test AI zmínek s živými dotazy? Je součástí placeného hloubkového auditu — ozvěte se níže.",
      selfTest: {
        show: "Zobrazit prompty pro vlastní test",
        hide: "Skrýt prompty",
        intro: "Rychlou verzi si můžete udělat sami za pár minut. Otevřete si každého asistenta, vložte některý z promptů níže a sledujte, jestli váš web zmíní. Nejdřív nahraďte text v [hranatých závorkách] svým produktem, službou nebo regionem.",
        chatsLabel: "Otevřít asistenta:",
        note: "Claude a Gemini odpovídají bez zapnutého vyhledávání hlavně z trénovacích dat — chybějící zmínka tam může znamenat jen to, že vás zatím nenačetli. ChatGPT (s vyhledáváním) a Perplexity se dívají do živého webu a uvádějí zdroje — sledujte, jestli je mezi nimi vaše doména.",
        copy: "Kopírovat",
        copied: "Zkopírováno!",
        promptsLabel: "Prompty k vyzkoušení:",
        prompts: [
          {
            label: "Objevení — doporučí vás sami od sebe?",
            text: "Hledám [tvůj produkt nebo službu] v [město / region / ČR]. Doporuč mi 5 nejlepších možností a u každé napiš proč.",
          },
          {
            label: "Znalost značky — co o vás AI ví?",
            text: "Co víš o webu {host}? Čím se zabývá, komu je určený a je to důvěryhodný zdroj?",
          },
          {
            label: "Srovnání — jak obstojíte proti konkurenci?",
            text: "Porovnej {host} s hlavní konkurencí v [tvůj obor]. Komu bys doporučil koho a proč?",
          },
        ],
      },
    },
    fixPrompt: {
      title: "Opravit pomocí AI — hotový prompt",
      intro:
        "Zkopírujte tento prompt a vložte ho do AI asistenta pro kódování (Claude Code, Cursor, Copilot…). Obsahuje všechny nálezy i s konkrétními opravami, takže asistent může chyby rovnou zapracovat do kódu vašeho webu.",
      copy: "Zkopírovat prompt",
      copied: "Zkopírováno!",
      hint: "Nejlépe funguje, když asistenta spustíte přímo ve svém projektu, aby mohl číst a upravovat vaše soubory. Jeho změny si vždy zkontrolujte a poté spusťte re-sken.",
      show: "Zobrazit prompt",
      hide: "Skrýt prompt",
      // --- stavební části samotného textu promptu ---
      lead:
        "Jsi zkušený webový vývojář. Automatický audit webu {url} (AI viditelnost, SEO a přístupnost dle WCAG 2.2) našel níže uvedené nálezy. Oprav je přímo ve zdrojovém kódu tohoto projektu.",
      rules:
        "Pravidla: procházej nálezy v uvedeném pořadí (nejdůležitější první). U každého najdi příslušný kód, proveď opravu a stručně si poznač, co jsi změnil. Nic si nevymýšlej — obsah, čísla ani metadata; pokud oprava potřebuje reálný údaj (adresu firmy, alt text, popisek stránky), zeptej se mě, místo abys ho vymýšlel. Nálezy označené „Odhad“ nebo „Netestováno“ vycházejí z nepřímých signálů; před většími zásahy si je ověř.",
      findingsHeading: "NÁLEZY K OPRAVĚ:",
      noFindings: "Audit nenašel nic, co by šlo opravit — není co řešit. 🎉",
      whyLabel: "Proč to vadí",
      evidenceLabel: "Důkaz",
      fixLabel: "Jak opravit",
      wcagLabel: "WCAG",
      whoLabel: "Obvyklá role",
      closing:
        "Až budeš hotov, dej mi stručné shrnutí všech provedených změn seskupené podle nálezů a vypiš, co se ti nepodařilo opravit a proč.",
    },
    perf: {
      titleMeasured: "Rychlost načítání (změřeno Google Lighthouse)",
      titleBasic: "Rychlost načítání (základní měření)",
      basicNote: "Test PageSpeed od Googlu nebyl během skenu dostupný, proto ukazujeme jen to, co jsme změřili sami — odezvu serveru a velikost stránky. Zkuste re-sken.",
      score: "Skóre výkonu",
      lcp: "Vykreslení hlavního obsahu",
      cls: "Poskakování rozložení",
      ttfb: "Odezva serveru",
      htmlSize: "Velikost HTML",
    },
    share: {
      title: "Sdílet report",
      note: "Report má trvalý odkaz — pošlete ho svému vývojáři nebo agentuře tak, jak je.",
      copy: "Zkopírovat odkaz",
      copied: "Odkaz zkopírován!",
      pdf: "Uložit jako PDF",
      rescan: "Znovu prověřit web",
      rescanning: "Prověřuji znovu…",
      staleTitle: "Už jste to opravili, ale nález se nezměnil?",
      staleText: "Každý sken načítá vaši živou stránku znovu — nikdy nepoužíváme starý výsledek. Pokud se oprava neprojeví ani po re-scanu, zkontrolujte dvě věci: (1) váš hosting, cachovací plugin v redakčním systému nebo CDN (např. Cloudflare) může pořád servírovat uloženou starou verzi stránky — vyčistěte tuto cache a zkuste to za pár minut znovu; (2) čteme jen syrové HTML ze serveru, bez spouštění JavaScriptu — pokud se váš titulek nebo meta značky vkládají až skriptem, ne přímo v odpovědi serveru, zobrazte si zdrojový kód stránky (Ctrl/Cmd+U) a uvidíte přesně to, co vidíme my.",
    },
    compare: {
      title: "Pokrok od minulého skenu",
      overall: "Celkem",
      improved: "zlepšeno",
      worsened: "zhoršeno",
      unchanged: "beze změny",
    },
    hire: {
      title: "Chcete to nechat spravit?",
      text: "Jsem Ondřej Huk (Czech Th!s) — weby přesně podle takových reportů stavím a opravuji. Pošlete mi report a řeknu vám, co bych opravil, v jakém pořadí a kolik by to stálo. Nezávazně.",
      name: "Vaše jméno",
      email: "Váš e-mail",
      message: "S čím byste chtěli pomoct?",
      messagePrefill: "Dobrý den, chtěl(a) bych pomoct s nálezy z tohoto reportu.",
      send: "Odeslat poptávku",
      sending: "Odesílám…",
      sent: "Díky! Ozvu se do jednoho pracovního dne.",
      error: "Odeslání se nepovedlo — zkuste to znovu, nebo mi napište přímo.",
      privacy: "Vaše údaje použijeme jen k odpovědi na tuto poptávku. K ničemu jinému.",
    },
    notFoundTitle: "Report nenalezen",
    notFoundText: "Tento report neexistuje, nebo je odkaz neúplný. Reporty se uchovávají pod přesnou adresou — zkontrolujte odkaz, nebo spusťte nový audit.",
    runNew: "Spustit nový audit",
  },

  methodology: {
    title: "Metodika: jak se počítá skóre",
    intro: "Žádná černá skříňka. Tato stránka popisuje, co přesně kontrolujeme, jak se nálezy priorizují a jak vznikají čísla — včetně toho, co tento nástroj změřit neumí.",
  },

  about: {
    title: "O nástroji",
    contactTitle: "Napište mi",
  },

  donate: {
    title: "Podpořte provoz nástroje",
    text: "Audit je a zůstane zdarma pro všechny. Pokud vám ušetřil peníze nebo špatné rozhodnutí, můžete přispět na server a testovací náklady.",
    button: "Přispět přes Stripe",
  },

  footer: {
    made: "Vytvořil",
    at: "ve studiu",
    freeNote: "Bezplatný auditní nástroj — bez registrace, bez paywallu.",
    a11yStatement: "Prohlášení o přístupnosti",
  },

  errors: {
    notFound: "Stránka nenalezena",
  },
};

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, cs };

export function getDict(locale: Locale): Dictionary {
  return dictionaries[locale];
}
