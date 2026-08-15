import type { Metadata } from "next";
import { MarketActivityHub } from "@/components/app/market-activity/MarketActivityHub";

/**
 * Market Activity hub (2026-08-15) — cross-stock consolidation of
 * concalls, insider trades, corporate events, and bulk/block deals, all
 * of which already exist and render per-stock (unmasked, every tier) on
 * /research/{symbol}. This page aggregates that SAME data across stocks;
 * it does not fetch or invent anything new. Data fetch happens
 * client-side (MarketActivityHub) since the row cap/filters/export
 * gating depends on the caller's real auth token/tier, which a Server
 * Component here cannot read (this app's tokens live in localStorage,
 * not a cookie — same reason ResearchExportButton/SignalsExplorer are
 * client components too).
 */
export const metadata: Metadata = {
  title: "Market Activity",
  description: "Concalls, insider trades, corporate events, and bulk/block deals across every tracked stock — measured facts only, not a recommendation.",
};

export default function MarketActivityPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Market Activity</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Concalls, insider trades, corporate events, and bulk/block deals across every tracked stock.
        </p>
      </div>
      <MarketActivityHub />
    </div>
  );
}
