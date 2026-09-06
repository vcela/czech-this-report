import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { CREATOR, RETENTION } from "@/lib/site";

interface Props {
  params: Promise<{ locale: string }>;
}

/** Date this policy text was last edited. Bump it whenever the copy changes. */
const UPDATED = "2026-09-06";

const reportMonths = Math.round(RETENTION.reportDays / 30);
const leadYears = Math.round(RETENTION.leadDays / 365);

/** Registered details, printed only once they are filled in in site.ts. */
const registered = (idLabel: string) =>
  [CREATOR.ico && `${idLabel} ${CREATOR.ico}`, CREATOR.address].filter(Boolean).join(", ");

const content: Record<Locale, { intro: string; sections: { h: string; body: string[] }[] }> = {
  en: {
    intro:
      "This page explains what happens to data when you use Czech Th!s Report — what is stored, why, for how long, and who else sees it. It is deliberately short, because the tool deliberately collects very little.",
    sections: [
      {
        h: "Who is responsible",
        body: [
          `The controller is ${CREATOR.name}, operating as ${CREATOR.studio} (${CREATOR.url}).${registered("Company ID (IČO)") ? ` ${registered("Company ID (IČO)")}.` : ""}`,
          `For anything in this policy — including a request to see or delete your data — write to ${CREATOR.email}. You will get an answer within 30 days.`,
        ],
      },
      {
        h: "The address you submit for an audit",
        body: [
          "When you run an audit we fetch the address you entered and everything publicly available at it: the page HTML, robots.txt, sitemap.xml, llms.txt and the HTTP response headers. We only read; nothing on the audited site is changed.",
          "The resulting report is stored under a random identifier and is readable by anyone who has the link. It is not listed anywhere on this site and search engines are asked not to index it (robots.txt), but treat the link as semi-public and share it accordingly.",
          `Reports are deleted automatically ${reportMonths} months after they are created. If you want one removed sooner, send us the link.`,
        ],
      },
      {
        h: "The contact form",
        body: [
          "If you write to us through the form, we process the name, e-mail address and message you type, plus the identifier of the report you had open, so the reply makes sense. The purpose is answering your enquiry and, if it leads to one, agreeing a job.",
          `That message is stored on our server and forwarded to us by e-mail. We keep it for ${leadYears} years so we can look up what was agreed, then delete it.`,
        ],
      },
      {
        h: "What we do not do",
        body: [
          "This site sets no cookies, runs no analytics, no advertising pixels and no third-party tracking of any kind. The fonts are served from our own server, not from Google Fonts.",
          "Your IP address is held in the server's memory for a few minutes purely to enforce the rate limit (a cap of 10 audits per 10 minutes). It is never written to a database and disappears when the server restarts.",
          "The “mark as resolved” ticks in a report are saved in your own browser (localStorage). They never reach our server and we cannot read them.",
        ],
      },
      {
        h: "Who else the data reaches",
        body: [
          "Railway (hosting) runs the server and therefore stores the database on our behalf.",
          "Resend (e-mail delivery) transmits messages sent through the contact form.",
          "Google PageSpeed Insights receives the address you submitted — that is how the loading-speed measurement is taken. Nothing about you personally is sent with it.",
          "Nobody else. We do not sell data, share it for advertising, or use it to train anything.",
        ],
      },
      {
        h: "Your rights",
        body: [
          "Under the GDPR you can ask us for a copy of your data, for it to be corrected or deleted, for processing to be restricted, and you can object to processing based on legitimate interest. Where processing rests on your consent, you can withdraw it at any time.",
          `Write to ${CREATOR.email} — no particular form is needed. If you believe we have handled your data badly, you can complain to the Czech data protection authority, Úřad pro ochranu osobních údajů (uoou.gov.cz).`,
        ],
      },
    ],
  },
  cs: {
    intro:
      "Tahle stránka popisuje, co se stane s daty, když použijete Czech Th!s Report — co se ukládá, proč, na jak dlouho a kdo další se k tomu dostane. Je záměrně krátká, protože nástroj záměrně sbírá minimum.",
    sections: [
      {
        h: "Kdo za to odpovídá",
        body: [
          `Správcem osobních údajů je ${CREATOR.name}, podnikající pod značkou ${CREATOR.studio} (${CREATOR.url}).${registered("IČO") ? ` ${registered("IČO")}.` : ""}`,
          `S čímkoli z těchto zásad — včetně žádosti o výpis nebo výmaz vašich údajů — se obraťte na ${CREATOR.email}. Odpověď dostanete do 30 dnů.`,
        ],
      },
      {
        h: "Adresa, kterou zadáte k auditu",
        body: [
          "Když spustíte audit, stáhneme zadanou adresu a všechno, co je na ní veřejně dostupné: HTML stránky, robots.txt, sitemap.xml, llms.txt a hlavičky HTTP odpovědi. Pouze čteme; na prověřovaném webu se nic nemění.",
          "Výsledný report se uloží pod náhodným identifikátorem a přečte si ho každý, kdo má odkaz. Nikde na tomhle webu ho nevypisujeme a vyhledávače žádáme, aby ho neindexovaly (robots.txt), ale berte ten odkaz jako polověřejný a podle toho ho sdílejte.",
          `Reporty se automaticky mažou ${reportMonths} měsíců od vytvoření. Pokud chcete některý smazat dřív, pošlete nám na něj odkaz.`,
        ],
      },
      {
        h: "Kontaktní formulář",
        body: [
          "Když nám napíšete přes formulář, zpracujeme jméno, e-mail a text zprávy, které vyplníte, plus identifikátor reportu, který jste měli otevřený — aby odpověď dávala smysl. Účelem je zodpovědět váš dotaz a případně se domluvit na zakázce.",
          `Zprávu ukládáme na našem serveru a zároveň si ji přeposíláme e-mailem. Uchováváme ji ${leadYears} roky, abychom si mohli dohledat, co bylo domluveno, a pak ji smažeme.`,
        ],
      },
      {
        h: "Co naopak neděláme",
        body: [
          "Tenhle web nenastavuje žádné cookies, neběží na něm analytika, reklamní pixely ani jakékoli sledování třetích stran. Písma servírujeme z vlastního serveru, ne z Google Fonts.",
          "Vaši IP adresu držíme několik minut v paměti serveru, a to výhradně kvůli omezení počtu požadavků (limit 10 auditů za 10 minut). Nikdy se nezapisuje do databáze a s restartem serveru mizí.",
          "Odškrtnutí „vyřešeno“ v reportu se ukládá ve vašem prohlížeči (localStorage). Na náš server se nikdy nedostane a nemůžeme si ho přečíst.",
        ],
      },
      {
        h: "Ke komu se údaje dostanou",
        body: [
          "Railway (hosting) provozuje server, a tím pádem pro nás uchovává databázi.",
          "Resend (doručování e-mailů) přenáší zprávy odeslané z kontaktního formuláře.",
          "Google PageSpeed Insights dostane adresu, kterou jste zadali — tak se měří rychlost načítání. Nic o vás osobně se s ní neposílá.",
          "Nikdo další. Údaje neprodáváme, nesdílíme je pro reklamu ani na nich nic netrénujeme.",
        ],
      },
      {
        h: "Vaše práva",
        body: [
          "Podle GDPR nás můžete požádat o kopii svých údajů, o jejich opravu nebo výmaz, o omezení zpracování a můžete vznést námitku proti zpracování založenému na oprávněném zájmu. Tam, kde zpracování stojí na vašem souhlasu, ho můžete kdykoli odvolat.",
          `Napište na ${CREATOR.email} — žádný formulář na to není potřeba. Pokud si myslíte, že jsme s vašimi údaji naložili špatně, můžete si stěžovat u Úřadu pro ochranu osobních údajů (uoou.gov.cz).`,
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
    title: dict.privacy.title,
    description: content[locale].intro,
    alternates: {
      canonical: `/${locale}/privacy`,
      languages: { en: "/en/privacy", cs: "/cs/privacy" },
    },
  };
}

export default async function PrivacyPage(props: Props) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const dict = getDict(locale);
  const c = content[locale];

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl sm:text-4xl font-bold">{dict.privacy.title}</h1>
      <p className="text-muted mt-3 text-lg leading-relaxed">{c.intro}</p>
      <p className="mt-4 text-sm text-muted">
        {dict.privacy.updated} <time dateTime={UPDATED}>{UPDATED}</time>
      </p>
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
