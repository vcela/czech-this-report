import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";

interface Props {
  params: Promise<{ locale: string }>;
}

const content: Record<Locale, { sections: { h: string; body: string[] }[] }> = {
  en: {
    sections: [
      {
        h: "What we scan",
        body: [
          "When you submit an address, we fetch your homepage HTML, robots.txt, sitemap and llms.txt, read the HTTP response headers, and — when Google's PageSpeed service is available — run a real Lighthouse performance test. We read only; nothing on your site is changed.",
          "The scan currently analyses the page you submit (typically the homepage). Site-wide crawling of every subpage is deliberately out of scope for a free instant report — the homepage carries most of the signals AI systems and search engines use to judge a brand.",
        ],
      },
      {
        h: "Measured vs. estimated — the honesty rule",
        body: [
          "Every metric in the report is labelled either “Measured” (we directly observed it on your site: a missing tag, a blocked crawler, a slow response) or “Estimate” (derived from indirect signals). We never blend the two into one number without saying so.",
          "That's also why the free scan does not show an “AI mention score”: we don't query ChatGPT or Perplexity with live prompts in the free tier, and showing a guessed number next to real measurements would be misleading. Tools that do this without saying so are selling you noise.",
        ],
      },
      {
        h: "How priorities are calculated",
        body: [
          "Each finding has an impact rating (how much it hurts traffic, conversions or legal compliance: 1–3) and an effort rating (how hard it is to fix: 1–3). Priority = impact × 3 + (3 − effort). Critical ≥ 10, High ≥ 8, Medium ≥ 6, otherwise Low.",
          "Findings with high impact and low effort get a “Quick win” badge and float to the top of “Fix these first”. The logic is deliberately simple enough to print in one sentence — a score you can't explain is a score you can't trust.",
        ],
      },
      {
        h: "How scores are calculated",
        body: [
          "Each pillar starts at 100 points. Every finding subtracts a penalty by priority: Critical −28, High −16, Medium −8, Low −3. Scores floor at 0. The overall score is the plain average of the three pillars — they are equally important by design.",
          "Colour bands: 0–39 red (needs urgent attention), 40–69 orange (room to improve), 70–100 green (in good shape).",
        ],
      },
      {
        h: "Accessibility: what automation can and cannot see",
        body: [
          "We run the axe-core engine (the same one behind Lighthouse and most professional tools) plus our own static checks against WCAG 2.2. Important: automated tools can verify only roughly 30–50 % of WCAG criteria. Colour contrast, keyboard operability or caption quality need a human.",
          "That's why the report shows an explicit manual checklist and why the conformance line says “estimated”. A green automated result is a good sign, not a certificate. The conformance estimate maps automated failures to WCAG levels: any level-A failure means “does not meet A”; only AA failures means “meets A, not AA”.",
        ],
      },
      {
        h: "AI visibility: what the signals mean",
        body: [
          "The AI pillar measures what is directly observable: whether AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot) may read your site, whether structured data describes your organization, whether the content has a citable structure (Q&A, lists, definitions, facts), and whether trust signals (about page, contacts, authorship) are present.",
          "These are the levers you control. Whether an AI assistant actually mentions you also depends on your off-site authority — reviews, mentions, links — which a single-page scan cannot measure and which we therefore don't score.",
          "llms.txt is reported as informational only. It is an experimental proposal, not an established standard, and we won't pretend otherwise.",
        ],
      },
      {
        h: "Performance",
        body: [
          "When available, we use Google PageSpeed Insights (Lighthouse, mobile) — real lab measurements of Largest Contentful Paint, layout shift and total performance. If PSI is unavailable, we show only our own direct measurements (server response time, HTML size) and clearly say the full test didn't run. We never substitute an invented performance score.",
        ],
      },
      {
        h: "Data & privacy",
        body: [
          "Reports are stored under an unguessable link so you can return to them and share them. They are excluded from search-engine indexing. Contact-form submissions are used solely to reply to your enquiry.",
        ],
      },
    ],
  },
  cs: {
    sections: [
      {
        h: "Co skenujeme",
        body: [
          "Po zadání adresy načteme HTML vaší úvodní stránky, robots.txt, sitemapu a llms.txt, přečteme HTTP hlavičky odpovědi a — pokud je dostupná služba PageSpeed od Googlu — spustíme skutečný výkonnostní test Lighthouse. Pouze čteme; na vašem webu se nic nemění.",
          "Sken aktuálně analyzuje zadanou stránku (typicky homepage). Procházení všech podstránek je u bezplatného okamžitého reportu záměrně mimo rozsah — úvodní stránka nese většinu signálů, podle kterých AI systémy a vyhledávače značku posuzují.",
        ],
      },
      {
        h: "Změřeno vs. odhad — pravidlo poctivosti",
        body: [
          "Každá metrika v reportu nese označení „Změřeno“ (přímo jsme to na webu pozorovali: chybějící značka, zablokovaný robot, pomalá odezva), nebo „Odhad“ (odvozeno z nepřímých signálů). Nikdy je nemícháme do jednoho čísla bez upozornění.",
          "Proto také bezplatný sken neukazuje žádné „skóre AI zmínek“: v bezplatné verzi se neptáme ChatGPT ani Perplexity živými dotazy, a ukazovat odhadnuté číslo vedle skutečných měření by bylo zavádějící. Nástroje, které to dělají bez upozornění, vám prodávají šum.",
        ],
      },
      {
        h: "Jak se počítají priority",
        body: [
          "Každý nález má hodnocení dopadu (jak moc škodí návštěvnosti, konverzím nebo právní shodě: 1–3) a náročnosti opravy (1–3). Priorita = dopad × 3 + (3 − náročnost). Kritické ≥ 10, Vysoká ≥ 8, Střední ≥ 6, jinak Nízká.",
          "Nálezy s velkým dopadem a snadnou opravou dostanou štítek „Rychlá výhra“ a řadí se na začátek sekce „Opravte nejdřív tohle“. Logika je schválně tak jednoduchá, že se vejde do jedné věty — skóre, které neumíte vysvětlit, je skóre, kterému nejde věřit.",
        ],
      },
      {
        h: "Jak se počítá skóre",
        body: [
          "Každý pilíř začíná na 100 bodech. Každý nález odečte penalizaci podle priority: Kritické −28, Vysoká −16, Střední −8, Nízká −3. Skóre neklesá pod 0. Celkové skóre je prostý průměr tří pilířů — jsou si záměrně rovnocenné.",
          "Barevná pásma: 0–39 červená (vyžaduje okamžitou pozornost), 40–69 oranžová (prostor ke zlepšení), 70–100 zelená (v dobré kondici).",
        ],
      },
      {
        h: "Přístupnost: co automat vidí a co ne",
        body: [
          "Spouštíme engine axe-core (stejný, jaký pohání Lighthouse a většinu profesionálních nástrojů) plus vlastní statické kontroly proti WCAG 2.2. Důležité: automatické nástroje ověří jen zhruba 30–50 % kritérií WCAG. Barevný kontrast, ovládání klávesnicí nebo kvalitu titulků musí posoudit člověk.",
          "Proto report obsahuje výslovný ruční checklist a proto je u shody napsáno „odhadovaná“. Zelený automatický výsledek je dobré znamení, ne certifikát. Odhad shody mapuje automaticky zjištěné chyby na úrovně WCAG: jakákoli chyba úrovně A znamená „nesplňuje A“; pouze chyby AA znamenají „splňuje A, ne AA“.",
        ],
      },
      {
        h: "AI viditelnost: co signály znamenají",
        body: [
          "Pilíř AI měří to, co je přímo pozorovatelné: zda AI roboti (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot) smí web číst, zda strukturovaná data popisují vaši organizaci, zda má obsah citovatelnou strukturu (otázky a odpovědi, seznamy, definice, fakta) a zda jsou přítomny signály důvěryhodnosti (stránka o nás, kontakty, autorství).",
          "To jsou páky, které máte v ruce. Jestli vás AI asistent skutečně zmíní, závisí i na autoritě mimo váš web — recenzích, zmínkách, odkazech — kterou sken jedné stránky změřit neumí, a proto ji nehodnotíme.",
          "llms.txt uvádíme jen informativně. Jde o experimentální návrh, ne zavedený standard, a nebudeme předstírat opak.",
        ],
      },
      {
        h: "Výkon",
        body: [
          "Pokud je dostupný, používáme Google PageSpeed Insights (Lighthouse, mobil) — skutečná laboratorní měření vykreslení hlavního obsahu, poskakování rozložení a celkového výkonu. Když PSI dostupné není, ukážeme jen vlastní přímá měření (odezvu serveru, velikost HTML) a jasně řekneme, že plný test neproběhl. Vymyšlené výkonnostní skóre nikdy nedosazujeme.",
        ],
      },
      {
        h: "Data a soukromí",
        body: [
          "Reporty se ukládají pod neuhodnutelným odkazem, abyste se k nim mohli vracet a sdílet je. Z indexace vyhledávači jsou vyloučené. Údaje z kontaktního formuláře slouží výhradně k odpovědi na vaši poptávku.",
        ],
      },
    ],
  },
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isLocale(locale)) return {};
  const dict = getDict(locale);
  return {
    title: dict.methodology.title,
    description: dict.methodology.intro,
    alternates: {
      canonical: `/${locale}/methodology`,
      languages: { en: "/en/methodology", cs: "/cs/methodology" },
    },
  };
}

export default async function MethodologyPage(props: Props) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const dict = getDict(locale);
  const c = content[locale];

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl sm:text-4xl font-bold">{dict.methodology.title}</h1>
      <p className="text-muted mt-3 text-lg leading-relaxed">{dict.methodology.intro}</p>
      <div className="mt-10 space-y-10">
        {c.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-xl font-bold mb-3">{s.h}</h2>
            {s.body.map((par, i) => (
              <p key={i} className="text-muted leading-relaxed mb-3">
                {par}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
