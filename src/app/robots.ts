import type { MetadataRoute } from "next";

const SITE_URL = "https://www.redixfi.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Account pages render only an anonymous shell and carry noindex;
      // crawlers must be able to read that directive. Authenticated data is
      // fetched with a user token after hydration.
      disallow: "/api/*",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
