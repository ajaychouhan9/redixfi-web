import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://redixfi.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/account/*", "/api/*"],
    },
    // /sitemap.xml is Next's own generateSitemaps() convention (chunked,
    // /sitemap/[id].xml each) but does NOT reliably serve an aggregated
    // index itself in this Next version — see sitemap-index.xml/route.ts's
    // own docstring. Point crawlers at the hand-built index instead.
    sitemap: `${SITE_URL}/sitemap-index.xml`,
  };
}
