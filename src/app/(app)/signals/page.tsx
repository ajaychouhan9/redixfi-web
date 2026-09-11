import type { Metadata } from "next";
import { SmartScreenerBox } from "@/components/app/signals/SmartScreenerBox";
import { SignalsExplorer } from "@/components/app/signals/SignalsExplorer";
import { SectorSummaryCard } from "@/components/app/education/SummaryCard";
import { getSectorSummary, getSignals, getSharedScreen } from "@/lib/api/endpoints";

export const metadata: Metadata = {
  title: "Signal Dashboard",
  description: "Measured composite signal scores across 2,000+ NSE stocks — trend, delivery, sector standing and options positioning, factually reported.",
};

export default async function SignalsPage({ searchParams }: { searchParams: Promise<{ clone?: string }> }) {
  const sectorSummary = await getSectorSummary().then((r) => r.data).catch(() => null);
  // Real live count for the subtitle below (not hardcoded "2,000+") — same
  // /signals endpoint SignalsExplorer itself lists from, unfiltered
  // (size:1, we only need page_info.total). @auth-ok: SSR, anonymous —
  // the total UNIVERSE size doesn't vary by tier (only which rows are
  // masked does, per B8), matching the same anonymous-SSR-for-aggregate-
  // counts pattern already used elsewhere (sitemap.ts's getAllSignals).
  const trackedCount = await getSignals({ size: 1 }).then((r) => r.page_info.total).catch(() => null);

  // "Clone this screen" (2026-09-11) — ?clone={slug} pre-fills the explorer
  // from a shared screen's saved params. @auth-ok: public read, see
  // getSharedScreen's own docstring — only the query is fetched here,
  // never results, so there's no auth/masking concern at this step.
  const { clone } = await searchParams;
  const cloneSource = clone ? await getSharedScreen(clone).catch(() => null) : null;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-lg font-semibold">Signal Dashboard</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Measured market signals across {trackedCount !== null ? trackedCount.toLocaleString("en-IN") : "2,000+"} tracked stocks
        </p>
      </div>
      <div className="mb-5">{sectorSummary && <SectorSummaryCard data={sectorSummary} />}</div>
      <SmartScreenerBox />
      <SignalsExplorer initialParams={cloneSource?.params} />
    </div>
  );
}
