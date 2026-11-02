import type { IntradayTabId, IntradayUniverse } from "@/lib/api/types";

/** Everything the Intraday tabs print. Descriptive wording only (scripts/test-wording.mjs scans this file). */
export const INTRADAY_PATH = "/intraday";
export const INTRADAY_TITLE = "Intraday Monitor";
export const INTRADAY_H1 = "Intraday: gaps, moves and how the day ended";
export const INTRADAY_SEO_TITLE = "Intraday Monitor: largest gaps and moves of the trading day | RedixFi";
export const INTRADAY_SEO_DESCRIPTION =
  "Three views of the NSE trading day for liquid stocks: the largest gaps before the open, the largest moves so far, and how the day ended. Prices are delayed or as of the last update. Past record of measured data. Not a forecast or a recommendation.";

export const DISCLAIMER = "Past record of measured data. Not a forecast or a recommendation.";
export const DELAY_NOTE = "Prices are delayed or as of the last update.";

export const TAB_ORDER: IntradayTabId[] = ["morning", "scan", "recap"];
export const TAB_LABEL: Record<IntradayTabId, string> = { morning: "Pre-open", scan: "Live scan", recap: "After close" };
export const TAB_SUBTITLE: Record<IntradayTabId, string> = {
  morning: "Largest gaps before the open",
  scan: "Largest moves so far",
  recap: "How the day ended",
};

/** One line under the tab bar saying what the tab is. `recapDate` is the date label of the stored data when it is not the current trading day. */
export const TAB_EXPLAINER: Record<IntradayTabId, string> = {
  morning: "Prices set by NSE between 9:00 and 9:08, snapshot taken at 9:09.",
  scan: "During market hours. Prices are delayed or as of the last update.",
  recap: "What happened today, after the close.",
};
export function explainerFor(tab: IntradayTabId, dataDate: string | null | undefined, isToday: boolean | undefined): string {
  if (tab === "recap" && dataDate && isToday === false) return `What happened on ${dataDate}, after the close.`;
  return TAB_EXPLAINER[tab];
}

export const UNIVERSE_ORDER: IntradayUniverse[] = ["nifty50", "nifty100", "nifty500", "liquid"];
export const UNIVERSE_LABEL: Record<IntradayUniverse, string> = { nifty50: "Nifty 50", nifty100: "Nifty 100", nifty500: "Nifty 500", liquid: "All liquid" };

export const LIQUID_NOTE =
  "Liquid stocks only: EQ series (no BE, BZ or SME stocks), an average daily traded value of at least ₹1 crore and a price of at least ₹10.";

export const MORNING_NOTE =
  "The gap is the indicative pre-open price against the previous close, from the NSE pre-open session. It can change before the market opens at 9:15.";
export const MORNING_FALLBACK_NOTE =
  "Reduced coverage: today's whole-market pre-open read is not available, so only the stocks in the stored 9:09 pre-open scan are listed.";
export const SCAN_NOTE =
  "The change is the latest price against the previous close. Volume vs usual compares today's volume so far with the 20-day average volume scaled by the time elapsed in the session. Early in the session this ratio is unsteady.";
export const RECAP_NOTE =
  "The same lists as they stood in Pre-open and in Live scan (the Live scan lists are kept as they stood at the 11:15 update), each stock with its own change by the end of the day and its day low and high. Nothing here is a count or a score of the lists.";

export function closedMessage(reason: "weekend" | "holiday" | null, dataDate: string | null): string {
  const why = reason === "holiday" ? "Market closed today (market holiday)" : reason === "weekend" ? "Market closed (weekend)" : "Market closed";
  return `${why}. Showing the last session${dataDate ? `: ${dataDate}` : ""}.`;
}

export const EMPTY: Record<IntradayTabId, string> = {
  morning: "The pre-open lists are not available yet. They are stored after the 9:09 pre-open scan.",
  scan: "The intraday lists are not available yet. They are stored from the first 15-minute update after the open.",
  recap: "The recap is not available yet. It is built after the market closes.",
};
