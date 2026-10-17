import type { MetadataRoute } from "next";

const SITE_URL = "https://www.redixfi.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // /api/og serves share images; social crawlers that respect robots.txt need it.
      // The more specific allow wins over the /api/* disallow.
      allow: ["/", "/api/og"],
      // Account pages render only an anonymous shell and carry noindex;
      // crawlers must be able to read that directive. Authenticated data is
      // fetched with a user token after hydration.
      disallow: "/api/*",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
