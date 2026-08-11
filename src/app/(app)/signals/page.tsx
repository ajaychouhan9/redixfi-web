import type { Metadata } from "next";
import { SmartScreenerBox } from "@/components/app/signals/SmartScreenerBox";
import { SignalsExplorer } from "@/components/app/signals/SignalsExplorer";
import { SectorSummaryCard } from "@/components/app/education/SummaryCard";
import { getSectorSummary, getSignals } from "@/lib/api/endpoints";

export const metadata: Metadata = {
  title: "Signal Dashboard",
  description: "Measured composite signal scores across 750+ NSE/BSE stocks — trend, delivery, sector standing and options positioning, factually reported.",
};

export default async function SignalsPage() {
  const sectorSummary = await getSectorSummary().then((r) => r.data).catch(() => null);
  // Real live count for the subtitle below (not hardcoded "750+") — same
  // /signals endpoint SignalsExplorer itself lists from, unfiltered
  // (size:1, we only need page_info.total). @auth-ok: SSR, anonymous —
  // the total UNIVERSE size doesn't vary by tier (only which rows are
  // masked does, per B8), matching the same anonymous-SSR-for-aggregate-
  // counts pattern already used elsewhere (sitemap.ts's getAllSignals).
  const trackedCount = await getSignals({ size: 1 }).then((r) => r.page_info.total).catch(() => null);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-lg font-semibold">Signal Dashboard</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Measured market signals across {trackedCount !== null ? trackedCount.toLocaleString("en-IN") : "750+"} tracked stocks
        </p>
      </div>
      <div className="mb-5">{sectorSummary && <SectorSummaryCard data={sectorSummary} />}</div>
      <SmartScreenerBox />
      <SignalsExplorer />
    </div>
  );
}
