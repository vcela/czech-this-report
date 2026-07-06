import type { CheckDef } from "./types";

/**
 * Catalog of every check the auditor can run. All copy exists in full
 * quality in both English and Czech (no machine translation).
 *
 * impact: 1 low / 2 medium / 3 high — how much it hurts traffic,
 * conversions or legal compliance.
 * effort: 1 easy / 2 moderate / 3 hard — how hard it is to fix.
 */
export const CATALOG: Record<string, CheckDef> = {
  /* ================================================================
   * PILLAR B — SEO / Google visibility
   * ================================================================ */
  "seo-title-missing": {
    id: "seo-title-missing",
    pillar: "seo",
    roles: ["copywriter", "developer"],
    impact: 3,
    effort: 1,
    confidence: "measured",
    title: {
      en: "The page has no title.",
      cs: "Stránka nemá žádný titulek.",
    },
    why: {
      en: "The title is the blue headline people see in Google results and the first thing AI assistants read. Without it, Google invents one for you and searchers have no reason to click. It is also a WCAG requirement (2.4.2), so it affects accessibility too.",
      cs: "Titulek je ten modrý nadpis, který lidé vidí ve výsledcích Googlu, a první věc, kterou čtou AI asistenti. Bez něj si Google vymyslí vlastní a lidé nemají důvod kliknout. Je to zároveň požadavek WCAG (2.4.2), takže se týká i přístupnosti.",
    },
    fix: {
      en: "Add a <title> tag inside <head> that says what the page offers and for whom, in under 60 characters. Example: “Handmade ceramics from Prague | Studio Hlína”.",
      cs: "Doplňte do <head> značku <title>, která do 60 znaků řekne, co stránka nabízí a komu. Příklad: „Ruční keramika z Prahy | Studio Hlína“.",
    },
    passTitle: {
      en: "The page has a title.",
      cs: "Stránka má titulek.",
    },
  },
  "seo-title-length": {
    id: "seo-title-length",
    pillar: "seo",
    roles: ["copywriter"],
    impact: 1,
    effort: 1,
    confidence: "measured",
    title: {
      en: "The page title is too short or too long.",
      cs: "Titulek stránky je příliš krátký nebo příliš dlouhý.",
    },
    why: {
      en: "Google shows roughly the first 60 characters and cuts off the rest, so a long title loses its ending — often the part with your brand name. A very short one (like just “Home”) tells searchers nothing.",
      cs: "Google zobrazí zhruba prvních 60 znaků a zbytek uřízne, takže dlouhý titulek přijde o konec — často o část s názvem vaší značky. Velmi krátký (třeba jen „Úvod“) zase lidem nic neřekne.",
    },
    fix: {
      en: "Rewrite the title to 30–60 characters. Put the most important words first and the brand name last.",
      cs: "Přepište titulek na 30–60 znaků. Nejdůležitější slova dejte na začátek, název značky na konec.",
    },
    passTitle: {
      en: "The page title has a good length.",
      cs: "Titulek stránky má vhodnou délku.",
    },
  },
  "seo-meta-description-missing": {
    id: "seo-meta-description-missing",
    pillar: "seo",
    roles: ["copywriter"],
    impact: 2,
    effort: 1,
    confidence: "measured",
    title: {
      en: "The page has no meta description.",
      cs: "Stránka nemá meta description (popisek pro vyhledávače).",
    },
    why: {
      en: "The meta description is the grey text under your link in Google. It doesn't affect ranking directly, but it decides whether people click on you or on your competitor. Without it, Google picks a random sentence from the page.",
      cs: "Meta description je šedý text pod vaším odkazem v Googlu. Pořadí přímo neovlivňuje, ale rozhoduje o tom, jestli lidé kliknou na vás, nebo na konkurenci. Bez něj Google vybere náhodnou větu ze stránky.",
    },
    fix: {
      en: "Add <meta name=\"description\" content=\"…\"> with 1–2 sentences (up to ~155 characters) saying what you offer and why to choose you.",
      cs: "Doplňte <meta name=\"description\" content=\"…\"> s 1–2 větami (do ~155 znaků) o tom, co nabízíte a proč si vybrat právě vás.",
    },
    passTitle: {
      en: "The page has a meta description.",
      cs: "Stránka má meta description.",
    },
  },
  "seo-meta-description-length": {
    id: "seo-meta-description-length",
    pillar: "seo",
    roles: ["copywriter"],
    impact: 1,
    effort: 1,
    confidence: "measured",
    title: {
      en: "The meta description is too short or too long.",
      cs: "Meta description je příliš krátký nebo příliš dlouhý.",
    },
    why: {
      en: "Google truncates descriptions at roughly 155–160 characters, and a one-word description wastes free advertising space in the search results.",
      cs: "Google popisky ořezává zhruba na 155–160 znaků a jednoslovný popisek zase promarní reklamní prostor ve výsledcích vyhledávání zdarma.",
    },
    fix: {
      en: "Rewrite the description to roughly 70–155 characters with a clear benefit and a reason to click.",
      cs: "Přepište popisek na zhruba 70–155 znaků s jasným přínosem a důvodem kliknout.",
    },
    passTitle: {
      en: "The meta description has a good length.",
      cs: "Meta description má vhodnou délku.",
    },
  },
  "seo-cookie-consent": {
    id: "seo-cookie-consent",
    pillar: "seo",
    roles: ["developer", "copywriter"],
    impact: 2,
    effort: 1,
    confidence: "measured",
    title: {
      en: "The site appears to need cookie controls, but the required notice, settings and policy pages are missing.",
      cs: "Web zřejmě potřebuje prvky pro cookies, ale chybí potřebné oznámení, nastavení a stránky s informacemi.",
    },
    why: {
      en: "If the site uses analytics, ads or other tracking, visitors usually need a clear cookie notice, a way to change preferences and pages that explain the cookies used and the privacy/GDPR basis.",
      cs: "Pokud web používá analytiku, reklamy nebo jiné sledování, návštěvníci obvykle potřebují jasné oznámení o cookies, možnost změnit preference a stránky, které vysvětlují používané cookies a základ pro ochranu osobních údajů/GDPR.",
    },
    fix: {
      en: "Add a visible cookie notice or banner, a link to open or change cookie settings, and dedicated pages for cookie information and privacy/GDPR. If the site does not actually use cookies or tracking, you can skip these elements.",
      cs: "Přidejte viditelné oznámení nebo banner o cookies, odkaz na otevření nebo změnu nastavení cookies a samostatné stránky o cookies a ochraně osobních údajů/GDPR. Pokud web cookies ani sledování ve skutečnosti nepoužívá, tyto prvky můžete vynechat.",
    },
    passTitle: {
      en: "The site either has clear cookie controls or does not appear to need them.",
      cs: "Web buď má jasné prvky pro cookies, nebo se zdá, že je nepotřebuje.",
    },
  },
  "seo-h1-missing": {
    id: "seo-h1-missing",
    pillar: "seo",
    roles: ["developer", "copywriter"],
    impact: 2,
    effort: 1,
    confidence: "measured",
    title: {
      en: "The page has no main heading (H1).",
      cs: "Stránka nemá hlavní nadpis (H1).",
    },
    why: {
      en: "The H1 tells Google, AI assistants and screen-reader users what the page is about in one line. Without it, both machines and people have to guess.",
      cs: "H1 říká Googlu, AI asistentům i uživatelům odečítačů obrazovky jednou větou, o čem stránka je. Bez něj musí stroje i lidé hádat.",
    },
    fix: {
      en: "Add exactly one <h1> near the top of the page describing its main topic. It can differ from the <title>, but should cover the same subject.",
      cs: "Přidejte na začátek stránky právě jeden <h1> popisující její hlavní téma. Může se lišit od <title>, ale měl by pokrývat stejné téma.",
    },
    passTitle: {
      en: "The page has a main heading (H1).",
      cs: "Stránka má hlavní nadpis (H1).",
    },
  },
  "seo-h1-multiple": {
    id: "seo-h1-multiple",
    pillar: "seo",
    roles: ["developer"],
    impact: 1,
    effort: 1,
    confidence: "measured",
    title: {
      en: "The page has more than one main heading (H1).",
      cs: "Stránka má více než jeden hlavní nadpis (H1).",
    },
    why: {
      en: "Multiple H1s dilute the page's main topic and make its structure harder to follow for search engines and assistive technologies alike.",
      cs: "Více H1 rozmělňuje hlavní téma stránky a její struktura se hůř čte vyhledávačům i asistivním technologiím.",
    },
    fix: {
      en: "Keep one H1 for the main topic and demote the others to H2/H3 according to their importance.",
      cs: "Ponechte jeden H1 pro hlavní téma a ostatní snižte na H2/H3 podle důležitosti.",
    },
    passTitle: {
      en: "The page has exactly one H1.",
      cs: "Stránka má právě jeden H1.",
    },
  },
  "seo-heading-hierarchy": {
    id: "seo-heading-hierarchy",
    pillar: "seo",
    roles: ["developer"],
    impact: 1,
    effort: 2,
    confidence: "measured",
    title: {
      en: "Headings skip levels (e.g. H1 jumps straight to H3).",
      cs: "Nadpisy přeskakují úrovně (např. z H1 rovnou na H3).",
    },
    why: {
      en: "Headings work like a table of contents. When levels are skipped, search engines understand the content structure worse and screen-reader users — who often navigate by headings — get lost.",
      cs: "Nadpisy fungují jako obsah knihy. Když se úrovně přeskakují, vyhledávače hůř chápou strukturu obsahu a uživatelé odečítačů obrazovky — kteří se často pohybují právě po nadpisech — se ztrácejí.",
    },
    fix: {
      en: "Reorder heading levels so they descend one step at a time (H1 → H2 → H3). Never pick a heading level just for its font size — style it with CSS instead.",
      cs: "Srovnejte úrovně nadpisů tak, aby klesaly po jedné (H1 → H2 → H3). Úroveň nadpisu nikdy nevybírejte podle velikosti písma — tu upravte přes CSS.",
    },
    passTitle: {
      en: "Heading levels descend in order.",
      cs: "Úrovně nadpisů na sebe správně navazují.",
    },
  },
  "seo-noindex": {
    id: "seo-noindex",
    pillar: "seo",
    roles: ["developer"],
    impact: 3,
    effort: 1,
    confidence: "measured",
    title: {
      en: "The page tells search engines not to index it (noindex).",
      cs: "Stránka říká vyhledávačům, aby ji neindexovaly (noindex).",
    },
    why: {
      en: "A “noindex” instruction removes the page from Google entirely. If this is your homepage and it's not intentional, you are invisible in search — no ranking tweak will help until this is removed.",
      cs: "Instrukce „noindex“ stránku úplně vyřadí z Googlu. Pokud jde o vaši úvodní stránku a není to záměr, jste ve vyhledávání neviditelní — žádná jiná optimalizace nepomůže, dokud ji neodstraníte.",
    },
    fix: {
      en: "Remove the noindex value from the robots meta tag (or the X-Robots-Tag HTTP header) unless you genuinely want this page hidden.",
      cs: "Odstraňte hodnotu noindex z meta značky robots (nebo z HTTP hlavičky X-Robots-Tag), pokud stránku opravdu nechcete skrýt.",
    },
    passTitle: {
      en: "The page allows indexing.",
      cs: "Stránka povoluje indexaci.",
    },
  },
  "seo-robots-blocks-all": {
    id: "seo-robots-blocks-all",
    pillar: "seo",
    roles: ["developer"],
    impact: 3,
    effort: 1,
    confidence: "measured",
    title: {
      en: "robots.txt blocks all crawlers from the whole site.",
      cs: "robots.txt blokuje všem robotům přístup na celý web.",
    },
    why: {
      en: "A blanket “Disallow: /” means Google and other crawlers may not read any page. The site can gradually disappear from search results entirely.",
      cs: "Plošné „Disallow: /“ znamená, že Google ani další roboti nesmí číst žádnou stránku. Web může z výsledků vyhledávání postupně úplně zmizet.",
    },
    fix: {
      en: "Edit robots.txt so it only blocks what really must stay private (e.g. /admin/), not the whole site. This often remains switched on by accident after a site launch.",
      cs: "Upravte robots.txt tak, aby blokoval jen to, co má opravdu zůstat skryté (např. /admin/), ne celý web. Často to zůstane omylem zapnuté po spuštění webu.",
    },
    passTitle: {
      en: "robots.txt does not block search engines from the site.",
      cs: "robots.txt neblokuje vyhledávačům přístup na web.",
    },
  },
  "seo-sitemap-missing": {
    id: "seo-sitemap-missing",
    pillar: "seo",
    roles: ["developer"],
    impact: 2,
    effort: 1,
    confidence: "measured",
    title: {
      en: "No XML sitemap was found.",
      cs: "Nenašli jsme XML sitemapu (mapu webu).",
    },
    why: {
      en: "A sitemap is a machine-readable list of all your pages. Without it, search engines discover new and updated pages more slowly, especially on larger sites.",
      cs: "Sitemapa je strojově čitelný seznam všech vašich stránek. Bez ní vyhledávače objevují nové a upravené stránky pomaleji, hlavně u větších webů.",
    },
    fix: {
      en: "Generate a sitemap.xml (most CMSs and frameworks can do this automatically), serve it at /sitemap.xml and submit it in Google Search Console.",
      cs: "Vygenerujte sitemap.xml (většina redakčních systémů to umí automaticky), zveřejněte ji na /sitemap.xml a odešlete v Google Search Console.",
    },
    passTitle: {
      en: "An XML sitemap exists.",
      cs: "XML sitemapa existuje.",
    },
  },
  "seo-sitemap-not-in-robots": {
    id: "seo-sitemap-not-in-robots",
    pillar: "seo",
    roles: ["developer"],
    impact: 1,
    effort: 1,
    confidence: "measured",
    title: {
      en: "robots.txt does not point to the sitemap.",
      cs: "robots.txt neodkazuje na sitemapu.",
    },
    why: {
      en: "A “Sitemap:” line in robots.txt is the standard place where all crawlers (including AI ones) look for your page list. It costs one line and helps every bot find your content.",
      cs: "Řádek „Sitemap:“ v robots.txt je standardní místo, kde všichni roboti (včetně těch od AI) hledají seznam vašich stránek. Stojí jeden řádek a pomůže každému botovi najít váš obsah.",
    },
    fix: {
      en: "Add a line like “Sitemap: https://your-domain.com/sitemap.xml” to robots.txt.",
      cs: "Přidejte do robots.txt řádek „Sitemap: https://vase-domena.cz/sitemap.xml“.",
    },
    passTitle: {
      en: "robots.txt points to the sitemap.",
      cs: "robots.txt odkazuje na sitemapu.",
    },
  },
  "seo-canonical-missing": {
    id: "seo-canonical-missing",
    pillar: "seo",
    roles: ["developer"],
    impact: 2,
    effort: 1,
    confidence: "measured",
    title: {
      en: "The page has no canonical link.",
      cs: "Stránka nemá kanonický odkaz (canonical).",
    },
    why: {
      en: "The same page is often reachable under several addresses (with/without “www”, with tracking parameters…). Without a canonical link, Google splits the page's credit between those duplicates and may show the wrong one.",
      cs: "Stejná stránka bývá dostupná pod několika adresami (s „www“ i bez, s měřicími parametry…). Bez kanonického odkazu Google dělí „kredit“ stránky mezi tyto duplicity a může zobrazovat tu špatnou.",
    },
    fix: {
      en: "Add <link rel=\"canonical\" href=\"…\"> to <head> pointing to the preferred address of each page.",
      cs: "Přidejte do <head> značku <link rel=\"canonical\" href=\"…\"> mířící na preferovanou adresu každé stránky.",
    },
    passTitle: {
      en: "The page declares a canonical address.",
      cs: "Stránka deklaruje kanonickou adresu.",
    },
  },
  "seo-https-missing": {
    id: "seo-https-missing",
    pillar: "seo",
    roles: ["devops"],
    impact: 3,
    effort: 2,
    confidence: "measured",
    title: {
      en: "The site does not run on HTTPS.",
      cs: "Web neběží na HTTPS (zabezpečeném připojení).",
    },
    why: {
      en: "Browsers label the site “Not secure”, which scares visitors away, and Google actively prefers secure sites. Forms on an insecure site can expose what your customers type.",
      cs: "Prohlížeče web označí jako „Nezabezpečeno“, což návštěvníky odrazuje, a Google zabezpečené weby aktivně upřednostňuje. Formuláře na nezabezpečeném webu navíc mohou vyzradit, co zákazníci píší.",
    },
    fix: {
      en: "Ask your hosting provider to install a TLS certificate (Let's Encrypt is free) and serve the whole site over https://.",
      cs: "Požádejte svůj hosting o instalaci TLS certifikátu (Let's Encrypt je zdarma) a provozujte celý web na https://.",
    },
    passTitle: {
      en: "The site runs on HTTPS.",
      cs: "Web běží na HTTPS.",
    },
  },
  "seo-http-no-redirect": {
    id: "seo-http-no-redirect",
    pillar: "seo",
    roles: ["devops"],
    impact: 2,
    effort: 1,
    confidence: "measured",
    title: {
      en: "The insecure http:// address does not redirect to https://.",
      cs: "Nezabezpečená adresa http:// nepřesměrovává na https://.",
    },
    why: {
      en: "If both versions work, visitors and search engines see two separate sites with split authority, and anyone arriving via an old link browses over an insecure connection.",
      cs: "Pokud fungují obě verze, návštěvníci i vyhledávače vidí dva oddělené weby s rozdělenou autoritou a kdokoli přijde přes starý odkaz, prohlíží web nezabezpečeně.",
    },
    fix: {
      en: "Set up a permanent (301) redirect from http:// to https:// on the server or in the hosting control panel.",
      cs: "Nastavte na serveru nebo v administraci hostingu trvalé přesměrování (301) z http:// na https://.",
    },
    passTitle: {
      en: "http:// redirects to https://.",
      cs: "http:// přesměrovává na https://.",
    },
  },
  "seo-hsts-missing": {
    id: "seo-hsts-missing",
    pillar: "seo",
    roles: ["devops"],
    impact: 1,
    effort: 1,
    confidence: "measured",
    title: {
      en: "The HSTS security header is missing.",
      cs: "Chybí bezpečnostní hlavička HSTS.",
    },
    why: {
      en: "HSTS tells browsers to always use the secure connection, closing a small window where a visitor's first request could be intercepted. It's a hygiene factor that security scanners and some clients check.",
      cs: "HSTS říká prohlížečům, aby vždy použily zabezpečené připojení, a zavírá tak malé okno, kdy by první požadavek návštěvníka šel odposlechnout. Je to hygienický standard, který kontrolují bezpečnostní skenery i někteří klienti.",
    },
    fix: {
      en: "Add the header “Strict-Transport-Security: max-age=31536000” in the server or hosting configuration (only once HTTPS works everywhere).",
      cs: "Přidejte v konfiguraci serveru nebo hostingu hlavičku „Strict-Transport-Security: max-age=31536000“ (až ve chvíli, kdy HTTPS funguje všude).",
    },
    passTitle: {
      en: "The HSTS security header is set.",
      cs: "Bezpečnostní hlavička HSTS je nastavena.",
    },
  },
  "seo-viewport-missing": {
    id: "seo-viewport-missing",
    pillar: "seo",
    roles: ["developer"],
    impact: 3,
    effort: 1,
    confidence: "measured",
    title: {
      en: "The page is not set up for mobile phones (missing viewport).",
      cs: "Stránka není připravená pro mobily (chybí viewport).",
    },
    why: {
      en: "Without the viewport tag, phones show a shrunken desktop page that people must pinch-zoom to read. More than half of visits come from mobile, and Google ranks sites by their mobile version.",
      cs: "Bez značky viewport mobily zobrazí zmenšenou počítačovou verzi, kterou lidé musí přibližovat prsty. Víc než polovina návštěv chodí z mobilů a Google hodnotí weby podle mobilní verze.",
    },
    fix: {
      en: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> to <head> and check the site adapts to narrow screens.",
      cs: "Přidejte do <head> značku <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> a zkontrolujte, že se web přizpůsobuje úzkým obrazovkám.",
    },
    passTitle: {
      en: "The page declares a mobile viewport.",
      cs: "Stránka deklaruje mobilní viewport.",
    },
  },
  "seo-og-missing": {
    id: "seo-og-missing",
    pillar: "seo",
    roles: ["developer", "copywriter"],
    impact: 2,
    effort: 1,
    confidence: "measured",
    title: {
      en: "Social sharing tags (Open Graph) are missing.",
      cs: "Chybí značky pro sdílení na sociálních sítích (Open Graph).",
    },
    why: {
      en: "When someone shares your link on Facebook, LinkedIn or in a chat app, these tags control the preview image and text. Without them the share looks broken or empty — and gets far fewer clicks.",
      cs: "Když někdo sdílí váš odkaz na Facebooku, LinkedInu nebo v chatu, tyto značky určují náhledový obrázek a text. Bez nich vypadá sdílení rozbitě nebo prázdně — a dostane výrazně méně kliknutí.",
    },
    fix: {
      en: "Add og:title, og:description and og:image meta tags. The image should be 1200×630 px and represent the page well.",
      cs: "Doplňte meta značky og:title, og:description a og:image. Obrázek by měl mít 1200×630 px a stránku dobře reprezentovat.",
    },
    passTitle: {
      en: "Social sharing tags are present.",
      cs: "Značky pro sdílení na sociálních sítích jsou nastavené.",
    },
  },
  "seo-favicon-missing": {
    id: "seo-favicon-missing",
    pillar: "seo",
    roles: ["designer", "developer"],
    impact: 1,
    effort: 1,
    confidence: "measured",
    title: {
      en: "No favicon (site icon) was found.",
      cs: "Nenašli jsme favicon (ikonku webu).",
    },
    why: {
      en: "The little icon appears in browser tabs, bookmarks and next to your result in Google. A missing one makes the site look unfinished and harder to spot among open tabs.",
      cs: "Ikonka se zobrazuje v záložkách prohlížeče i vedle vašeho výsledku v Googlu. Bez ní web působí nedodělaně a hůř se hledá mezi otevřenými panely.",
    },
    fix: {
      en: "Create a simple square icon (ideally SVG or 48×48+ PNG) and link it with <link rel=\"icon\" …> in <head>.",
      cs: "Vytvořte jednoduchou čtvercovou ikonku (ideálně SVG nebo PNG 48×48+) a propojte ji přes <link rel=\"icon\" …> v <head>.",
    },
    passTitle: {
      en: "The site has a favicon.",
      cs: "Web má favicon.",
    },
  },
  "seo-compression-missing": {
    id: "seo-compression-missing",
    pillar: "seo",
    roles: ["devops"],
    impact: 2,
    effort: 1,
    confidence: "measured",
    title: {
      en: "The server does not compress pages (gzip/brotli).",
      cs: "Server stránky nekomprimuje (gzip/brotli).",
    },
    why: {
      en: "Compression typically shrinks a page to a quarter of its size, so it loads noticeably faster — especially on mobile data. Speed affects both visitor patience and Google ranking.",
      cs: "Komprese stránku typicky zmenší na čtvrtinu, takže se načte znatelně rychleji — hlavně na mobilních datech. Rychlost ovlivňuje trpělivost návštěvníků i pořadí v Googlu.",
    },
    fix: {
      en: "Enable gzip or brotli compression in the server or hosting configuration. Most hosts have a one-click switch for this.",
      cs: "Zapněte kompresi gzip nebo brotli v konfiguraci serveru či hostingu. Většina hostingů na to má přepínač.",
    },
    passTitle: {
      en: "The server compresses responses.",
      cs: "Server odpovědi komprimuje.",
    },
  },
  "seo-ttfb-slow": {
    id: "seo-ttfb-slow",
    pillar: "seo",
    roles: ["devops", "developer"],
    impact: 2,
    effort: 2,
    confidence: "measured",
    title: {
      en: "The server responds slowly.",
      cs: "Server odpovídá pomalu.",
    },
    why: {
      en: "Before anything can render, the browser waits for the server's first byte. Every extra second here delays the entire page, frustrates visitors and drags down Core Web Vitals.",
      cs: "Než se cokoli vykreslí, prohlížeč čeká na první bajt od serveru. Každá vteřina navíc zdržuje celou stránku, frustruje návštěvníky a zhoršuje Core Web Vitals.",
    },
    fix: {
      en: "Enable caching, use a CDN, or upgrade hosting. If the site runs a CMS, a caching plugin usually brings the biggest win.",
      cs: "Zapněte cache, nasaďte CDN nebo přejděte na výkonnější hosting. U webů na redakčním systému obvykle nejvíc pomůže cachovací plugin.",
    },
    passTitle: {
      en: "The server responds quickly.",
      cs: "Server odpovídá rychle.",
    },
  },
  "seo-cwv-poor": {
    id: "seo-cwv-poor",
    pillar: "seo",
    roles: ["developer", "devops"],
    impact: 3,
    effort: 3,
    confidence: "measured",
    title: {
      en: "Page loading performance is poor (Core Web Vitals).",
      cs: "Rychlost načítání stránky je špatná (Core Web Vitals).",
    },
    why: {
      en: "Core Web Vitals are Google's official speed and stability metrics — they directly influence ranking. Slow pages also lose visitors: even a 1-second delay measurably cuts conversions.",
      cs: "Core Web Vitals jsou oficiální metriky rychlosti a stability od Googlu — přímo ovlivňují pořadí ve vyhledávání. Pomalé stránky navíc ztrácejí návštěvníky: i vteřina zpoždění měřitelně snižuje konverze.",
    },
    fix: {
      en: "Optimize the largest image or element above the fold, defer non-critical scripts, and reserve space for images/ads to avoid layout jumps. Run PageSpeed Insights for a detailed breakdown.",
      cs: "Optimalizujte největší obrázek nebo prvek v horní části stránky, odložte nekritické skripty a rezervujte místo pro obrázky/reklamy, ať stránka neposkakuje. Podrobný rozbor dá PageSpeed Insights.",
    },
    passTitle: {
      en: "Page loading performance is good (Core Web Vitals).",
      cs: "Rychlost načítání stránky je dobrá (Core Web Vitals).",
    },
  },
  "seo-html-too-large": {
    id: "seo-html-too-large",
    pillar: "seo",
    roles: ["developer"],
    impact: 1,
    effort: 2,
    confidence: "measured",
    title: {
      en: "The page's HTML is unusually large.",
      cs: "HTML stránky je nezvykle velké.",
    },
    why: {
      en: "Very large HTML (often caused by inlined styles, hidden content or page-builder bloat) slows down loading and parsing on every visit, especially on cheaper phones.",
      cs: "Velmi velké HTML (často kvůli inline stylům, skrytému obsahu nebo balastu z page builderů) zpomaluje načtení a zpracování při každé návštěvě, zvlášť na levnějších telefonech.",
    },
    fix: {
      en: "Move repeated inline styles to CSS files, remove hidden/unused markup and split extremely long pages into several shorter ones.",
      cs: "Přesuňte opakované inline styly do CSS souborů, odstraňte skrytý/nepoužívaný kód a extrémně dlouhé stránky rozdělte na několik kratších.",
    },
    passTitle: {
      en: "The page's HTML has a reasonable size.",
      cs: "HTML stránky má rozumnou velikost.",
    },
  },
  "seo-internal-links-few": {
    id: "seo-internal-links-few",
    pillar: "seo",
    roles: ["copywriter", "seo-specialist"],
    impact: 1,
    effort: 2,
    confidence: "measured",
    title: {
      en: "The page links to very few other pages on the site.",
      cs: "Stránka odkazuje na velmi málo dalších stránek webu.",
    },
    why: {
      en: "Internal links are how visitors, Google and AI crawlers discover the rest of your site. A page with almost no internal links is a dead end — its authority doesn't flow anywhere.",
      cs: "Interní odkazy jsou cesta, kterou návštěvníci, Google i AI roboti objevují zbytek vašeho webu. Stránka skoro bez interních odkazů je slepá ulička — její autorita nikam neteče.",
    },
    fix: {
      en: "Link naturally to related pages from the text (services, articles, contact). Aim for descriptive link text, not “click here”.",
      cs: "Odkazujte z textu přirozeně na související stránky (služby, články, kontakt). Text odkazu má být popisný, ne „klikněte zde“.",
    },
    passTitle: {
      en: "The page links to other pages on the site.",
      cs: "Stránka odkazuje na další stránky webu.",
    },
  },

  /* ================================================================
   * PILLAR A — AI Search Visibility (GEO / AEO)
   * ================================================================ */
  "ai-crawlers-blocked": {
    id: "ai-crawlers-blocked",
    pillar: "ai",
    roles: ["developer"],
    impact: 3,
    effort: 1,
    confidence: "measured",
    title: {
      en: "robots.txt blocks AI assistants from reading the site.",
      cs: "robots.txt blokuje AI asistentům čtení webu.",
    },
    why: {
      en: "ChatGPT, Perplexity, Claude and Google's AI answers can only recommend and cite sites their crawlers may read. Blocking them means your competitors get mentioned in AI answers instead of you. (Blocking can be a legitimate choice — but it should be a conscious one.)",
      cs: "ChatGPT, Perplexity, Claude i AI odpovědi Googlu mohou doporučovat a citovat jen weby, které jejich roboti smí číst. Když je zablokujete, AI bude v odpovědích zmiňovat konkurenci místo vás. (Blokace může být legitimní volba — ale měla by být vědomá.)",
    },
    fix: {
      en: "In robots.txt, allow the crawlers you want (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) or remove the blanket Disallow rules that catch them. Decide bot-by-bot; this report lists the current status of each.",
      cs: "V robots.txt povolte roboty, které chcete (GPTBot, ClaudeBot, PerplexityBot, Google-Extended), nebo odstraňte plošná pravidla Disallow, která je blokují. Rozhodněte se pro každého bota zvlášť; tento report ukazuje aktuální stav všech.",
    },
    passTitle: {
      en: "AI crawlers may read the site.",
      cs: "AI roboti smí web číst.",
    },
  },
  "ai-no-structured-data": {
    id: "ai-no-structured-data",
    pillar: "ai",
    roles: ["developer"],
    impact: 3,
    effort: 2,
    confidence: "measured",
    title: {
      en: "The page has no structured data (JSON-LD).",
      cs: "Stránka nemá strukturovaná data (JSON-LD).",
    },
    why: {
      en: "Structured data is a machine-readable label saying “this is a business, this is its address, these are its products”. Google uses it for rich results (stars, prices, FAQs) and AI systems use it to understand and cite you accurately.",
      cs: "Strukturovaná data jsou strojově čitelný štítek: „tohle je firma, tohle její adresa, tohle její produkty“. Google z nich staví obohacené výsledky (hvězdičky, ceny, FAQ) a AI systémy díky nim chápou a citují váš web přesně.",
    },
    fix: {
      en: "Add a JSON-LD <script type=\"application/ld+json\"> block describing your organization or business (schema.org types Organization / LocalBusiness), plus types matching your content (Product, Article, FAQPage…).",
      cs: "Přidejte blok JSON-LD <script type=\"application/ld+json\"> popisující vaši organizaci či firmu (typy schema.org Organization / LocalBusiness) plus typy odpovídající obsahu (Product, Article, FAQPage…).",
    },
    passTitle: {
      en: "The page contains structured data (JSON-LD).",
      cs: "Stránka obsahuje strukturovaná data (JSON-LD).",
    },
  },
  "ai-jsonld-invalid": {
    id: "ai-jsonld-invalid",
    pillar: "ai",
    roles: ["developer"],
    impact: 2,
    effort: 1,
    confidence: "measured",
    title: {
      en: "Some structured data blocks contain invalid JSON.",
      cs: "Některé bloky strukturovaných dat obsahují neplatný JSON.",
    },
    why: {
      en: "A structured data block with a syntax error is ignored entirely — you carry its weight in the page without getting any benefit from Google or AI systems.",
      cs: "Blok strukturovaných dat se syntaktickou chybou je ignorován celý — zatěžuje stránku, ale Google ani AI systémy z něj nic nezískají.",
    },
    fix: {
      en: "Validate the JSON-LD blocks with Google's Rich Results Test or schema.org validator and fix the syntax errors listed in the evidence.",
      cs: "Zvalidujte bloky JSON-LD nástrojem Rich Results Test od Googlu nebo validátorem schema.org a opravte syntaktické chyby uvedené v důkazech.",
    },
    passTitle: {
      en: "All structured data blocks are valid JSON.",
      cs: "Všechny bloky strukturovaných dat jsou platný JSON.",
    },
  },
  "ai-org-schema-missing": {
    id: "ai-org-schema-missing",
    pillar: "ai",
    roles: ["developer", "seo-specialist"],
    impact: 2,
    effort: 2,
    confidence: "measured",
    title: {
      en: "Structured data doesn't describe who you are (Organization/LocalBusiness).",
      cs: "Strukturovaná data neříkají, kdo jste (Organization/LocalBusiness).",
    },
    why: {
      en: "AI assistants build a “knowledge profile” of your brand. An Organization or LocalBusiness schema with your name, logo, address and links is the most direct way to feed that profile with facts you control.",
      cs: "AI asistenti si o vaší značce skládají „znalostní profil“. Schéma Organization nebo LocalBusiness se jménem, logem, adresou a odkazy je nejpřímější způsob, jak ten profil naplnit fakty, která máte pod kontrolou.",
    },
    fix: {
      en: "Add an Organization (or LocalBusiness) JSON-LD block on the homepage with name, url, logo, contact and sameAs links to your social profiles.",
      cs: "Přidejte na úvodní stránku JSON-LD blok Organization (nebo LocalBusiness) se jménem, url, logem, kontaktem a odkazy sameAs na vaše sociální profily.",
    },
    passTitle: {
      en: "Structured data identifies your organization.",
      cs: "Strukturovaná data identifikují vaši organizaci.",
    },
  },
  "ai-sameas-missing": {
    id: "ai-sameas-missing",
    pillar: "ai",
    roles: ["seo-specialist"],
    impact: 1,
    effort: 1,
    confidence: "measured",
    title: {
      en: "Organization schema has no sameAs links to your other profiles.",
      cs: "Schéma organizace nemá odkazy sameAs na vaše další profily.",
    },
    why: {
      en: "sameAs links (to LinkedIn, Facebook, a Wikipedia page, business registries…) let AI systems connect the dots between all mentions of your brand — which strengthens how confidently they talk about you.",
      cs: "Odkazy sameAs (na LinkedIn, Facebook, Wikipedii, obchodní rejstříky…) umožňují AI systémům spojit si všechny zmínky o vaší značce dohromady — a mluvit o vás s větší jistotou.",
    },
    fix: {
      en: "Add a sameAs array to the Organization schema listing your official profiles and directory listings.",
      cs: "Doplňte do schématu Organization pole sameAs se seznamem oficiálních profilů a katalogových zápisů.",
    },
    passTitle: {
      en: "Organization schema links your other profiles (sameAs).",
      cs: "Schéma organizace propojuje vaše další profily (sameAs).",
    },
  },
  "ai-faq-missing": {
    id: "ai-faq-missing",
    pillar: "ai",
    roles: ["copywriter"],
    impact: 2,
    effort: 2,
    confidence: "measured",
    title: {
      en: "The page has no question-and-answer content.",
      cs: "Stránka nemá obsah ve formě otázek a odpovědí.",
    },
    why: {
      en: "AI assistants answer questions — and they prefer to cite pages that already contain a clear question with a concise answer. FAQ sections are among the most-cited content formats in AI answers.",
      cs: "AI asistenti odpovídají na otázky — a nejraději citují stránky, které už jasnou otázku se stručnou odpovědí obsahují. Sekce FAQ patří k nejcitovanějším formátům v AI odpovědích.",
    },
    fix: {
      en: "Add an FAQ section answering the questions customers actually ask (price, delivery, how it works…). Use real question headings and answer each in 2–4 sentences; optionally mark it up with FAQPage schema.",
      cs: "Přidejte sekci FAQ s otázkami, na které se zákazníci opravdu ptají (cena, dodání, jak to funguje…). Použijte skutečné otázky jako nadpisy a každou zodpovězte ve 2–4 větách; volitelně doplňte schéma FAQPage.",
    },
    passTitle: {
      en: "The page contains question-and-answer content.",
      cs: "Stránka obsahuje obsah ve formě otázek a odpovědí.",
    },
  },
  "ai-thin-content": {
    id: "ai-thin-content",
    pillar: "ai",
    roles: ["copywriter"],
    impact: 2,
    effort: 3,
    confidence: "measured",
    title: {
      en: "The page has very little text content.",
      cs: "Stránka má velmi málo textového obsahu.",
    },
    why: {
      en: "Both Google and AI assistants can only recommend you for topics your site actually covers in text. A page with a few sentences gives them nothing to quote — no matter how good the design is.",
      cs: "Google i AI asistenti vás mohou doporučit jen pro témata, která váš web skutečně textově pokrývá. Stránka s pár větami jim nedá co citovat — ať je design jakkoli pěkný.",
    },
    fix: {
      en: "Describe in plain text what you do, for whom, where and for how much. Aim for at least a few hundred words of genuinely useful content on key pages.",
      cs: "Popište běžným textem, co děláte, pro koho, kde a za kolik. Na klíčových stránkách miřte aspoň na několik set slov skutečně užitečného obsahu.",
    },
    passTitle: {
      en: "The page has a solid amount of text content.",
      cs: "Stránka má dostatek textového obsahu.",
    },
  },
  "ai-citability-weak": {
    id: "ai-citability-weak",
    pillar: "ai",
    roles: ["copywriter"],
    impact: 2,
    effort: 2,
    confidence: "measured",
    title: {
      en: "The content is hard for AI to quote (long walls of text, no lists or clear structure).",
      cs: "Obsah se AI špatně cituje (dlouhé bloky textu bez seznamů a jasné struktury).",
    },
    why: {
      en: "AI answers are built from snippets: definitions, bullet lists, short factual paragraphs, numbers. Pages structured that way get quoted; unbroken walls of text get skipped.",
      cs: "AI odpovědi se skládají z útržků: definic, odrážkových seznamů, krátkých faktických odstavců, čísel. Takto strukturované stránky se citují; nepřerušované zdi textu se přeskakují.",
    },
    fix: {
      en: "Break content into short paragraphs under descriptive headings, use bullet lists for enumerations, and state key facts (prices, dates, numbers) explicitly in the text.",
      cs: "Rozdělte obsah do krátkých odstavců pod popisnými nadpisy, výčty pište jako odrážkové seznamy a klíčová fakta (ceny, termíny, čísla) uvádějte v textu výslovně.",
    },
    passTitle: {
      en: "The content is structured in an AI-friendly way.",
      cs: "Obsah je strukturovaný tak, aby se dobře citoval.",
    },
  },
  "ai-eeat-weak": {
    id: "ai-eeat-weak",
    pillar: "ai",
    roles: ["copywriter", "seo-specialist"],
    impact: 2,
    effort: 2,
    confidence: "measured",
    title: {
      en: "The page shows weak trust signals (who's behind it, how to reach you).",
      cs: "Stránka má slabé signály důvěryhodnosti (kdo za ní stojí, jak vás kontaktovat).",
    },
    why: {
      en: "Google calls this E-E-A-T (experience, expertise, authoritativeness, trust). Both search and AI systems favour sites that clearly show who runs them, real contact details and an about page. Anonymous sites are cited less and ranked lower — especially for advice, health or money topics.",
      cs: "Google tomu říká E-E-A-T (zkušenost, odbornost, autorita, důvěryhodnost). Vyhledávače i AI systémy upřednostňují weby, kde je jasné, kdo je provozuje, s reálnými kontakty a stránkou „o nás“. Anonymní weby se citují méně a řadí níž — zvlášť u rad, zdraví a peněz.",
    },
    fix: {
      en: "Add a visible link to an About page and a Contact page with a real address/phone/e-mail. On articles, name the author. Consistency with your Google Business Profile and registries strengthens the signal.",
      cs: "Přidejte viditelný odkaz na stránku „O nás“ a „Kontakt“ s reálnou adresou/telefonem/e-mailem. U článků uvádějte autora. Soulad s profilem na Google Business a v rejstřících signál posiluje.",
    },
    passTitle: {
      en: "The page shows clear trust signals (about/contact).",
      cs: "Stránka má jasné signály důvěryhodnosti (o nás / kontakt).",
    },
  },
  "ai-llms-txt-info": {
    id: "ai-llms-txt-info",
    pillar: "ai",
    roles: ["developer"],
    impact: 1,
    effort: 1,
    confidence: "measured",
    title: {
      en: "No llms.txt file (an experimental, optional standard).",
      cs: "Chybí soubor llms.txt (experimentální, nepovinný standard).",
    },
    why: {
      en: "llms.txt is a proposed convention where a site offers AI systems a curated summary of its content. Honest framing: it is experimental and no major AI provider has committed to reading it. It can't hurt, may help later, but is NOT a ranking factor today — treat it as optional polish, not a required fix.",
      cs: "llms.txt je navrhovaná konvence, kterou web nabízí AI systémům přehledné shrnutí svého obsahu. Poctivě řečeno: jde o experiment a žádný velký provozovatel AI se k jeho čtení nezavázal. Neuškodí, časem možná pomůže, ale dnes NENÍ faktorem viditelnosti — berte ho jako nepovinný detail, ne nutnou opravu.",
    },
    fix: {
      en: "Optionally create /llms.txt with a short markdown summary of your site and links to key pages. Low priority — do the other findings first.",
      cs: "Volitelně vytvořte /llms.txt s krátkým markdown shrnutím webu a odkazy na klíčové stránky. Nízká priorita — nejdřív řešte ostatní nálezy.",
    },
    passTitle: {
      en: "The site provides an llms.txt file (experimental standard).",
      cs: "Web nabízí soubor llms.txt (experimentální standard).",
    },
  },

  /* ================================================================
   * PILLAR C — Accessibility (WCAG 2.2)
   * ================================================================ */
  "a11y-lang-missing": {
    id: "a11y-lang-missing",
    pillar: "a11y",
    roles: ["developer"],
    impact: 3,
    effort: 1,
    confidence: "measured",
    wcag: { criterion: "3.1.1 Language of Page", level: "A" },
    title: {
      en: "The page doesn't declare its language.",
      cs: "Stránka nedeklaruje svůj jazyk.",
    },
    why: {
      en: "Screen readers pick their voice and pronunciation from the lang attribute. Without it, a Czech page may be read aloud with English pronunciation — effectively gibberish for a blind visitor. Search engines and translators rely on it too.",
      cs: "Odečítače obrazovky podle atributu lang volí hlas a výslovnost. Bez něj může být česká stránka předčítána anglickou výslovností — pro nevidomého návštěvníka nesrozumitelný blábol. Spoléhají na něj i vyhledávače a překladače.",
    },
    fix: {
      en: "Add the language to the <html> tag, e.g. <html lang=\"en\"> or <html lang=\"cs\">.",
      cs: "Doplňte jazyk do značky <html>, např. <html lang=\"cs\"> nebo <html lang=\"en\">.",
    },
    passTitle: {
      en: "The page declares its language.",
      cs: "Stránka deklaruje svůj jazyk.",
    },
  },
  "a11y-img-alt": {
    id: "a11y-img-alt",
    pillar: "a11y",
    roles: ["copywriter", "developer"],
    impact: 3,
    effort: 1,
    confidence: "measured",
    wcag: { criterion: "1.1.1 Non-text Content", level: "A" },
    title: {
      en: "Images are missing text alternatives (alt).",
      cs: "Obrázkům chybí textové alternativy (alt).",
    },
    why: {
      en: "Blind and low-vision visitors “see” images through their alt text. Without it, a screen reader says just “image” — if the image is a button or carries information, that part of the site is unusable. Alt text also helps Google and AI understand your images.",
      cs: "Nevidomí a slabozrací návštěvníci „vidí“ obrázky skrz jejich alt text. Bez něj odečítač řekne jen „obrázek“ — a pokud je obrázek tlačítkem nebo nese informaci, je tato část webu nepoužitelná. Alt texty navíc pomáhají Googlu i AI pochopit vaše obrázky.",
    },
    fix: {
      en: "Add alt=\"…\" describing what the image shows or does (e.g. alt=\"Order form\" for a button). Purely decorative images get an empty alt=\"\".",
      cs: "Doplňte alt=\"…\" popisující, co obrázek ukazuje nebo dělá (např. alt=\"Objednávkový formulář\" u tlačítka). Čistě dekorativní obrázky dostanou prázdné alt=\"\".",
    },
    passTitle: {
      en: "Images have text alternatives.",
      cs: "Obrázky mají textové alternativy.",
    },
  },
  "a11y-form-labels": {
    id: "a11y-form-labels",
    pillar: "a11y",
    roles: ["developer"],
    impact: 3,
    effort: 2,
    confidence: "measured",
    wcag: { criterion: "1.3.1 / 4.1.2 Labels", level: "A" },
    title: {
      en: "Form fields are missing labels.",
      cs: "Formulářová pole nemají popisky.",
    },
    why: {
      en: "Without a proper label, a screen-reader user hears “edit text” with no clue whether the field wants a name, e-mail or phone. Unlabelled forms mean lost orders and enquiries from these visitors — and they're a legal requirement under the European Accessibility Act.",
      cs: "Bez správného popisku slyší uživatel odečítače jen „editační pole“ a neví, jestli má zadat jméno, e-mail nebo telefon. Formuláře bez popisků znamenají ztracené objednávky a poptávky od těchto návštěvníků — a jsou i zákonným požadavkem podle evropského aktu o přístupnosti (EAA).",
    },
    fix: {
      en: "Pair every field with a visible <label for=\"…\">. Placeholder text alone is not a label — it disappears while typing.",
      cs: "Ke každému poli přidejte viditelný <label for=\"…\">. Samotný placeholder popiskem není — při psaní zmizí.",
    },
    passTitle: {
      en: "Form fields have labels.",
      cs: "Formulářová pole mají popisky.",
    },
  },
  "a11y-link-name": {
    id: "a11y-link-name",
    pillar: "a11y",
    roles: ["copywriter", "developer"],
    impact: 2,
    effort: 1,
    confidence: "measured",
    wcag: { criterion: "2.4.4 Link Purpose", level: "A" },
    title: {
      en: "Some links have no readable text.",
      cs: "Některé odkazy nemají čitelný text.",
    },
    why: {
      en: "Links that are just an icon or image with no text are announced as “link” — screen-reader users can't tell where they lead. Descriptive link text also helps SEO.",
      cs: "Odkazy tvořené jen ikonou nebo obrázkem bez textu se hlásí jako „odkaz“ — uživatelé odečítačů nepoznají, kam vedou. Popisný text odkazů navíc pomáhá SEO.",
    },
    fix: {
      en: "Give every link visible text or an aria-label (e.g. aria-label=\"Our Facebook profile\" on a Facebook icon).",
      cs: "Dejte každému odkazu viditelný text nebo aria-label (např. aria-label=\"Náš profil na Facebooku\" u ikony Facebooku).",
    },
    passTitle: {
      en: "Links have readable text.",
      cs: "Odkazy mají čitelný text.",
    },
  },
  "a11y-button-name": {
    id: "a11y-button-name",
    pillar: "a11y",
    roles: ["developer"],
    impact: 3,
    effort: 1,
    confidence: "measured",
    wcag: { criterion: "4.1.2 Name, Role, Value", level: "A" },
    title: {
      en: "Some buttons have no readable name.",
      cs: "Některá tlačítka nemají čitelný název.",
    },
    why: {
      en: "A button announced only as “button” is a mystery box — a screen-reader user won't press “Submit order” if they can't tell it from “Delete”. This directly blocks purchases and enquiries.",
      cs: "Tlačítko ohlášené jen jako „tlačítko“ je zavřená krabička — uživatel odečítače nezmáčkne „Odeslat objednávku“, když ho nerozezná od „Smazat“. Tohle přímo blokuje nákupy a poptávky.",
    },
    fix: {
      en: "Add visible text or aria-label to every button, including icon-only ones (menu, search, close).",
      cs: "Doplňte viditelný text nebo aria-label ke každému tlačítku, včetně ikonových (menu, hledání, zavřít).",
    },
    passTitle: {
      en: "Buttons have readable names.",
      cs: "Tlačítka mají čitelné názvy.",
    },
  },
  "a11y-zoom-disabled": {
    id: "a11y-zoom-disabled",
    pillar: "a11y",
    roles: ["developer"],
    impact: 3,
    effort: 1,
    confidence: "measured",
    wcag: { criterion: "1.4.4 Resize Text", level: "AA" },
    title: {
      en: "The page blocks zooming on mobile.",
      cs: "Stránka blokuje přibližování na mobilu.",
    },
    why: {
      en: "With zoom disabled, visitors with weaker eyesight can't enlarge your phone number, prices or opening hours — they simply can't read them and leave. It's one of the most common and most damaging accessibility mistakes, and trivially easy to fix.",
      cs: "Se zakázaným zoomem si návštěvníci s horším zrakem nemohou přiblížit váš telefon, ceny ani otevírací dobu — prostě je nepřečtou a odejdou. Je to jedna z nejčastějších a nejškodlivějších chyb přístupnosti, a přitom triviálně snadná na opravu.",
    },
    fix: {
      en: "Remove user-scalable=no and any maximum-scale below 2 from the viewport meta tag.",
      cs: "Odstraňte z meta značky viewport hodnotu user-scalable=no a jakékoli maximum-scale menší než 2.",
    },
    passTitle: {
      en: "The page allows zooming on mobile.",
      cs: "Stránka umožňuje přibližování na mobilu.",
    },
  },
  "a11y-bypass": {
    id: "a11y-bypass",
    pillar: "a11y",
    roles: ["developer"],
    impact: 2,
    effort: 2,
    confidence: "measured",
    wcag: { criterion: "2.4.1 Bypass Blocks", level: "A" },
    title: {
      en: "There's no way to skip the menu and jump to content.",
      cs: "Chybí možnost přeskočit menu a skočit na obsah.",
    },
    why: {
      en: "Keyboard users must tab through the entire menu on every single page before reaching the content. A “skip to content” link or proper landmarks (main, nav) removes that friction.",
      cs: "Uživatelé ovládající web klávesnicí musí na každé stránce protabovat celé menu, než se dostanou k obsahu. Odkaz „přeskočit na obsah“ nebo správné orientační oblasti (main, nav) tuhle bariéru odstraní.",
    },
    fix: {
      en: "Add a “Skip to content” link as the first focusable element, and wrap page regions in semantic landmarks: <header>, <nav>, <main>, <footer>.",
      cs: "Přidejte odkaz „Přeskočit na obsah“ jako první prvek dosažitelný klávesnicí a obalte oblasti stránky sémantickými značkami: <header>, <nav>, <main>, <footer>.",
    },
    passTitle: {
      en: "The page offers landmarks or a skip link.",
      cs: "Stránka nabízí orientační oblasti nebo odkaz pro přeskočení menu.",
    },
  },
  "a11y-aria-misuse": {
    id: "a11y-aria-misuse",
    pillar: "a11y",
    roles: ["developer"],
    impact: 2,
    effort: 2,
    confidence: "measured",
    wcag: { criterion: "4.1.2 Name, Role, Value", level: "A" },
    title: {
      en: "ARIA attributes are used incorrectly.",
      cs: "Atributy ARIA jsou použité chybně.",
    },
    why: {
      en: "ARIA attributes tell assistive technologies what custom widgets do. Used wrongly, they actively mislead — a screen reader may announce a menu that can't be opened or hide content that should be read. Wrong ARIA is worse than no ARIA.",
      cs: "Atributy ARIA říkají asistivním technologiím, co dělají vlastní ovládací prvky. Při chybném použití aktivně matou — odečítač může hlásit menu, které nejde otevřít, nebo skrýt obsah, který má být přečten. Špatné ARIA je horší než žádné.",
    },
    fix: {
      en: "Fix the ARIA issues listed in the evidence (invalid values, missing required attributes, roles on wrong elements). Prefer native HTML elements (button, nav, details) over ARIA reimplementations.",
      cs: "Opravte problémy ARIA uvedené v důkazech (neplatné hodnoty, chybějící povinné atributy, role na špatných prvcích). Upřednostněte nativní HTML prvky (button, nav, details) před napodobováním přes ARIA.",
    },
    passTitle: {
      en: "No ARIA misuse detected.",
      cs: "Nezjistili jsme chybné použití ARIA.",
    },
  },
  "a11y-tabindex-positive": {
    id: "a11y-tabindex-positive",
    pillar: "a11y",
    roles: ["developer"],
    impact: 1,
    effort: 1,
    confidence: "measured",
    wcag: { criterion: "2.4.3 Focus Order", level: "A" },
    title: {
      en: "Elements use positive tabindex values.",
      cs: "Prvky používají kladné hodnoty tabindex.",
    },
    why: {
      en: "Positive tabindex overrides the natural keyboard order, so pressing Tab jumps around the page unpredictably — confusing for keyboard and screen-reader users.",
      cs: "Kladný tabindex přebíjí přirozené pořadí ovládání klávesnicí, takže tabulátor skáče po stránce nepředvídatelně — což mate uživatele klávesnice i odečítačů.",
    },
    fix: {
      en: "Remove positive tabindex values and let the DOM order define the tab order (use tabindex=\"0\" or \"-1\" only where needed).",
      cs: "Odstraňte kladné hodnoty tabindex a nechte pořadí určit strukturou stránky (tabindex=\"0\" nebo \"-1\" používejte jen kde je nutné).",
    },
    passTitle: {
      en: "No positive tabindex values.",
      cs: "Žádné kladné hodnoty tabindex.",
    },
  },
  "a11y-iframe-title": {
    id: "a11y-iframe-title",
    pillar: "a11y",
    roles: ["developer"],
    impact: 2,
    effort: 1,
    confidence: "measured",
    wcag: { criterion: "4.1.2 Name, Role, Value", level: "A" },
    title: {
      en: "Embedded frames (iframes) have no title.",
      cs: "Vložené rámy (iframe) nemají název.",
    },
    why: {
      en: "Maps, videos and forms are often embedded via iframes. Without a title, a screen reader announces just “frame” and the user has to enter it blind to find out what's inside.",
      cs: "Mapy, videa a formuláře se často vkládají přes iframe. Bez názvu odečítač ohlásí jen „rám“ a uživatel do něj musí vstoupit naslepo, aby zjistil, co obsahuje.",
    },
    fix: {
      en: "Add title=\"…\" to each iframe, e.g. title=\"Map showing our office location\".",
      cs: "Doplňte každému iframe atribut title=\"…\", např. title=\"Mapa s polohou naší kanceláře\".",
    },
    passTitle: {
      en: "Embedded frames have titles.",
      cs: "Vložené rámy mají názvy.",
    },
  },
  "a11y-axe-other": {
    id: "a11y-axe-other",
    pillar: "a11y",
    roles: ["developer"],
    impact: 2,
    effort: 2,
    confidence: "measured",
    title: {
      en: "Automated testing found further accessibility issues.",
      cs: "Automatický test našel další problémy s přístupností.",
    },
    why: {
      en: "These issues were detected by the axe-core engine (the industry-standard automated accessibility tester). Each one is a barrier for some group of visitors and counts against WCAG conformance.",
      cs: "Tyto problémy odhalil nástroj axe-core (průmyslový standard pro automatické testování přístupnosti). Každý z nich je bariérou pro určitou skupinu návštěvníků a počítá se proti shodě s WCAG.",
    },
    fix: {
      en: "Work through the issues listed in the evidence. Each includes the rule name and the affected elements; the axe-core documentation describes the exact fix for every rule.",
      cs: "Projděte problémy uvedené v důkazech. U každého je název pravidla a dotčené prvky; dokumentace axe-core popisuje přesnou opravu pro každé pravidlo.",
    },
    passTitle: {
      en: "No further automated accessibility issues.",
      cs: "Žádné další automaticky zjištěné problémy s přístupností.",
    },
  },
};

/** Roles metadata for display */
export const ROLE_INFO: Record<
  string,
  { en: string; cs: string }
> = {
  developer: { en: "Developer", cs: "Vývojář / programátor" },
  devops: { en: "Hosting / DevOps", cs: "Hosting / správce serveru" },
  designer: { en: "Designer / UX", cs: "Designér / UX" },
  copywriter: { en: "Copywriter / Content", cs: "Copywriter / obsah" },
  "seo-specialist": { en: "SEO / Marketing specialist", cs: "SEO / marketingový specialista" },
};
