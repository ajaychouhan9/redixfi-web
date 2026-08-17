import Link from "next/link";
import { LineChart, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { MarketActivitySummary } from "@/lib/api/types";
import { formatDateIst } from "@/lib/format";

/**
 * Market Activity hub (2026-08-15) — Home's compact rollup card. ONE
 * block, ONE "View all →" link (locked spec: no individual per-category
 * links from Home). Real counts from GET /market-activity/summary, same
 * "identical for every tier" posture as the underlying 4 data types on
 * ResearchDetail — this card renders the same for every visitor.
 *
 * BUG 11 fix (2026-08-17): each of the 4 categories now reports its OWN
 * latest date + count independently (routers/market_activity.py::
 * market_activity_summary()), not a count gated against a single
 * "most recent across all 4" shared date. The prior (BUG 3) design
 * zeroed out sparser categories — corporate events and bulk/block deals
 * happen far less often than insider trades, so their own latest
 * activity almost never fell on insider's latest date, and the card
 * showed e.g. "1 insider trade" with concalls/bulk-block/corporate-
 * events all silently at 0 despite real recent data existing for them.
 * This card now sums each category's own count and shows
 * `summary.last_updated` (max of the 4 per-category dates) as the
 * single "as of" label — never implying same-day-only data, and a
 * genuinely empty response still only means the underlying collections
 * are completely empty.
 */
export function MarketActivityCard({ summary }: { summary: MarketActivitySummary | null }) {
  const parts: string[] = [];
  if (summary) {
    const insiderCount = summary.insider_trades.count;
    const bulkBlockCount = summary.bulk_block_deals.count;
    const concallsCount = summary.concalls.count;
    const corporateEventsCount = summary.corporate_events.count;
    if (insiderCount > 0) parts.push(`${insiderCount} insider trade${insiderCount === 1 ? "" : "s"}`);
    if (bulkBlockCount > 0) parts.push(`${bulkBlockCount} bulk/block deal${bulkBlockCount === 1 ? "" : "s"}`);
    if (concallsCount > 0) parts.push(`${concallsCount} concall${concallsCount === 1 ? "" : "s"}`);
    if (corporateEventsCount > 0) parts.push(`${corporateEventsCount} corporate event${corporateEventsCount === 1 ? "" : "s"}`);
  }

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <LineChart size={14} className="text-accent" /> Market Activity
        </span>
      }
    >
      {!summary ? (
        <p className="text-sm text-foreground-muted">Not available right now.</p>
      ) : parts.length === 0 ? (
        <p className="text-sm text-foreground-muted">No insider trades, bulk/block deals, concalls, or corporate events recorded yet.</p>
      ) : (
        <>
          <p className="text-sm text-foreground-muted">{parts.join(" · ")}.</p>
          <p className="mt-1 text-xs text-foreground-faint">Last updated: {formatDateIst(summary.last_updated)}</p>
        </>
      )}
      <Link href="/market-activity" className="mt-3 flex items-center gap-0.5 text-xs font-medium text-accent">
        View all <ArrowRight size={12} />
      </Link>
    </Card>
  );
}
