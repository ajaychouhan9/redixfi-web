"use client";

import { useRef } from "react";
import { Collapsible } from "@/components/ui/Collapsible";
import { formatObservationDate } from "@/lib/format";
import { SmartScreenerBox } from "@/components/app/signals/SmartScreenerBox";
import { SignalsExplorer, type SignalsExplorerHandle } from "@/components/app/signals/SignalsExplorer";
import { SectorSummaryCard } from "@/components/app/education/SummaryCard";
import type { SectorSummary, SharedScreenParams } from "@/lib/api/types";

/**
 * Sep 2026 — thin client wrapper so the Industry Standing card (server-
 * fetched data, rendered here) can drive the existing Signals table's
 * filter + scroll via SignalsExplorer's imperative handle, without a
 * second Signals table or a page navigation. Signals/page.tsx (a Server
 * Component) still does the actual data fetching and passes the results
 * down as plain props.
 */
export function SignalsPageBody({
  sectorSummary,
  cloneSource,
}: {
  sectorSummary: SectorSummary | null;
  cloneSource?: { params: SharedScreenParams } | null;
}) {
  const explorerRef = useRef<SignalsExplorerHandle>(null);

  const industryDate = formatObservationDate(sectorSummary?.date);
  return (
    <>
      <SmartScreenerBox onApplyFilters={(patch) => explorerRef.current?.applySmartFilters(patch)} />
      <SignalsExplorer ref={explorerRef} initialParams={cloneSource?.params} />
      {sectorSummary && (
        <div className="mt-5">
          <Collapsible question={industryDate ? `Industry standing, as of ${industryDate} close` : "Industry standing"}>
            <SectorSummaryCard
              data={sectorSummary}
              hideHeader
              onSelectIndustry={(industry) => explorerRef.current?.filterByIndustry(industry)}
            />
          </Collapsible>
        </div>
      )}
    </>
  );
}
