import type { Metadata } from "next";
import { WatchlistMainView } from "@/components/app/watchlist/WatchlistMainView";

export const metadata: Metadata = {
  title: "Your Watchlist",
  description: "The stocks RedixFi watches for you — behavior states, portfolio analytics and your personalized brief, built from your watchlist.",
};

export default function WatchlistPage() {
  return <WatchlistMainView />;
}
