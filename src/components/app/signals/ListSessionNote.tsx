"use client";

/** Caption above the Signals table: which session the Score column belongs to, and what the Price column is. */

import { formatObservationDate } from "@/lib/format";
import { useMarketState } from "@/lib/market/useMarketState";

export function ListSessionNote() {
  const state = useMarketState();
  const date = formatObservationDate(state?.score_date);
  if (!state || !date) return null;
  return (
    <p className="mb-2 text-[11px] leading-snug text-foreground-faint">
      <span className="font-medium text-foreground-muted">Score: {date} close</span>
      {state.score_updates_after_close ? " · updates after today’s close" : ""}.{" "}
      <span className="font-medium text-foreground-muted">Price: {state.state === "live" ? "Live" : "last close"}</span>
      {state.state === "live" ? " (each row shows the time of its latest 15-minute bar)" : ""}.
    </p>
  );
}
