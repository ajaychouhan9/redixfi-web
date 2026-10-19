import type { NextConfig } from "next";
import { renamedSymbolRedirects } from "./src/lib/seo/renamed-symbols";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The sitemap was a chunked index before 21 Sep 2026; search engines still request the old files.
      { source: "/sitemap-index.xml", destination: "/sitemap.xml", statusCode: 301 },
      { source: "/sitemap/:file(\\d+\\.xml)", destination: "/sitemap.xml", statusCode: 301 },
      // A company that changed its name got a new NSE symbol: old links go to the new one.
      ...renamedSymbolRedirects(),
    ];
  },
};

export default nextConfig;
