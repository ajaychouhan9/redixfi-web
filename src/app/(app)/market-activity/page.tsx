import type { Metadata } from "next";
import { MarketActivityHub } from "@/components/app/market-activity/MarketActivityHub";
import { getMarketActivitySummary } from "@/lib/api/endpoints";
import { formatDateIst } from "@/lib/format";

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

export default async function MarketActivityPage() {
  // The interactive table still uses the visitor's token. This public rollup
  // is identical for every tier and gives crawlers useful initial HTML.
  const summary = await getMarketActivitySummary({ revalidate: 300 })
    .then((response) => response.data)
    .catch(() => null);
  const categories = summary && [
    ["Concalls", summary.concalls],
    ["Insider trades", summary.insider_trades],
    ["Corporate events", summary.corporate_events],
    ["Bulk/block deals", summary.bulk_block_deals],
    ["Red flags", summary.red_flags],
  ] as const;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Market Activity</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Concalls, insider trades, corporate events, and bulk/block deals across every tracked stock.
        </p>
      </div>
      {categories && (
        <section aria-label="Latest recorded market activity" className="rounded-xl border border-border p-4">
          <h2 className="mb-2 text-sm font-semibold">Latest recorded activity</h2>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {categories.map(([label, category]) => (
              <li key={label}>
                <span className="font-medium">{label}:</span>{" "}
                {category?.date && category.count > 0
                  ? `${category.count} on ${formatDateIst(category.date)}`
                  : "No recent activity"}
              </li>
            ))}
          </ul>
        </section>
      )}
      <MarketActivityHub />
    </div>
  );
}
