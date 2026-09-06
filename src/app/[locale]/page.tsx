import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { AuditForm } from "@/components/AuditForm";
import { SITE_URL, CREATOR } from "@/lib/site";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isLocale(locale)) return {};
  const dict = getDict(locale);
  return {
    title: `${dict.tagline} — ${dict.siteName}`,
    description: dict.home.metaDescription,
    alternates: { canonical: `/${locale}`, languages: { en: "/en", cs: "/cs" } },
  };
}

export default async function HomePage(props: Props) {
  const { locale: rawLocale } = await props.params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const dict = getDict(locale);
  const t = dict.home;

  // ponytail: no logo/sameAs — there is no logo file in the repo and no
  // confirmed social profiles, and a schema block is worth exactly as much as
  // the facts in it. Add both here once they exist.
  const orgId = `${CREATOR.url}#organization`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: CREATOR.studio,
        url: CREATOR.url,
        email: CREATOR.email,
        founder: { "@type": "Person", name: CREATOR.name, url: CREATOR.url },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: CREATOR.email,
          availableLanguage: ["cs", "en"],
        },
      },
      {
        "@type": "WebApplication",
        name: dict.siteName,
        url: `${SITE_URL}/${locale}`,
        applicationCategory: "SEO and accessibility audit",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: t.heroSubtitle,
        publisher: { "@id": orgId },
        creator: {
          "@type": "Person",
          name: CREATOR.name,
          url: CREATOR.url,
          worksFor: { "@id": orgId },
        },
      },
    ],
  };

  const pillarKeys = ["ai", "seo", "a11y"] as const;

  return (
    <div className="mx-auto max-w-6xl px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="py-16 sm:py-24 flex flex-col items-center text-center">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight max-w-3xl leading-tight">
          {t.heroTitle}
        </h1>
        <p className="mt-5 text-muted max-w-2xl text-base sm:text-lg">{t.heroSubtitle}</p>
        <div className="mt-8 w-full flex justify-center">
          <AuditForm
            locale={locale}
            labels={{
              urlLabel: t.urlLabel,
              urlPlaceholder: t.urlPlaceholder,
              submit: t.submit,
              submitting: t.submitting,
              progress: t.progress,
              errors: {
                invalid: t.errorInvalid,
                unreachable: t.errorUnreachable,
                siteError: t.errorSiteError,
                rateLimit: t.errorRateLimit,
                generic: t.errorGeneric,
              },
            }}
          />
        </div>
        <p className="mt-4 text-sm text-muted">{t.free}</p>
      </section>

      {/* Pillars */}
      <section aria-labelledby="pillars-heading" className="py-8">
        <h2 id="pillars-heading" className="text-2xl font-bold mb-6">
          {t.pillarsTitle}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {pillarKeys.map((k) => (
            <div
              key={k}
              className="rounded-xl border border-border bg-surface p-6 hover:border-accent/60 transition-colors"
            >
              <h3 className="font-semibold text-lg mb-2 text-accent">{t.pillars[k].title}</h3>
              <p className="text-sm text-muted leading-relaxed">{t.pillars[k].text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-heading" className="py-12">
        <h2 id="how-heading" className="text-2xl font-bold mb-6">
          {t.howTitle}
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {t.how.map((step, i) => (
            <li key={i} className="rounded-xl border border-border bg-surface p-6 relative">
              <span
                aria-hidden="true"
                className="absolute -top-3 left-6 bg-accent text-accent-contrast font-bold rounded-full h-7 w-7 flex items-center justify-center text-sm"
              >
                {i + 1}
              </span>
              <h3 className="font-semibold mt-2 mb-2">{step.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
