import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { VolatilityBoard } from "@/components/app/volatility/VolatilityBoard";
import { getVolatilityBoard } from "@/lib/api/endpoints";
import { formatShortDate } from "@/lib/format";
import type { VolatilityBoard as Board } from "@/lib/api/types";

// Rendered on request: the page depends on a live upstream, and a failed request during a build must never
// fail the deploy (same approach as the Track Record page). The data changes once per trading day.
export const dynamic = "force-dynamic";

const TITLE = "Volatility ranking — past price movement of NSE stocks";
const DESCRIPTION =
  "Which NSE stocks have moved the most and the least from day to day over the last 21 sessions, measured on split-adjusted prices. Past price movement, not a forecast.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/volatility" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website" },
};

async function load(which: "top" | "bottom"): Promise<Board | null> {
  try {
    // @auth-ok: public first-20 view; signed-in callers reload their own range in the browser.
    return (await getVolatilityBoard({ which, page: 1, size: 20 }, { revalidate: 900 })).data;
  } catch {
    return null;
  }
}

export default async function VolatilityPage() {
  const [top, bottom] = await Promise.all([load("top"), load("bottom")]);
  const asOf = top?.as_of ?? bottom?.as_of ?? null;
  const rankedOf = top?.ranked_of ?? bottom?.ranked_of ?? null;
  const disclaimer = top?.disclaimer ?? "Past price movement, not a forecast. Measured market data, not investment advice.";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Volatility ranking</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          How much each stock&apos;s price has moved from one day to the next over the last 21 trading sessions.
          {rankedOf ? ` ${rankedOf.toLocaleString("en-IN")} stocks are ranked.` : ""} Rank 1 is the most volatile.
        </p>
        {asOf && <p className="mt-1 text-[11px] text-foreground-faint">Data as of {formatShortDate(asOf)}</p>}
        <p className="mt-1 text-[11px] text-foreground-faint">{disclaimer}</p>
      </header>

      <VolatilityBoard initialTop={top} initialBottom={bottom} />

      <div id="how" className="scroll-mt-20">
        <Card title="How volatility is measured">
          <div className="space-y-2 text-sm text-foreground-muted">
            <p>
              Each day&apos;s move is the change in the closing price from the previous trading day. Prices are adjusted for
              splits, bonus issues and consolidations, so a corporate action is never counted as a price move.
            </p>
            <p>
              The ranking uses the standard deviation of the last 21 daily moves. The larger it is, the more the price has
              swung from day to day. Rank 1 is the most volatile of the ranked stocks, and the plain-words band
              (for example &ldquo;Among the most volatile 10% of stocks&rdquo;) shows where a stock sits in that ranking.
            </p>
            <p>
              Each stock&apos;s page also shows how many of the last 5, 15 and 21 sessions closed down and up, the average
              and largest daily moves, and the average daily high-to-low range as a share of the close.
            </p>
            <p>
              Average daily range: the average gap between a day&apos;s high and low, which shows movement inside the day.
            </p>
            <p className="font-medium text-foreground">Stocks that are not ranked</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Stocks on hold while a corporate action, demerger or review is checked, because earlier prices are not comparable.</li>
              <li>Stocks with limited price data, fewer than 21 stored sessions, or a missing session in the window.</li>
              <li>Stocks that trade in the BE or BZ (trade-for-trade) series, where a daily price band limits how far the price can move.</li>
              <li>Stocks with a very large one-day price step that has not been explained.</li>
            </ul>
            <p className="text-xs text-foreground-faint">
              Measured once per trading day after the score run. {disclaimer}{" "}
              <Link href="/how-it-works" className="text-accent underline decoration-dotted underline-offset-2">
                How the composite score works
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
