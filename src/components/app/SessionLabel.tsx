"use client";

/**
 * Labels end-of-day data (scores, score changes, unusual activity) with the session it belongs to, so it is never
 * mistaken for live data on a trading day:
 *   - before the day's score run:   "Last session · 22 Oct 2026" + "Daily signals update after market close (about 4:40 pm IST)"
 *   - after the close, not scored:  "Today\u2019s signals update after about 4:40 pm IST" (a calm note, from the API)
 *   - once the day's score exists:  "Today's close · 23 Oct 2026"
 *   - holiday / weekend:            "Last session · <date>" only
 * `dataDate` is the date of the data shown; `initial` is the state the server rendered.
 */

import { Clock } from "lucide-react";

import { formatObservationDate } from "@/lib/format";
import { useMarketState } from "@/lib/market/useMarketState";
import type { MarketState } from "@/lib/api/types";

export function SessionLabel({ dataDate, initial }: { dataDate: string | null | undefined; initial?: MarketState | null }) {
  const state = useMarketState(initial);
  const date = formatObservationDate(dataDate);
  if (!date) return null;
  const today = !!state && !!dataDate && dataDate.slice(0, 10) === state.today;
  const pending = !!state && state.is_trading_day && !today;
  return (
    <div className="mb-3 space-y-0.5 text-[11px] text-foreground-faint">
      <p className="font-medium text-foreground-muted">{today ? "Today’s close" : "Last session"} · {date}</p>
      {pending && (
        <p className="flex items-center gap-1">
          {state?.closing_data_updating && <Clock size={11} aria-hidden />}
          {state?.score_note ?? "Daily signals update after market close (about 4:40 pm IST)"}
        </p>
      )}
    </div>
  );
}
