import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The sitemap was a chunked index before 21 Sep 2026; search engines still request the old files.
      { source: "/sitemap-index.xml", destination: "/sitemap.xml", statusCode: 301 },
      { source: "/sitemap/:id(\d+).xml", destination: "/sitemap.xml", statusCode: 301 },
    ];
  },
};

export default nextConfig;
