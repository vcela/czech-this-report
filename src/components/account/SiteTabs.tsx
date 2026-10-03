"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteTabs({ base, tabs }: { base: string; tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Site sections" className="flex gap-1 border-b border-border mb-8 overflow-x-auto overflow-y-hidden">
      {tabs.map((t) => {
        const href = base + t.href;
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`px-4 py-2.5 -mb-px border-b-2 whitespace-nowrap transition-colors ${
              active ? "border-accent text-foreground font-semibold" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
