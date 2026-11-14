import type { MetadataRoute } from "next";

const SITE_URL = "https://www.redixfi.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // /api/og serves share images; social crawlers that respect robots.txt need it.
        // The more specific allow wins over the /api/* disallow.
        // /signals/7-day-review is a public indexed page and must stay open under the /signals/ rule below.
        allow: ["/", "/api/og", "/signals/7-day-review"],
        disallow: [
          "/api/*",
          // sign-in and the signed-in account area (they carry noindex as well)
          "/login",
          "/account",
          "/admin",
          // per-stock working pages: noindex duplicates of /stocks/<symbol>, kept away from crawlers to save server work (14 Nov 2026)
          "/signals/",
          "/research/",
          // search-result addresses: a query string is never a page of its own
          "/*?q=",
          "/*&q=",
          "/*?search=",
          "/*&search=",
        ],
        // Honoured by Bing and most other bots; Google ignores it. Harmless for indexing speed at this site size.
        crawlDelay: 5,
      },
      // AI training / answer crawlers: not allowed to crawl (14 Nov 2026). Googlebot and Bingbot are not listed, so they follow the rule above.
      {
        userAgent: ["GPTBot", "CCBot", "ClaudeBot", "Bytespider", "PerplexityBot", "Amazonbot", "Meta-ExternalAgent"],
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
