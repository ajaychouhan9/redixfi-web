"use client";

import { useRef } from "react";
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

  return (
    <>
      <div className="mb-5">
        {sectorSummary && (
          <SectorSummaryCard
            data={sectorSummary}
            onSelectIndustry={(industry) => explorerRef.current?.filterByIndustry(industry)}
          />
        )}
      </div>
      <SmartScreenerBox />
      <SignalsExplorer ref={explorerRef} initialParams={cloneSource?.params} />
    </>
  );
}
