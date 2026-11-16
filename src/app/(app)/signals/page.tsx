import type { Metadata } from "next";
import Link from "next/link";
import { SignalsPageBody } from "@/components/app/signals/SignalsPageBody";
import { ReviewTabs } from "@/components/app/review/ReviewTabs";
import { GuestOnly } from "@/components/app/GuestOnly";
import { getSignals, getSharedScreen } from "@/lib/api/endpoints";
import { START_RESULTS_NOTE, screenerParamsFromQuery } from "@/lib/start-here";

export const metadata: Metadata = {
  title: "Stock Screener: filter NSE stocks by delivery, volume, 52-week range and volatility",
  alternates: { canonical: "/signals" },
  description: "Filter 2,000+ NSE stocks by measured delivery, volume against its usual level, distance from the 52-week high and volatility, with the sources stated.",
};

export default async function SignalsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // PERF_ANALYSIS_2026-10-05 fix (2026-10-07): these 3 fetches are mutually
  // independent (cloneSource depends only on `clone`, not on the other two)
  // but were previously awaited one at a time, paying each one's full
  // latency in sequence. Promise.all so they run concurrently.
  const query = await searchParams;
  const clone = Array.isArray(query.clone) ? query.clone[0] : query.clone;
  // 17 Nov 2026: "Start here" (and the starter links) open the Screener with filters in the address. This page was already dynamic
  // (it reads ?clone=); reading more of the same query adds no fetch and no new rendering mode.
  const fromQuery = screenerParamsFromQuery(query);
  const fromStart = (Array.isArray(query.from) ? query.from[0] : query.from) === "start";
  const [trackedCount, cloneSource] = await Promise.all([
    // Real live count for the subtitle below (not hardcoded "2,000+") — same
    // /signals endpoint SignalsExplorer itself lists from, unfiltered
    // (size:1, we only need page_info.total). @auth-ok: SSR, anonymous —
    // the total UNIVERSE size doesn't vary by tier (only which rows are
    // masked does, per B8), matching the same anonymous-SSR-for-aggregate-
    // counts pattern already used elsewhere (sitemap.ts's getAllSignals).
    getSignals({ size: 1 }).then((r) => r.page_info.total).catch(() => null),
    // "Clone this screen" (2026-09-11) — ?clone={slug} pre-fills the
    // explorer from a shared screen's saved params. @auth-ok: public read,
    // see getSharedScreen's own docstring — only the query is fetched here,
    // never results, so there's no auth/masking concern at this step.
    clone ? getSharedScreen(clone).catch(() => null) : Promise.resolve(null),
  ]);
  const initial = cloneSource ?? (fromQuery ? { params: fromQuery } : null);

  return (
    <div>
      <ReviewTabs active="signals" />
      <div className="mb-5">
        <h1 className="text-lg font-semibold">Stock Screener</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Measured readings for {trackedCount !== null ? trackedCount.toLocaleString("en-IN") : "2,000+"} tracked {trackedCount === 1 ? "stock" : "stocks"}
        </p>
        {fromStart && fromQuery && (
          <p className="mt-1 text-sm font-medium" data-testid="start-results-note">
            {START_RESULTS_NOTE}
          </p>
        )}
        <GuestOnly>
          <p className="mt-1 text-xs text-foreground-muted">
            <Link href="/start" className="font-medium text-accent hover:underline" data-testid="signals-start-link">
              New here? Try the simple view
            </Link>
          </p>
        </GuestOnly>
      </div>
      <SignalsPageBody cloneSource={initial} />
    </div>
  );
}
