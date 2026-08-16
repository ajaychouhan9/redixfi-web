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
 * BUG 3 fix (2026-08-16): these 4 data types are NOT daily events.
 * `summary.date` is now the most recent date with ANY activity across
 * all 4 collections (routers/market_activity.py::
 * _most_recent_activity_date()), not necessarily today — the API no
 * longer hard-requires same-day activity. This card must never imply
 * same-day-only data, so it always shows an explicit "as of [date]"
 * label rather than the word "today", and — critically — a genuinely
 * empty response now only means the underlying collections are
 * completely empty (not "nothing happened today"), so the empty-state
 * copy is worded accordingly.
 */
export function MarketActivityCard({ summary }: { summary: MarketActivitySummary | null }) {
  const parts: string[] = [];
  if (summary) {
    if (summary.insider_trades_today > 0) parts.push(`${summary.insider_trades_today} insider trade${summary.insider_trades_today === 1 ? "" : "s"}`);
    if (summary.bulk_block_deals_today > 0) parts.push(`${summary.bulk_block_deals_today} bulk/block deal${summary.bulk_block_deals_today === 1 ? "" : "s"}`);
    if (summary.concalls_today > 0) parts.push(`${summary.concalls_today} concall${summary.concalls_today === 1 ? "" : "s"}`);
    if (summary.corporate_events_today > 0) parts.push(`${summary.corporate_events_today} corporate event${summary.corporate_events_today === 1 ? "" : "s"}`);
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
          <p className="mt-1 text-xs text-foreground-faint">Last updated: {formatDateIst(summary.date)}</p>
        </>
      )}
      <Link href="/market-activity" className="mt-3 flex items-center gap-0.5 text-xs font-medium text-accent">
        View all <ArrowRight size={12} />
      </Link>
    </Card>
  );
}
