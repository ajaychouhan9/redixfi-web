import type { MetadataRoute } from "next";

const SITE_URL = "https://www.redixfi.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/account/*", "/api/*"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
