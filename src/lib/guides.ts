import type { Locale } from "./i18n";

export interface GuideSection {
  h: string;
  body: string[];
}

export interface GuideContent {
  title: string;
  description: string;
  sections: GuideSection[];
}

export interface Guide {
  slug: string;
  en: GuideContent;
  cs: GuideContent;
}

export const GUIDES: Guide[] = [
  {
    slug: "ai-visibility",
    en: {
      title: "AI search visibility (GEO): how to get cited by ChatGPT & co.",
      description:
        "What Generative Engine Optimization is, how AI assistants pick which websites to recommend, and the concrete steps that make your site citable.",
      sections: [
        {
          h: "Why this matters now",
          body: [
            "A growing share of buying decisions starts with a question to ChatGPT, Perplexity or Google's AI Overviews instead of a classic search. The AI's answer usually names a handful of brands — and everyone else is invisible. Getting into those answers is what GEO (Generative Engine Optimization) and AEO (Answer Engine Optimization) are about.",
            "The good news: AI systems read the same web as Google. Much of what works for SEO works here too — but a few things matter disproportionately more.",
          ],
        },
        {
          h: "1. Let AI crawlers in",
          body: [
            "Each AI provider reads the web with its own crawler: GPTBot (OpenAI), ClaudeBot (Anthropic), PerplexityBot, Google-Extended. Your robots.txt file decides which of them may read your site. Many sites block them all by accident — a blanket rule copied from a template — and then wonder why AI never mentions them.",
            "Blocking AI crawlers is a legitimate choice (for example for paywalled content). It should just be a conscious one: whoever the AI can't read, it can't recommend.",
          ],
        },
        {
          h: "2. Say who you are in structured data",
          body: [
            "Structured data (JSON-LD, schema.org) is a machine-readable summary embedded in your pages: this is a business, this is its name, address, offering, opening hours. AI systems use it to build a factual profile of your brand — facts you control, in a format they can't misread.",
            "Minimum: an Organization or LocalBusiness block on your homepage with name, url, logo, contact and sameAs links to your social and directory profiles. Then add types matching your content: Product, Service, Article, FAQPage.",
          ],
        },
        {
          h: "3. Write content an AI can quote",
          body: [
            "AI answers are assembled from snippets. Content gets cited when it contains liftable units: a crisp one-sentence definition, a bullet list of steps, a concrete number, a short Q&A. A 1,500-word wall of storytelling gives the AI nothing to grab.",
            "Practical rules: one idea per paragraph, descriptive headings (ideally real questions), bullet lists for enumerations, explicit facts (prices, dates, dimensions) in text, and an FAQ section answering what customers actually ask.",
          ],
        },
        {
          h: "4. Prove you're real (E-E-A-T)",
          body: [
            "Language models are trained to prefer trustworthy sources — sites that show who is behind them. A visible About page, real contact details, named authors on articles and consistency with external records (Google Business Profile, registries, reviews) all feed that trust assessment.",
            "This is also the part a single-page scan can't fully measure: your off-site authority. Reviews, mentions in media and links from established sites remain the strongest long-term signal — for AI just as for Google.",
          ],
        },
      ],
    },
    cs: {
      title: "Viditelnost v AI vyhledávání (GEO): jak vás bude citovat ChatGPT a spol.",
      description:
        "Co je Generative Engine Optimization, podle čeho AI asistenti vybírají doporučované weby a jaké konkrétní kroky udělají váš web citovatelným.",
      sections: [
        {
          h: "Proč na tom teď záleží",
          body: [
            "Rostoucí část nákupních rozhodnutí začíná otázkou pro ChatGPT, Perplexity nebo AI odpovědi Googlu místo klasického vyhledávání. Odpověď AI obvykle jmenuje hrstku značek — a všichni ostatní jsou neviditelní. Dostat se do těchto odpovědí je podstatou GEO (Generative Engine Optimization) a AEO (Answer Engine Optimization).",
            "Dobrá zpráva: AI systémy čtou stejný web jako Google. Hodně z toho, co funguje pro SEO, funguje i tady — jen několik věcí má nepoměrně větší váhu.",
          ],
        },
        {
          h: "1. Pusťte AI roboty dovnitř",
          body: [
            "Každý provozovatel AI čte web vlastním robotem: GPTBot (OpenAI), ClaudeBot (Anthropic), PerplexityBot, Google-Extended. Váš soubor robots.txt rozhoduje, kdo z nich smí web číst. Spousta webů je blokuje omylem — plošným pravidlem zkopírovaným ze šablony — a pak se diví, že je AI nikdy nezmíní.",
            "Blokovat AI roboty je legitimní volba (třeba u placeného obsahu). Jen má být vědomá: koho AI nemůže přečíst, toho nemůže doporučit.",
          ],
        },
        {
          h: "2. Řekněte strukturovanými daty, kdo jste",
          body: [
            "Strukturovaná data (JSON-LD, schema.org) jsou strojově čitelné shrnutí vložené do stránek: tohle je firma, tohle její jméno, adresa, nabídka, otevírací doba. AI systémy z nich staví faktický profil vaší značky — fakta, která máte pod kontrolou, ve formátu, který nejde špatně pochopit.",
            "Minimum: blok Organization nebo LocalBusiness na homepage se jménem, url, logem, kontaktem a odkazy sameAs na sociální a katalogové profily. Pak přidejte typy podle obsahu: Product, Service, Article, FAQPage.",
          ],
        },
        {
          h: "3. Pište obsah, který AI dokáže citovat",
          body: [
            "AI odpovědi se skládají z útržků. Citován je obsah, který obsahuje vyjmutelné celky: úderná jednovětá definice, odrážkový seznam kroků, konkrétní číslo, krátká otázka s odpovědí. Patnáctisetslovná zeď vyprávění nedá AI nic, čeho by se chytila.",
            "Praktická pravidla: jedna myšlenka na odstavec, popisné nadpisy (ideálně skutečné otázky), výčty jako odrážky, výslovná fakta (ceny, termíny, rozměry) v textu a sekce FAQ odpovídající na to, na co se zákazníci opravdu ptají.",
          ],
        },
        {
          h: "4. Dokažte, že jste skuteční (E-E-A-T)",
          body: [
            "Jazykové modely jsou trénované upřednostňovat důvěryhodné zdroje — weby, kde je vidět, kdo za nimi stojí. Viditelná stránka O nás, reálné kontakty, jmenovaní autoři článků a soulad s externími záznamy (Google Business Profile, rejstříky, recenze) tuhle důvěru sytí.",
            "Tohle je zároveň část, kterou sken jedné stránky plně nezměří: vaše autorita mimo web. Recenze, zmínky v médiích a odkazy ze zavedených webů zůstávají nejsilnějším dlouhodobým signálem — pro AI stejně jako pro Google.",
          ],
        },
      ],
    },
  },
  {
    slug: "seo-basics",
    en: {
      title: "SEO in 2026: the fundamentals that still decide your traffic",
      description:
        "The technical and content basics — indexability, titles, speed, mobile, structured data — explained for site owners, with the why behind each.",
      sections: [
        {
          h: "First: can Google see you at all?",
          body: [
            "Before optimizing anything, make sure you're not accidentally invisible. Three switches can turn a site off entirely: a “noindex” tag left over from development, a robots.txt that blocks everything, and a missing HTTPS certificate that scares browsers into warnings. These take minutes to fix and outweigh everything else combined.",
            "Then help discovery: an XML sitemap listing your pages, referenced from robots.txt and submitted in Google Search Console — the free dashboard where Google literally tells you how it sees your site.",
          ],
        },
        {
          h: "Titles and descriptions are your ad in the results",
          body: [
            "The title tag and meta description are what people see before they visit. A title under ~60 characters with the key benefit up front decides whether searchers click on you or the result below. The description doesn't affect ranking directly, but it's free ad copy — leaving it empty means Google picks a random sentence for you.",
          ],
        },
        {
          h: "Mobile and speed are ranking factors — and patience factors",
          body: [
            "Google ranks the mobile version of your site, and most visits are mobile. The viewport meta tag, readable font sizes and layouts that adapt to narrow screens are the baseline. Speed is measured by Core Web Vitals: how fast the main content paints (LCP), how much the layout jumps around (CLS) and how quickly the page responds (INP).",
            "Typical wins by size of impact: compress and resize images, enable server compression and caching, remove unused scripts and plugins, use a CDN.",
          ],
        },
        {
          h: "Structure your content — for readers and for machines",
          body: [
            "One H1 saying what the page is about, H2/H3 subheadings in order, descriptive link text and internal links between related pages. This is the same structure screen readers navigate by and AI systems quote from — the three pillars of this audit constantly overlap, which is why fixing one usually improves the others.",
            "Structured data (schema.org) then earns rich results: stars, prices, FAQs directly in Google. It's some of the highest-leverage markup you can add for the effort involved.",
          ],
        },
      ],
    },
    cs: {
      title: "SEO v roce 2026: základy, které pořád rozhodují o návštěvnosti",
      description:
        "Technické a obsahové základy — indexace, titulky, rychlost, mobil, strukturovaná data — vysvětlené pro majitele webů, u každého s důvodem proč.",
      sections: [
        {
          h: "Nejdřív: vidí vás Google vůbec?",
          body: [
            "Než začnete cokoli optimalizovat, ověřte, že nejste omylem neviditelní. Tři vypínače umí web zhasnout úplně: značka „noindex“ zapomenutá z vývoje, robots.txt blokující všechno a chybějící HTTPS certifikát, kvůli kterému prohlížeče straší varováním. Oprava zabere minuty a převáží všechno ostatní dohromady.",
            "Pak pomozte s objevováním: XML sitemapa se seznamem stránek, odkázaná z robots.txt a odeslaná do Google Search Console — bezplatného panelu, kde vám Google doslova říká, jak váš web vidí.",
          ],
        },
        {
          h: "Titulek a popisek jsou vaše reklama ve výsledcích",
          body: [
            "Značka title a meta description jsou to, co lidé vidí před návštěvou. Titulek do ~60 znaků s klíčovým přínosem na začátku rozhoduje, jestli lidé kliknou na vás, nebo na výsledek pod vámi. Popisek pořadí přímo neovlivňuje, ale je to reklamní text zdarma — nechat ho prázdný znamená, že Google vybere náhodnou větu za vás.",
          ],
        },
        {
          h: "Mobil a rychlost jsou faktory pořadí — i trpělivosti",
          body: [
            "Google hodnotí mobilní verzi webu a většina návštěv je z mobilů. Meta značka viewport, čitelné velikosti písma a rozložení přizpůsobené úzkým obrazovkám jsou základ. Rychlost se měří přes Core Web Vitals: jak rychle se vykreslí hlavní obsah (LCP), jak moc stránka poskakuje (CLS) a jak rychle reaguje (INP).",
            "Typické výhry podle velikosti dopadu: zkomprimovat a zmenšit obrázky, zapnout kompresi a cache na serveru, odstranit nepoužívané skripty a pluginy, nasadit CDN.",
          ],
        },
        {
          h: "Strukturujte obsah — pro čtenáře i pro stroje",
          body: [
            "Jeden H1 říkající, o čem stránka je, podnadpisy H2/H3 popořadě, popisné texty odkazů a interní odkazy mezi souvisejícími stránkami. Je to tatáž struktura, po které se pohybují odečítače obrazovky a ze které citují AI systémy — tři pilíře tohoto auditu se neustále překrývají, a proto oprava jednoho obvykle zlepší i ostatní.",
            "Strukturovaná data (schema.org) pak vydělávají obohacené výsledky: hvězdičky, ceny, FAQ přímo v Googlu. Na poměr vynaložené práce a přínosu je to jedna z nejvýhodnějších úprav vůbec.",
          ],
        },
      ],
    },
  },
  {
    slug: "accessibility",
    en: {
      title: "Web accessibility & the EAA: what WCAG means for your business",
      description:
        "Who web accessibility helps, what the European Accessibility Act requires since June 2025, and how WCAG 2.2 levels A/AA/AAA actually work.",
      sections: [
        {
          h: "Accessibility is not a niche topic",
          body: [
            "Roughly one in four EU adults lives with some form of disability — impaired vision, hearing, motor skills or cognition. Add temporary situations (a broken arm, a bright sun on the screen, a noisy train) and ageing eyes, and “users with limitations” describes a large slice of your customers on any given day.",
            "An inaccessible site doesn't look broken to you — it quietly loses these visitors at the door. They can't read the low-contrast text, can't tap the tiny button, can't submit the unlabelled form. They leave, and the analytics never tell you why.",
          ],
        },
        {
          h: "The law: European Accessibility Act",
          body: [
            "Since 28 June 2025, the European Accessibility Act (EAA) requires most e-commerce and consumer-facing digital services in the EU to be accessible, in practice meaning WCAG 2.1 level AA per the EN 301 549 standard. It applies to e-shops, banking, transport, e-books and more; microenterprises (under 10 employees and under €2M turnover) have exemptions for services.",
            "Enforcement and penalties are set per member state. Beyond fines, inaccessible checkouts are increasingly the subject of complaints and legal claims — and fixing accessibility under legal pressure costs far more than building it in.",
          ],
        },
        {
          h: "How WCAG works: four principles, three levels",
          body: [
            "WCAG (Web Content Accessibility Guidelines) organizes requirements under four principles — content must be Perceivable, Operable, Understandable and Robust (POUR). Each requirement (“success criterion”) has a level: A (essential minimum), AA (the standard legal target), AAA (specialized, rarely required in full).",
            "Examples: images need text alternatives (A), text needs 4.5:1 contrast (AA), everything must work by keyboard (A), forms must explain their errors (A). WCAG 2.2 added criteria like minimum target size for buttons (AA).",
          ],
        },
        {
          h: "What automation finds — and what it can't",
          body: [
            "Automated tools like the one behind this audit reliably catch missing alt texts, unlabelled form fields, missing page language, broken ARIA and similar machine-checkable failures. That's roughly 30–50 % of WCAG criteria. The rest — is the contrast really sufficient? does keyboard navigation actually work? do the captions make sense? — needs a human test.",
            "A practical path for most sites: fix everything the automated scan finds, then run the manual checklist from your report (it takes under an hour), then have a professional audit done if you're covered by the EAA.",
          ],
        },
        {
          h: "Accessibility pays for itself",
          body: [
            "The overlap with SEO and AI visibility is no accident: alt texts, heading structure, link names and semantic HTML are exactly what search engines and AI systems parse. Accessible sites also convert better for everyone — clearer forms, more readable text and calmer interfaces reduce friction for every visitor, not just those with disabilities.",
          ],
        },
      ],
    },
    cs: {
      title: "Přístupnost webu a EAA: co WCAG znamená pro vaše podnikání",
      description:
        "Komu přístupnost webu pomáhá, co od června 2025 vyžaduje evropský akt o přístupnosti a jak fungují úrovně WCAG 2.2 A/AA/AAA.",
      sections: [
        {
          h: "Přístupnost není okrajové téma",
          body: [
            "Zhruba každý čtvrtý dospělý v EU žije s nějakou formou postižení — zraku, sluchu, motoriky nebo kognice. Přidejte dočasné situace (zlomená ruka, slunce svítící na displej, hlučný vlak) a stárnoucí oči, a „uživatelé s omezeními“ náhle popisují velkou část vašich zákazníků v kterýkoli den.",
            "Nepřístupný web vám rozbitě nepřipadá — jen tiše ztrácí tyto návštěvníky u dveří. Nepřečtou málo kontrastní text, netrefí miniaturní tlačítko, neodešlou formulář bez popisků. Odejdou a analytika vám nikdy neřekne proč.",
          ],
        },
        {
          h: "Zákon: evropský akt o přístupnosti",
          body: [
            "Od 28. června 2025 vyžaduje evropský akt o přístupnosti (EAA), aby většina e-commerce a spotřebitelských digitálních služeb v EU byla přístupná — v praxi to znamená WCAG 2.1 úroveň AA podle normy EN 301 549. Týká se e-shopů, bankovnictví, dopravy, e-knih a dalších; mikropodniky (do 10 zaměstnanců a do 2 mil. € obratu) mají u služeb výjimky.",
            "Vymáhání a pokuty si nastavuje každý členský stát. Kromě pokut jsou nepřístupné objednávkové procesy stále častěji předmětem stížností a žalob — a opravovat přístupnost pod právním tlakem stojí mnohem víc než ji rovnou zabudovat.",
          ],
        },
        {
          h: "Jak WCAG funguje: čtyři principy, tři úrovně",
          body: [
            "WCAG (Web Content Accessibility Guidelines) řadí požadavky pod čtyři principy — obsah musí být vnímatelný, ovladatelný, srozumitelný a robustní (POUR). Každý požadavek („kritérium úspěšnosti“) má úroveň: A (nezbytné minimum), AA (standardní zákonný cíl), AAA (specializovaná, v plném rozsahu se vyžaduje zřídka).",
            "Příklady: obrázky potřebují textové alternativy (A), text kontrast 4,5:1 (AA), vše musí fungovat klávesnicí (A), formuláře musí vysvětlit své chyby (A). WCAG 2.2 přidalo kritéria jako minimální velikost dotykových cílů (AA).",
          ],
        },
        {
          h: "Co najde automat — a co neumí",
          body: [
            "Automatické nástroje jako ten za tímto auditem spolehlivě odhalí chybějící alt texty, formulářová pole bez popisků, chybějící jazyk stránky, rozbité ARIA a podobné strojově ověřitelné chyby. To je zhruba 30–50 % kritérií WCAG. Zbytek — je ten kontrast opravdu dostatečný? funguje ovládání klávesnicí doopravdy? dávají titulky smysl? — potřebuje lidský test.",
            "Praktická cesta pro většinu webů: opravte vše, co najde automatický sken, pak projděte ruční checklist z reportu (zabere ani ne hodinu) a pokud se na vás vztahuje EAA, nechte si udělat profesionální audit.",
          ],
        },
        {
          h: "Přístupnost se zaplatí sama",
          body: [
            "Překryv se SEO a AI viditelností není náhoda: alt texty, struktura nadpisů, názvy odkazů a sémantické HTML jsou přesně to, co čtou vyhledávače i AI systémy. Přístupné weby navíc lépe konvertují u všech — jasnější formuláře, čitelnější text a klidnější rozhraní snižují tření pro každého návštěvníka, nejen pro lidi s postižením.",
          ],
        },
      ],
    },
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function guideFor(g: Guide, locale: Locale): GuideContent {
  return g[locale];
}
