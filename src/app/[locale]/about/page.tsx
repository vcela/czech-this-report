import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { ContactForm } from "@/components/report/ContactForm";
import { CREATOR, STRIPE_DONATE_URL } from "@/lib/site";

interface Props {
  params: Promise<{ locale: string }>;
}

const copy: Record<Locale, { paragraphs: string[] }> = {
  en: {
    paragraphs: [
      "Czech Th!s Report is a free audit tool built by Ondřej Huk of Czech Th!s, a web studio based in the Czech Republic. It checks any website across three areas that decide whether people find you and whether they can actually use what they find: visibility in AI assistants, classic SEO, and accessibility.",
      "The tool exists because most audit reports fail their readers twice — they drown non-technical owners in jargon, and they mix real measurements with guesses without saying which is which. This one is built on two rules: every finding must be understandable by a non-technical reader in one paragraph, and every number must honestly say whether it was measured or estimated.",
      "The audit is free with no sign-up, and it stays that way. If you want the findings fixed rather than just listed — or a deeper audit including live AI prompt testing and a full manual accessibility review — that's the paid work that funds this tool. Use the form below.",
    ],
  },
  cs: {
    paragraphs: [
      "Czech Th!s Report je bezplatný auditní nástroj, který vytvořil Ondřej Huk ze studia Czech Th!s. Prověří libovolný web ve třech oblastech, které rozhodují o tom, jestli vás lidé najdou a jestli to, co najdou, dokážou opravdu použít: viditelnost v AI asistentech, klasické SEO a přístupnost.",
      "Nástroj vznikl proto, že většina auditních reportů zklame své čtenáře hned dvakrát — netechnické majitele utopí v žargonu a míchá skutečná měření s odhady, aniž by řekla, co je co. Tenhle stojí na dvou pravidlech: každý nález musí netechnický čtenář pochopit z jednoho odstavce a každé číslo musí poctivě přiznat, jestli bylo změřeno, nebo odhadnuto.",
      "Audit je zdarma bez registrace a tak to zůstane. Pokud chcete nálezy nejen vypsat, ale i opravit — nebo hlubší audit včetně živého testování AI dotazů a úplné ruční kontroly přístupnosti — to je placená práce, která tento nástroj financuje. Použijte formulář níže.",
    ],
  },
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isLocale(locale)) return {};
  const dict = getDict(locale);
  return {
    title: dict.about.title,
    description: copy[locale].paragraphs[0],
    alternates: {
      canonical: `/${locale}/about`,
      languages: { en: "/en/about", cs: "/cs/about" },
    },
  };
}

export default async function AboutPage(props: Props) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const dict = getDict(locale);
  const c = copy[locale];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-10">
      <article>
        <h1 className="text-3xl sm:text-4xl font-bold">{dict.about.title}</h1>
        <div className="mt-5 space-y-4">
          {c.paragraphs.map((par, i) => (
            <p key={i} className="text-muted leading-relaxed">
              {par}
            </p>
          ))}
        </div>
        <p className="mt-6">
          <a href={CREATOR.url} rel="noopener" className="text-accent hover:underline font-medium">
            czech-this.com →
          </a>
        </p>
      </article>

      {STRIPE_DONATE_URL && (
        <section className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-xl font-bold mb-2">{dict.donate.title}</h2>
          <p className="text-sm text-muted leading-relaxed mb-4">{dict.donate.text}</p>
          <a
            href={STRIPE_DONATE_URL}
            rel="noopener"
            className="inline-block rounded-lg bg-accent text-accent-contrast font-semibold px-6 py-2.5 hover:bg-accent-strong transition-colors"
          >
            {dict.donate.button} ♥
          </a>
        </section>
      )}

      <ContactForm labels={dict.report.hire} contactEmail={CREATOR.email} />
    </div>
  );
}
