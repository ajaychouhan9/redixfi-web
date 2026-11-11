import type { MetadataRoute } from "next";

const SITE_URL = "https://www.redixfi.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // /api/og serves share images; social crawlers that respect robots.txt need it.
      // The more specific allow wins over the /api/* disallow.
      allow: ["/", "/api/og"],
      disallow: [
        "/api/*",
        // sign-in and the signed-in account area (they carry noindex as well)
        "/login",
        "/account",
        "/admin",
        // search-result addresses: a query string is never a page of its own
        "/*?q=",
        "/*&q=",
        "/*?search=",
        "/*&search=",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
