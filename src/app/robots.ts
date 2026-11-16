import type { MetadataRoute } from "next";

const SITE_URL = "https://www.redixfi.com";

// /api/og serves share images; social crawlers that respect robots.txt need it.
// The more specific allow wins over the /api/* disallow.
// /signals/7-day-review is a public indexed page and must stay open under the /signals/ rule below.
const ALLOW = ["/", "/api/og", "/signals/7-day-review"];
const DISALLOW = [
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
];
// Honoured by Bing and most other bots; Google ignores it. Harmless for indexing speed at this site size.
const CRAWL_DELAY = 5;

// AI search engines and user-initiated fetchers (16 Nov 2026): allowed, with the same rules as every other crawler.
// They fetch a page when a person asks about it or to list it in search results; they are not the training crawlers below.
const AI_SEARCH_AGENTS = ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Claude-SearchBot", "Claude-User"];
// AI training crawlers: not allowed to crawl (14 Nov 2026). Googlebot and Bingbot are not listed, so they follow the general rule.
const AI_TRAINING_AGENTS = ["GPTBot", "CCBot", "ClaudeBot", "Bytespider", "Amazonbot", "Meta-ExternalAgent"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ALLOW,
        disallow: DISALLOW,
        crawlDelay: CRAWL_DELAY,
      },
      {
        userAgent: AI_SEARCH_AGENTS,
        allow: ALLOW,
        disallow: DISALLOW,
        crawlDelay: CRAWL_DELAY,
      },
      {
        userAgent: AI_TRAINING_AGENTS,
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
