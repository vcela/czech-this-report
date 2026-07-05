import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { GUIDES } from "@/lib/guides";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isLocale(locale)) return {};
  const dict = getDict(locale);
  return {
    title: dict.nav.guides,
    description: GUIDES.map((g) => g[locale].title).join(" · "),
    alternates: {
      canonical: `/${locale}/guides`,
      languages: { en: "/en/guides", cs: "/cs/guides" },
    },
  };
}

export default async function GuidesPage(props: Props) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const dict = getDict(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8">{dict.nav.guides}</h1>
      <div className="space-y-4">
        {GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/${locale}/guides/${g.slug}`}
            className="block rounded-xl border border-border bg-surface p-6 hover:border-accent/60 transition-colors"
          >
            <h2 className="font-semibold text-lg text-accent mb-1.5">{g[locale].title}</h2>
            <p className="text-sm text-muted leading-relaxed">{g[locale].description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
