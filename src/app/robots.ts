import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // reports are private-by-link; the account area is behind a login
        disallow: [
          "/en/report/", "/cs/report/", "/api/",
          "/en/dashboard", "/cs/dashboard", "/en/login", "/cs/login",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
