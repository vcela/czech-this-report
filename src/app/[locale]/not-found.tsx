import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-4xl font-bold mb-3">404</h1>
      <p className="text-muted mb-2">Page not found.</p>
      <p className="text-muted mb-6" lang="cs">
        Stránka nenalezena.
      </p>
      <Link
        href="/en"
        className="inline-block rounded-lg bg-accent text-accent-contrast font-semibold px-6 py-3 hover:bg-accent-strong transition-colors"
      >
        Czech Th!s Report →
      </Link>
    </div>
  );
}
