import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/dictionaries";
import { requireUser } from "@/lib/auth";
import { getSite } from "@/lib/sites";
import { SiteTabs } from "@/components/account/SiteTabs";

/** Shared header and tabs. Each page still does its own auth check (layouts don't re-render on navigation). */
export default async function SiteLayout(props: {
  params: Promise<{ locale: string; siteId: string }>;
  children: React.ReactNode;
}) {
  const { locale, siteId } = await props.params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale);
  const site = getSite(user.id, siteId);
  if (!site) notFound();
  const t = getDict(locale).account;
  const base = `/${locale}/dashboard/${site.id}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Link href={`/${locale}/dashboard`} className="text-sm text-muted hover:text-foreground">
        ← {t.back}
      </Link>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-3 mb-6">
        <h1 className="text-3xl font-bold break-all">{site.host}</h1>
        <p className={`text-sm ${site.verified_at ? "text-score-green" : "text-score-orange"}`}>
          {site.verified_at ? t.verified : t.notVerified}
        </p>
      </div>
      <SiteTabs
        base={base}
        tabs={[
          { href: "", label: t.tabs.traffic },
          { href: "/search", label: t.tabs.search },
          { href: "/ai", label: t.tabs.ai },
          { href: "/audit", label: t.tabs.health },
          { href: "/setup", label: t.tabs.setup },
        ]}
      />
      {props.children}
    </div>
  );
}
