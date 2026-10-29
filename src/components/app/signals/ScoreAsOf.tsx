"use client";

/**
 * "Score as of <date> close · updates after today's close" — next to the composite score on the stock pages.
 * The second half is shown only on a trading day whose score has not been built yet (market open, or closed and
 * waiting for the daily run); it disappears once the score is today's, and on holidays and weekends.
 */

import { formatObservationDate } from "@/lib/format";
import { useMarketState } from "@/lib/market/useMarketState";

export function ScoreAsOf({ scoreDate, className = "mt-1 text-[11px] text-foreground-faint" }: { scoreDate: string | null | undefined; className?: string }) {
  const state = useMarketState();
  const date = formatObservationDate(scoreDate);
  if (!date) return <p className={className}>Reading date unavailable</p>;
  const pending = !!state && state.score_updates_after_close && scoreDate!.slice(0, 10) < state.today;
  return (
    <p className={className}>
      Reading as of {date} close{pending ? " · updates after today’s close" : ""}
    </p>
  );
}
