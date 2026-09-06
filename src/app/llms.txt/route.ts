import { GUIDES } from "@/lib/guides";
import { getDict } from "@/lib/i18n/dictionaries";
import { SITE_URL } from "@/lib/site";

// Experimental, optional convention — generated from the same dictionary the
// pages render, so it can't drift out of date.
export const dynamic = "force-static";

export function GET(): Response {
  const en = getDict("en");
  const body = [
    `# ${en.siteName}`,
    ``,
    `> ${en.home.metaDescription}`,
    ``,
    en.home.pillarsTitle + ":",
    ...(["ai", "seo", "a11y"] as const).map(
      (k) => `- ${en.home.pillars[k].title}: ${en.home.pillars[k].text}`
    ),
    ``,
    `## Pages`,
    `- [New audit](${SITE_URL}/en): ${en.home.heroSubtitle}`,
    `- [${en.nav.methodology}](${SITE_URL}/en/methodology): how every check is measured and scored.`,
    `- [${en.nav.about}](${SITE_URL}/en/about): who builds this and how to get in touch.`,
    ``,
    `## Guides`,
    ...GUIDES.map((g) => `- [${g.en.title}](${SITE_URL}/en/guides/${g.slug}): ${g.en.description}`),
    ``,
    `## Notes`,
    `- Czech translations of every page live under /cs instead of /en.`,
    `- Individual audit reports (/en/report/…, /cs/report/…) are private by link and excluded in robots.txt.`,
    ``,
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
