import type { Metadata } from "next";
import { WatchlistMainView } from "@/components/app/watchlist/WatchlistMainView";

export const metadata: Metadata = {
  title: "Your Watchlist",
  alternates: { canonical: "/watchlist" },
  // A personal page: the HTML is an anonymous shell, so it is kept out of search results.
  robots: { index: false, follow: true },
  description: "The stocks RedixFi watches for you — behavior states, portfolio analytics and your personalized brief, built from your watchlist.",
};

export default function WatchlistPage() {
  return <WatchlistMainView />;
}
