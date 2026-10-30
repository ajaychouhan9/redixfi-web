/** Fixed wording of the History Explorer. Facts only: counts of past days and the readings around them. */

export const HISTORY_TITLE = "History Explorer";
export const HISTORY_INTRO =
  "Choose a move size and, if you like, some readings. See the past days when a stock moved by that much, with the readings the day before, on the day and the day after.";
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
