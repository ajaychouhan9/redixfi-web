/** Fixed wording of the 7-Day Review. Facts only: price changes over the last sessions and the measured readings at the start and end. */
import { HISTORY_DISCLAIMER, SW_INDEPENDENCE_NOTE } from "@/lib/history-copy";

export const REVIEW_TITLE = "7-Day Review";
export const REVIEW_PATH = "/signals/7-day-review";
export const REVIEW_TAGLINE = "Biggest gains and falls of the week";
export const REVIEW_INTRO =
  "The price changes of the last trading sessions, the market for the week, the biggest changes in Stock Condition and what was announced. Measured data only.";
export const REVIEW_SEO_TITLE = "7-Day Review - biggest gains and falls of the week | RedixFi";
export const REVIEW_SEO_DESCRIPTION =
  "The biggest price gains and falls of Indian stocks over the week's trading sessions, with Stock Condition at the start and the end of the window, the market for the week (Nifty, Bank Nifty, India VIX, advancing and declining stocks) and what was announced. Measured data. Not a forecast or a recommendation.";

export const REVIEW_LIST_NOTE = `Price change over the window. ${HISTORY_DISCLAIMER}`;
export const REVIEW_INDEPENDENCE_NOTE = SW_INDEPENDENCE_NOTE;

export const UNIVERSE_LABEL = { nifty50: "Nifty 50", nifty100: "Nifty 100", nifty500: "Nifty 500", liquid: "All liquid" } as const;
export const UNIVERSE_ORDER = ["nifty50", "nifty100", "nifty500", "liquid"] as const;

export const REVIEW_LOGIN_PROMPT = "Log in to see your watchlist here";
export const REVIEW_EMPTY_WATCHLIST = "Your watchlist is empty. Add stocks on the Watchlist page to see them here.";
export const REVIEW_UNAVAILABLE = "The 7-Day Review is being prepared and is not available right now. Please check back later.";

export const MINE_STATUS_TEXT: Record<string, string> = {
  corporate_action: "Left out: a split, bonus or similar corporate action inside the window",
  not_eq: "Not available: this stock trades in a restricted series",
  incomplete: "Not available: price data for the window is incomplete",
  no_data: "Not available for this window",
};

/** The neutral question "Explain this week" types into Ask AI. It describes the numbers on the page and asks for nothing else. */
export function explainQuestion(args: {
  label: string;
  asOf: string;
  niftyPct: number | null;
  advancing: number;
  declining: number;
  n: number;
  industriesHigher: number;
  industriesTotal: number;
  results: number;
  deals: number;
  insider: number;
  fiiNet: number | null;
  diiNet: number | null;
}): string {
  const f = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
  const parts = [
    `${args.label} (${args.asOf}).`,
    args.niftyPct !== null ? `Nifty 50 changed ${f(args.niftyPct)} over the window.` : null,
    `${args.advancing} of ${args.n} liquid stocks rose and ${args.declining} fell.`,
    `${args.industriesHigher} of ${args.industriesTotal} industries were higher.`,
    args.fiiNet !== null && args.diiNet !== null ? `FII net cash flow was ${Math.round(args.fiiNet)} crore and DII net cash flow was ${Math.round(args.diiNet)} crore.` : null,
    `${args.results} stocks announced results, there were ${args.deals} bulk or block deals and ${args.insider} insider trade disclosures.`,
  ].filter(Boolean);
  return `Using measured data only, describe in plain words what these numbers from the RedixFi 7-Day Review say about the week. ${parts.join(" ")} Describe what happened. Do not give a forecast or a recommendation.`;
}
