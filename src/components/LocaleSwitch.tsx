"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export function LocaleSwitch({
  current,
  other,
  label,
  shortLabel,
}: {
  current: Locale;
  other: Locale;
  label: string;
  shortLabel: string;
}) {
  const pathname = usePathname() ?? `/${current}`;
  const target = pathname.replace(new RegExp(`^/${current}(?=/|$)`), `/${other}`);
  return (
    <Link
      href={target}
      aria-label={label}
      lang={other}
      className="border border-border rounded-md px-2.5 py-1 text-muted hover:text-foreground hover:border-accent transition-colors"
    >
      {shortLabel}
    </Link>
  );
}
