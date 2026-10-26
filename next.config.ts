import type { NextConfig } from "next";
import { renamedSymbolRedirects } from "./src/lib/seo/renamed-symbols";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // The service worker file must always be re-checked so a new deploy's worker (and its cache version) replaces the old.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
      { source: "/manifest.webmanifest", headers: [{ key: "Cache-Control", value: "public, max-age=3600" }] },
    ];
  },
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
