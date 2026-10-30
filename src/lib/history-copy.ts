/** Fixed wording of the History Explorer. Facts only: counts of past days and the readings around them. */

export const HISTORY_TITLE = "History Explorer";
export const HISTORY_INTRO = "Past days when a stock moved by a chosen size, with the measured readings around each day.";
export const HISTORY_DISCLAIMER = "Past record of measured data. Not a forecast or a recommendation.";
export const HISTORY_CHANCE_NOTE = "Trying many filters can produce good-looking numbers by chance.";
export const HISTORY_EXAMPLES_TITLE = "Examples to start with";
export const HISTORY_NOT_ENOUGH = "Not enough days to show a summary";
export const HISTORY_BUILDING =
  "More readings are added as their history builds: sector rank, put-call ratio, promoter pledge, FII flow and events.";

export const HISTORY_SEO_TITLE = "History Explorer: past days with a chosen move";
export const HISTORY_SEO_DESCRIPTION =
  "See the past days when an Indian stock moved by 1% to 20%, with the measured readings the day before, on the day and the day after. Counts of past days with the base rate, from three years of exchange data.";

export type MatchMode = "all" | `any${number}`;

export function summaryLines(args: {
  move: number;
  dir: "up" | "down";
  E: number;
  K: number | null;
  N: number | null;
  Kn: number | null;
  baseRate: number | null;
  match: MatchMode;
  tickedCount: number;
}): string[] {
  const { move, dir, E, K, N, Kn, baseRate, match, tickedCount } = args;
  const what = match === "all" ? (tickedCount === 1 ? "the ticked signal" : "all ticked signals") : `at least ${match.slice(3)} of the ticked signals`;
  const out: string[] = [`Days with a move of ${move}% or more (${dir}): ${E.toLocaleString("en-IN")}.` + (K != null ? ` Of these, ${K.toLocaleString("en-IN")} had ${what} the day before.` : "")];
  if (N != null && Kn != null) {
    out.push(
      `Days with ${match === "all" ? (tickedCount === 1 ? "the ticked signal" : "the ticked signals") : `at least ${match.slice(3)} of the ticked signals`} the day before: ${N.toLocaleString("en-IN")}. ` +
        `A move of ${move}% or more ${dir} followed on the next day on ${Kn.toLocaleString("en-IN")} of them (${Kn.toLocaleString("en-IN")} out of ${N.toLocaleString("en-IN")}).`,
    );
  }
  if (baseRate != null) out.push(`For comparison, on all days in the same stocks and period such a move happened on ${baseRate}% of days.`);
  return out;
}

// ---- stock-wise mode (the default view)
export const SW_TAB = "Stock-wise";
export const POOLED_TAB = "Across stocks";
export const SW_INTRO = "Choose one or more stocks, a move size and a period. See every past day with that move and the measured readings around it.";
export const SW_INDEPENDENCE_NOTE = "Many stocks move on the same market days; these days are not independent.";
export const SW_NO_DAYS = "No days in this period";
export const SW_NA = "Not available";
export const SW_PENDING = "Next session pending";
export const SW_PRO_ONLY = "CSV download and saved filters are included in Pro.";
export const SW_SIGNAL_NOTE = "A reading is checked at the chosen session; sessions are the stock's own trading days.";

const PERIOD_TEXT: Record<string, string> = { "1y": "last year", "2y": "last 2 years", "3y": "last 3 years" };
export const periodText = (p: string) => PERIOD_TEXT[p] ?? p;
const n = (v: number) => v.toLocaleString("en-IN");

export function stockwiseLine(args: { symbol: string; count: number; up: number; down: number; sessions: number; move: number | null; direction: "up" | "down" | "either"; period: string }): string {
  const { symbol, count, up, down, sessions, move, direction, period } = args;
  const kind = direction === "either" ? "a move" : `${direction === "up" ? "an up" : "a down"} move`;
  const what = move == null ? (direction === "either" ? "days" : `${direction} days`) : `days with ${kind} of ${move}% or more`;
  const split = direction === "either" ? ` (${n(up)} up, ${n(down)} down)` : "";
  return `${symbol}: ${n(count)} ${what} in the ${periodText(period)}${split}, out of ${n(sessions)} sessions.`;
}

export const readingsCountLine = (hit: number, of: number, offset: number) => `${n(hit)} of ${n(of)} days had these readings at ${offset > 0 ? "+" : ""}${offset}.`;
export const sameDayLine = (c: number) => `Days when 2 or more of the selected stocks moved: ${n(c)}.`;
