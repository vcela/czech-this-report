import Link from "next/link";
import { monthlyAllowance, remainingCredits } from "@/lib/credits";
import { getDict } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n";
import { CoinsIcon } from "./Icons";

/** Balance chip linking to the credits page; colour follows how much is left. */
export function CreditPill({ userId, locale }: { userId: number; locale: Locale }) {
  const t = getDict(locale).account.credits;
  const left = remainingCredits(userId);
  const share = left / Math.max(1, monthlyAllowance());
  const tone = share > 0.5 ? "text-score-green border-score-green/40" : share > 0.2 ? "text-score-orange border-score-orange/40" : "text-score-red border-score-red/40";
  return (
    <Link
      href={`/${locale}/dashboard/credits`}
      title={t.pillLabel}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-surface-2 transition-colors ${tone}`}
    >
      <CoinsIcon className="h-4 w-4" />
      <span>
        {new Intl.NumberFormat(locale).format(left)} <span className="font-normal text-muted">/ {monthlyAllowance()}</span>
      </span>
      <span className="sr-only">{t.pillLabel}</span>
    </Link>
  );
}
