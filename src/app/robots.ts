import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // The authenticated application — no SEO value, requires login.
          "/dashboard",
          "/leads",
          "/projects",
          "/requirements",
          "/proposals",
          "/quotations",
          "/settings",
          "/api/",
          // Unlisted client-facing document links — private by design, never
          // meant to be crawled or cached by a search engine.
          "/p/",
          "/q/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
