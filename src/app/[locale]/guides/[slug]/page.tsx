import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, LOCALES } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { getGuide, GUIDES } from "@/lib/guides";
import { SITE_URL } from "@/lib/site";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => GUIDES.map((g) => ({ locale, slug: g.slug })));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) return {};
  const guide = getGuide(slug);
  if (!guide) return {};
  const c = guide[locale];
  return {
    title: c.title,
    description: c.description,
    alternates: {
      canonical: `/${locale}/guides/${slug}`,
      languages: { en: `/en/guides/${slug}`, cs: `/cs/guides/${slug}` },
    },
  };
}

export default async function GuidePage(props: Props) {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) notFound();
  const guide = getGuide(slug);
  if (!guide) notFound();
  const dict = getDict(locale);
  const c = guide[locale];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.title,
    description: c.description,
    inLanguage: locale,
    author: { "@type": "Person", name: "Ondřej Huk", url: "https://czech-this.com" },
    url: `${SITE_URL}/${locale}/guides/${slug}`,
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{c.title}</h1>
      <p className="text-muted mt-3 text-lg leading-relaxed">{c.description}</p>
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
      <div className="mt-12 rounded-xl border border-accent/40 bg-surface p-6 text-center">
        <p className="mb-4 font-medium">{dict.home.heroSubtitle}</p>
        <Link
          href={`/${locale}`}
          className="inline-block rounded-lg bg-accent text-accent-contrast font-semibold px-6 py-3 hover:bg-accent-strong transition-colors"
        >
          {dict.home.submit}
        </Link>
      </div>
    </article>
  );
}
