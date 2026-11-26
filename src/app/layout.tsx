import { SiteInsights } from "@/components/app/SiteInsights";
import { TableStacker } from "@/components/layout/TableStacker";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ConsentGate } from "@/components/app/ConsentGate";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { AskPanelProvider } from "@/lib/ask-panel/AskPanelContext";
import { PwaProvider } from "@/components/app/pwa/PwaProvider";

// One font family (26 Nov 2026 readability overhaul): Inter, three weights only (400, 500, 700). Figures use the same face with tabular numerals
// (see globals.css), so columns of numbers still line up. Replaces IBM Plex Sans, IBM Plex Mono and Georgia.
// 26 Nov 2026: Inter is kept in the repository (the Latin subset of the variable font, 48 KB, weights 400 to 700) instead of being fetched from Google Fonts at every
// build. A change in what Google sends broke the build that day; now a build needs no outside address. It is served from our own address and preloaded.
const inter = localFont({
  src: "./fonts/Inter-latin-var.woff2",
  variable: "--font-inter",
  weight: "400 700",
  display: "swap",
  preload: true,
});

// Applied before hydration so the stored choice (or, with nothing saved, Light) is on <html> before the first paint. The html tag also carries
// data-theme="light" from the server, so even without JavaScript the default is Light and never the plain CSS fallback.
const NO_FLASH_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("redixfi:theme");if(t!=="dark"&&t!=="light"&&t!=="slate"){t="light";}document.documentElement.dataset.theme=t;}catch(e){}})();`;

// Production serves the www host; the apex permanently redirects to it.
// Keep metadata on the same host as robots.txt and sitemap.xml.
const SITE_URL = "https://www.redixfi.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RedixFi: understand any NSE stock in 5 minutes",
    template: "%s · RedixFi",
  },
  description:
    "Plain-language data for 2,000+ NSE stocks: delivery, insider trades, points to watch and concall summaries. No buy or sell advice.",
  openGraph: {
    type: "website",
    siteName: "RedixFi",
    // The full wordmark lockup (provided artwork, not code-generated) —
    // its dark background is baked in, which is fine here since a social
    // preview card is never subject to the site's light/dark toggle.
    images: [{ url: "/branding/redixfi-og-1200x630.png", width: 1200, height: 630, alt: "RedixFi: Market. Simplified." }],
  },
  twitter: {
    card: "summary_large_image",
  },
  // "Add to Home Screen" (the manifest itself is app/manifest.ts)
  applicationName: "RedixFi",
  appleWebApp: { capable: true, title: "RedixFi", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

// Android Chrome: the on-screen keyboard resizes the layout viewport, so
// bottom-pinned inputs (the RedixFi AI sheet) stay above it. iOS ignores this
// and is handled by the sheet itself (useMobileViewport).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
};

// Visitor analytics (16 Nov 2026): Cloudflare Web Analytics, a cookieless page-view beacon. It is loaded only when the owner
// has put the site token in NEXT_PUBLIC_CF_BEACON_TOKEN; with no token nothing is loaded and nothing else changes. The Vercel
// Analytics component that used to be here was removed the same day: since the move to the VM its script URL
// (/_vercel/insights/script.js) answered 404 on every page view.
const CF_BEACON_TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN?.trim() ?? "";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
        <ThemeProvider>
          <AuthProvider>
            <AskPanelProvider>
              <PwaProvider>{children}</PwaProvider>
              <TableStacker />
              <ConsentGate />
              <SiteInsights />
            </AskPanelProvider>
          </AuthProvider>
        </ThemeProvider>
        {CF_BEACON_TOKEN && (
          // lazyOnload: fetched after the page is interactive (browser idle), so it never competes with the page's own scripts.
          <Script src="https://static.cloudflareinsights.com/beacon.min.js" strategy="lazyOnload" data-cf-beacon={JSON.stringify({ token: CF_BEACON_TOKEN })} />
        )}
      </body>
    </html>
  );
}
