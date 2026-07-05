import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { GUIDES } from "@/lib/guides";
import { LOCALES } from "@/lib/i18n";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/methodology",
    "/about",
    "/guides",
    ...GUIDES.map((g) => `/guides/${g.slug}`),
  ];
  return LOCALES.flatMap((locale) =>
    paths.map((p) => ({
      url: `${SITE_URL}/${locale}${p}`,
      changeFrequency: "monthly" as const,
      priority: p === "" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((l) => [l, `${SITE_URL}/${l}${p}`])
        ),
      },
    }))
  );
}
