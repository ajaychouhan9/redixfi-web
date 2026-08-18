import Link from "next/link";
import { LineChart, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { MarketActivityCategorySummary, MarketActivitySummary } from "@/lib/api/types";
import { formatDateIst } from "@/lib/format";

/**
 * Market Activity hub (2026-08-15) — Home's compact rollup card. ONE
 * block, ONE "View all →" link (locked spec: no individual per-category
 * links from Home). Real counts from GET /market-activity/summary, same
 * "identical for every tier" posture as the underlying 4 data types on
 * ResearchDetail — this card renders the same for every visitor.
 *
 * BUG 11 (2026-08-18, per-category rows): the backend has reported each
 * category's OWN latest date + count independently since the 2026-08-17
 * fix (routers/market_activity.py::market_activity_summary()), but this
 * card was still collapsing all 4 into one combined sentence with a
 * single "Last updated" line — which is misleading whenever the 4
 * categories have different freshness (e.g. insider trades updated
 * today, corporate events 3 days ago, concalls a week ago all showing
 * one shared "Last updated" date implies a single-day snapshot that
 * never actually happened). Each category now gets its own row with its
 * own count and its own date, so freshness is never misrepresented for
 * a category that's actually staler (or fresher) than the others.
 */
const CATEGORIES: Array<{
  key: keyof Pick<MarketActivitySummary, "insider_trades" | "concalls" | "corporate_events" | "bulk_block_deals">;
  label: string;
  unit: (n: number) => string;
}> = [
  { key: "insider_trades", label: "Insider Trading", unit: (n) => `trade${n === 1 ? "" : "s"}` },
  { key: "concalls", label: "Concalls", unit: (n) => `call${n === 1 ? "" : "s"}` },
  { key: "corporate_events", label: "Corporate Events", unit: (n) => `event${n === 1 ? "" : "s"}` },
  { key: "bulk_block_deals", label: "Bulk/Block Deals", unit: (n) => `deal${n === 1 ? "" : "s"}` },
];

function CategoryRow({
  label,
  category,
  unit,
}: {
  label: string;
  category: MarketActivityCategorySummary;
  unit: (n: number) => string;
}) {
  const hasActivity = category.count > 0 && !!category.date;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-foreground">{label}</span>
      {hasActivity ? (
        <span className="text-right text-xs text-foreground-faint">
          {category.count} {unit(category.count)} · Updated {formatDateIst(category.date as string)}
        </span>
      ) : (
        <span className="text-right text-xs text-foreground-faint">No recent activity</span>
      )}
    </div>
  );
}

export function MarketActivityCard({ summary }: { summary: MarketActivitySummary | null }) {
  const allEmpty =
    !summary ||
    (summary.insider_trades.count === 0 &&
      summary.bulk_block_deals.count === 0 &&
      summary.concalls.count === 0 &&
      summary.corporate_events.count === 0);

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
      ) : allEmpty ? (
        <p className="text-sm text-foreground-muted">No insider trades, bulk/block deals, concalls, or corporate events recorded yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {CATEGORIES.map(({ key, label, unit }) => (
            <CategoryRow key={key} label={label} category={summary[key]} unit={unit} />
          ))}
        </div>
      )}
      <Link href="/market-activity" className="mt-3 flex items-center gap-0.5 text-xs font-medium text-accent">
        View all <ArrowRight size={12} />
      </Link>
    </Card>
  );
}
