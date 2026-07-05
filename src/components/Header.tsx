import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { otherLocale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { LocaleSwitch } from "./LocaleSwitch";

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <header className="no-print border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link
          href={`/${locale}`}
          className="font-bold text-lg tracking-tight text-foreground hover:text-accent transition-colors"
        >
          Czech Th<span className="text-accent">!</span>s{" "}
          <span className="font-normal text-muted">Report</span>
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm ml-auto">
          <Link className="text-muted hover:text-foreground transition-colors py-1" href={`/${locale}`}>
            {dict.nav.home}
          </Link>
          <Link className="text-muted hover:text-foreground transition-colors py-1" href={`/${locale}/methodology`}>
            {dict.nav.methodology}
          </Link>
          <Link className="text-muted hover:text-foreground transition-colors py-1" href={`/${locale}/guides`}>
            {dict.nav.guides}
          </Link>
          <Link className="text-muted hover:text-foreground transition-colors py-1" href={`/${locale}/about`}>
            {dict.nav.about}
          </Link>
          <LocaleSwitch
            current={locale}
            other={otherLocale(locale)}
            label={dict.nav.switchLocale}
            shortLabel={dict.nav.switchLocaleShort}
          />
        </nav>
      </div>
    </header>
  );
}
