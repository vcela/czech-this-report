import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { CREATOR, STRIPE_DONATE_URL } from "@/lib/site";

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="no-print border-t border-border mt-16">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row gap-6 sm:items-center justify-between text-sm text-muted">
        <div className="space-y-1">
          <p>
            {dict.footer.made}{" "}
            <span className="text-foreground font-medium">{CREATOR.name}</span>{" "}
            {dict.footer.at}{" "}
            <a
              href={CREATOR.url}
              rel="noopener"
              className="text-accent hover:underline font-medium"
            >
              {CREATOR.studio}
            </a>
          </p>
          <p>{dict.footer.freeNote}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/${locale}/methodology`} className="hover:text-foreground transition-colors">
            {dict.nav.methodology}
          </Link>
          <Link href={`/${locale}/about`} className="hover:text-foreground transition-colors">
            {dict.nav.about}
          </Link>
          {STRIPE_DONATE_URL && (
            <a
              href={STRIPE_DONATE_URL}
              rel="noopener"
              className="border border-accent text-accent rounded-md px-3 py-1.5 hover:bg-accent hover:text-accent-contrast transition-colors font-medium"
            >
              {dict.donate.button} ♥
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
