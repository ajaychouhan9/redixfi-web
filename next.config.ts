import type { NextConfig } from "next";
import { renamedSymbolRedirects } from "./src/lib/seo/renamed-symbols";

const nextConfig: NextConfig = {
  env: { NAV_MOBILE_LAYOUT: process.env.NAV_MOBILE_LAYOUT ?? "C" },
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
      // History Explorer became Market Rewind (31 Oct 2026): the old address and every variant go to the new one, permanently, in one hop.
      { source: "/history", destination: "/rewind", statusCode: 301 },
      { source: "/history/:path*", destination: "/rewind", statusCode: 301 },
      // "/about" is a guessable address; the page is About & Contact.
      { source: "/about", destination: "/more/about-us", statusCode: 301 },
      // 11 Nov 2026: the Stock Condition and everything built on it were removed. The pages go to their nearest remaining page, permanently.
      { source: "/signals/movers", destination: "/signals", statusCode: 301 },
      { source: "/track-record", destination: "/signals", statusCode: 301 },
      { source: "/track-record/:symbol", destination: "/stocks/:symbol", statusCode: 301 },
      // The screens built on the Stock Condition change were removed; their pages go to the screens index.
      { source: "/screens/signal-score-:rest*", destination: "/screens", statusCode: 301 },
      // A company that changed its name got a new NSE symbol: old links go to the new one.
      ...renamedSymbolRedirects(),
    ];
  },
};

export default nextConfig;
