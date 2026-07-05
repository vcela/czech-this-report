import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { isLocale, LOCALES, type Locale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE_URL } from "@/lib/site";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

interface Props {
  params: Promise<{ locale: string }>;
  children: React.ReactNode;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isLocale(locale)) return {};
  const dict = getDict(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${dict.siteName} — ${dict.tagline}`,
      template: `%s | ${dict.siteName}`,
    },
    description: dict.home.heroSubtitle,
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", cs: "/cs" },
    },
    openGraph: {
      siteName: dict.siteName,
      type: "website",
      locale: locale === "cs" ? "cs_CZ" : "en_US",
    },
  };
}

export default async function RootLayout(props: Props) {
  const { locale: raw } = await props.params;
  // The proxy guarantees a valid locale; fall back to English defensively
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDict(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-accent focus:text-accent-contrast focus:px-4 focus:py-2 focus:rounded-md focus:font-semibold"
        >
          {dict.nav.skipToContent}
        </a>
        <Header locale={locale} dict={dict} />
        <main id="main" className="flex-1">
          {props.children}
        </main>
        <Footer locale={locale} dict={dict} />
      </body>
    </html>
  );
}
