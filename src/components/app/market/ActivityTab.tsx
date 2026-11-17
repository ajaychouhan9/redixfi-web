"use client";

import { useEffect, useState } from "react";

import { MarketActivityCard } from "@/components/app/MarketActivityCard";
import { MarketActivityHub } from "@/components/app/market-activity/MarketActivityHub";
import { getMarketActivitySummary } from "@/lib/api/endpoints";
import type { MarketActivitySummary } from "@/lib/api/types";
import { formatDateIst } from "@/lib/format";

/** Activity: the latest recorded filings (concalls, insider trades, corporate events, bulk and block deals) with their dates, then the full tables. */
export function ActivityTab() {
  const [summary, setSummary] = useState<MarketActivitySummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    getMarketActivitySummary({ revalidate: 300 })
      .then((r) => !cancelled && setSummary(r.data))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <section className="space-y-4" aria-labelledby="activity-title" data-testid="activity-tab">
      <div>
        <h2 id="activity-title" className="text-base font-semibold">Activity</h2>
        {summary?.last_updated && <p className="mt-0.5 text-sm text-foreground-muted" data-testid="activity-asof">As of {formatDateIst(summary.last_updated)}</p>}
      </div>
      <MarketActivityCard summary={summary} hideLink />
      <MarketActivityHub />
    </section>
  );
}
