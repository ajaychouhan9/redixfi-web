import type { Metadata } from "next";

import { MarketToday } from "@/components/app/market/MarketToday";

const TITLE = "Market today: movers, market pulse and recorded activity for NSE stocks | RedixFi";
const DESCRIPTION =
  "The NSE market in one place: the largest price moves among liquid stocks (before the open, during the session or after the close), the market pulse with its date, and the latest concalls, insider trades, corporate events and bulk or block deals. Prices are delayed or as of the last update. Not a forecast or a recommendation.";

// The page makes no request of its own; a refresh window keeps the cached copy from outliving a deploy (a fully static page is sent with a one-year cache lifetime).
export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/market" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", url: "https://www.redixfi.com/market" },
};

/** Static shell: every number on this page is fetched in the browser, so the page is cached and costs the server nothing per visit. */
export default function MarketPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <h1 className="text-xl font-semibold">Market today</h1>
      <p className="text-sm text-foreground-muted">Movers, the market pulse and the latest filings. Each tab shows the date of its figures.</p>
      <MarketToday />
    </div>
  );
}
