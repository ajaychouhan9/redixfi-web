"use client";

import { useState } from "react";

import { IntradayScreen } from "@/components/app/intraday/IntradayScreen";

/** Every earlier Intraday view (the pre-open table and sector heat map, the filter scanner, events, watchlist and the day recap) stays here, unchanged.
 *  It is only loaded when opened, so the three tabs above do not make its extra requests. */
export function LegacyTools() {
  const [open, setOpen] = useState(false);
  return (
    <details className="border-t border-border pt-2" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)} data-testid="intraday-more-tools">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">More Intraday tools: pre-open table, filter scanner, events, watchlist and day recap</summary>
      {open && (
        <div className="pt-2">
          <IntradayScreen initialSession={null} initialSectors={null} initialRecap={null} />
        </div>
      )}
    </details>
  );
}
