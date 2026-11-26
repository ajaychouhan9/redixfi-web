import { staticMeta } from "@/lib/seo/page-meta";
import type { Metadata } from "next";

import { MarketOverviewCards } from "@/components/app/market/MarketOverviewCards";
import { SHARE_IMAGE } from "@/lib/seo/share-image";

const TITLE = "Market Overview: intraday movers, market pulse, market activity and top gainers and losers | RedixFi";
const DESCRIPTION =
  "Four pages on the NSE market: the largest price moves (Intraday), the index levels and breadth (Market Pulse), the latest concalls, insider trades, corporate events and bulk or block deals (Market Activity), and the top gainers and losers. Each says when its figures are from. Not a forecast or a recommendation.";

// The page makes no request of its own; a refresh window keeps the cached copy from outliving a deploy (a fully static page is sent with a one-year cache lifetime).
export const revalidate = 300;

export const metadata: Metadata = staticMeta("/market");

/** Static shell: the four cards are fixed text; only the small date tags are read in the browser. */
export default function MarketOverviewPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <h1 className="text-[22px] font-bold leading-tight">Market Overview</h1>
      <p className="text-sm text-foreground-muted">Choose a page. Each one says when its figures are from.</p>
      <MarketOverviewCards />
      <p className="text-xs text-foreground-muted">Live prices are delayed by about 15 minutes. Past record of measured data. Not a forecast or a recommendation.</p>
    </div>
  );
}
