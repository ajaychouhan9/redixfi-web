import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { AskPanelProvider } from "@/lib/ask-panel/AskPanelContext";

// Design system (locked 2026-08 UI reframe): IBM Plex Sans for prose, IBM
// Plex Mono for every financial figure (scores, prices, deltas, %).
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Applied before hydration so a stored/system "light" preference doesn't
// flash the CSS default (dark) first — same no-flash technique the
// dark/light toggle requires whenever the choice isn't derivable from
// prefers-color-scheme alone (it's user-overridable here, so it can't be).
const NO_FLASH_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("redixfi:theme");if(t!=="dark"&&t!=="light"){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.dataset.theme=t;}catch(e){}})();`;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://redixfi.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RedixFi — The AI that reads the entire market for you",
    template: "%s · RedixFi",
  },
  description:
    "Measured signals, delivery and options data, AI-classified news and daily briefs across 750+ NSE/BSE stocks. Analytics, not advice — directional research launches after SEBI RA registration.",
  openGraph: {
    type: "website",
    siteName: "RedixFi",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
        <ThemeProvider>
          <AuthProvider>
            <AskPanelProvider>{children}</AskPanelProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
