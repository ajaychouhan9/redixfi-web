import type { MetadataRoute } from "next";

// "Add to Home Screen": same website, no separate app. Colours are the site's dark theme.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RedixFi",
    short_name: "RedixFi",
    description: "Measured market signals across 2,000+ NSE stocks. Analytics, not advice.",
    start_url: "/?utm_source=pwa&utm_medium=homescreen",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0f1a",
    theme_color: "#0b0f1a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
