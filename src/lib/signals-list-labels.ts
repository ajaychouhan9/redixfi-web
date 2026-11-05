import type { MarketState } from "@/lib/api/types";
import { formatObservationDate, formatTimeIst } from "@/lib/format";

export interface SignalsListLabels {
  /** Group heading above the Price column. */
  priceHeading: string;
  /** Group heading above the close-based columns. */
  readingsHeading: string;
  /** Exact ISO time of the group's latest 15-minute bar, when price is live. */
  priceAsOf: string | null;
  /** YYYY-MM-DD of the price group (live bar date or close date). */
  priceDate: string | null;
  /** YYYY-MM-DD of the close-based readings. */
  readingsDate: string | null;
  /** True only when the price group is today's live delayed bar. */
  priceIsLive: boolean;
}

function day(value: string | null | undefined): string | null {
  return value ? value.slice(0, 10) : null;
}

/**
 * One label rule for the main Signals table and its 375px cards.
 *
 * Before the open, weekends and holidays both groups are the previous
 * trading day's close. Live prices carry their own delayed-bar time; the
 * readings group always names the session whose close it uses.
 */
export function signalsListLabels(
  state: MarketState | null | undefined,
  latestBar: string | null | undefined,
): SignalsListLabels {
  const previous = day(state?.latest_completed_session) ?? day(state?.score_date);
  const previousLabel = formatObservationDate(previous);
  const previousClose = previousLabel ? `As of ${previousLabel} close` : "As of the previous session close";

  if (!state) {
    return {
      priceHeading: "Price",
      readingsHeading: "As of the latest session close",
      priceAsOf: null,
      priceDate: previous,
      readingsDate: previous,
      priceIsLive: false,
    };
  }

  const phase = state.phase;
  if (phase === "pre_market" || phase === "weekend" || phase === "holiday") {
    return {
      priceHeading: previousClose,
      readingsHeading: previousClose,
      priceAsOf: null,
      priceDate: previous,
      readingsDate: previous,
      priceIsLive: false,
    };
  }

  const today = day(state.today);
  const scoreDate = day(state.score_date);
  const readingsLabel = scoreDate
    ? `As of ${formatObservationDate(scoreDate)} close`
    : previousClose;

  if (phase === "live" && state.state === "live" && latestBar) {
    return {
      priceHeading: `Today, as of ${formatTimeIst(latestBar)} IST (delayed)`,
      readingsHeading: readingsLabel,
      priceAsOf: latestBar,
      priceDate: day(latestBar) ?? today,
      readingsDate: scoreDate,
      priceIsLive: true,
    };
  }

  if (phase === "live") {
    // Stale live feed: do not present an old bar as today's current price.
    return {
      priceHeading: previousClose,
      readingsHeading: readingsLabel,
      priceAsOf: null,
      priceDate: previous,
      readingsDate: scoreDate ?? previous,
      priceIsLive: false,
    };
  }

  const todayLabel = today ? formatObservationDate(today) : null;
  const todayClose = todayLabel ? `As of ${todayLabel} close` : "As of today's close";
  if (scoreDate && today && scoreDate === today) {
    return {
      priceHeading: todayClose,
      readingsHeading: todayClose,
      priceAsOf: null,
      priceDate: today,
      readingsDate: today,
      priceIsLive: false,
    };
  }
  return {
    priceHeading: todayClose,
    readingsHeading: readingsLabel,
    priceAsOf: null,
    priceDate: today,
    readingsDate: scoreDate ?? previous,
    priceIsLive: false,
  };
}
