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

// Per-category stale-hint thresholds. Red flags now summarizes a wide
// (180-day, see build_market_activity_red_flag_summary.py::WINDOW_DAYS)
// window by design, so its own "this looks old" bar is correspondingly
// wider (90 days) than a single-day-activity category like concalls
// (14 days, unchanged -- concall data is independently known to run
// ~17-18 days stale per REDFLAG_CARD_FIX_PLAN_2026-10-05, so this is the
// one that will plausibly show the hint first, given today's data).
const DEFAULT_STALE_THRESHOLD_DAYS = 14;
const STALE_THRESHOLD_DAYS_BY_LABEL: Record<string, number> = {
  "Red flags": 90,
  Concalls: 14,
};

/** Days between an ISO "YYYY-MM-DD" (or ISO datetime) date string and now,
 * or null if the string can't be parsed. Used only to decide whether to
 * show a "data may be delayed" hint next to an already-honest date --
 * never to hide or alter the date/count themselves. */
function daysSince(dateStr: string): number | null {
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return null;
  return (Date.now() - then) / 86_400_000;
}

export default async function MarketActivityPage() {
  // The interactive table still uses the visitor's token. This public rollup
  // is identical for every tier and gives crawlers useful initial HTML.
  // timeoutMs is explicit and short (vs. the 20s shared default): after the
  // backend fix (REDFLAG_CARD_FIX_PLAN_2026-10-05 -- the red_flags block now
  // reads one precomputed Mongo document instead of streaming ~55,899 rows
  // live), a healthy response is single-digit milliseconds, so 8s is already
  // a large margin, and failing faster surfaces the fallback state below
  // sooner on a genuine outage instead of leaving the section blank for 20s.
  const summary = await getMarketActivitySummary({ revalidate: 300, timeoutMs: 8_000 })
    .then((response) => response.data)
    .catch(() => null);
  const categories = summary && [
    ["Concalls", summary.concalls],
    ["Insider trades", summary.insider_trades],
    ["Corporate events", summary.corporate_events],
    ["Bulk/block deals", summary.bulk_block_deals],
  ] as const;
  const redFlags = summary?.red_flags ?? null;
  const redFlagsStale =
    redFlags?.latest_date != null &&
    (daysSince(redFlags.latest_date) ?? 0) > STALE_THRESHOLD_DAYS_BY_LABEL["Red flags"];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Market Activity</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Concalls, insider trades, corporate events, and bulk/block deals across every tracked stock.
        </p>
      </div>
      {categories ? (
        <section aria-label="Latest recorded market activity" className="rounded-xl border border-border p-4">
          <h2 className="mb-2 text-sm font-semibold">Latest recorded activity</h2>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {categories.map(([label, category]) => {
              const threshold = STALE_THRESHOLD_DAYS_BY_LABEL[label] ?? DEFAULT_STALE_THRESHOLD_DAYS;
              const age = category?.date ? daysSince(category.date) : null;
              const isStale = age !== null && age > threshold;
              return (
                <li key={label}>
                  <span className="font-medium">{label}:</span>{" "}
                  {category?.date && category.count > 0 ? (
                    <>
                      {category.count} as of {formatDateIst(category.date)}
                      {isStale && (
                        <span className="text-foreground-faint"> (data may be delayed)</span>
                      )}
                    </>
                  ) : (
                    "No recent activity"
                  )}
                </li>
              );
            })}
            {/* Red flags: windowed summary (REDFLAG_CARD_FIX_PLAN_2026-10-05,
                windowed redesign 2026-10-06), a different shape from the 4
                single-day categories above -- rendered separately rather
                than forced into the same {count/date} tuple shape. */}
            <li key="Red flags">
              <span className="font-medium">Red flags:</span>{" "}
              {redFlags?.status === "updating" ? (
                <span className="text-foreground-muted">Updating…</span>
              ) : redFlags && redFlags.total_findings > 0 ? (
                <>
                  {redFlags.total_findings} finding{redFlags.total_findings === 1 ? "" : "s"} across{" "}
                  {redFlags.distinct_filings} filing{redFlags.distinct_filings === 1 ? "" : "s"} in the last{" "}
                  {redFlags.window_days} days; latest filing:{" "}
                  {redFlags.latest_date ? formatDateIst(redFlags.latest_date) : "—"}
                  {redFlagsStale && (
                    <span className="text-foreground-faint"> (data may be delayed)</span>
                  )}
                </>
              ) : (
                "No recent activity"
              )}
            </li>
          </ul>
        </section>
      ) : (
        // Honest fallback instead of silently omitting the section: a timeout
        // or error here is now unexpected post-fix, but a transient network
        // blip or a future regression should say so, not vanish without a
        // trace. The detailed table below (MarketActivityHub) is a separate
        // fetch and is unaffected either way.
        <section aria-label="Latest recorded market activity" className="rounded-xl border border-border p-4">
          <p className="text-sm text-foreground-muted">
            Latest activity summary is temporarily unavailable. The detailed table below is unaffected.
          </p>
        </section>
      )}
      <MarketActivityHub />
    </div>
  );
}
