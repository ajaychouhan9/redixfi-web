/** Fixed wording of Common readings. Counts of past days and shares of past days only. */

export const COMMON_BUTTON = "Common readings";
export const COMMON_SUB = "What these days had in common, checked against chance. Not a forecast or a recommendation.";
export const COMMON_TOO_FEW = "Fewer than 30 days. Not enough for a comparison.";
export const COMMON_NEEDS_MOVE = "Choose a move size to compare. With any size every day qualifies.";
export const COMMON_ERROR = "Common readings could not be loaded. Please try again.";
export const COMMON_HOW_TITLE = "How this is checked";
export const COMMON_HOW = [
  "Only sessions before the move are looked at (the sessions you selected before the day, and at least -1 and -2). The day of the move and later sessions contain the move itself, so they are never used.",
  "Each reading is counted on the days found and on all days of the same stock or stocks and period. Days on which a reading could not be measured are left out of both counts.",
  "A reading is marked Stood out only when at least 30 of the days found had it measurable, the share differs from all days by at least 10 percentage points, and the exact binomial p-value is below 0.05 divided by the number of comparisons made.",
  "A reading present on fewer than 20% of all days (a rare reading) is also marked Stood out when it is at least twice as common, or at most half as common, as on all days, at least 5 percentage points apart, and the same p-value test is met.",
  "The readings filter, if you used one, is not applied here: the days compared are the days with the chosen move.",
];
export const COL_READING = "Reading";
export const COL_SESSION = "Session";
export const COL_PRESENT = "Present on these days";
export const COL_ALL = "On all days (same stock/period)";
export const COL_DIFF = "Difference (percentage points)";
export const LEGEND = "Shares are the percentage of days with the reading. Differences are in percentage points (pts).";
export const BADGE = "Stood out";
export const COUNTS_TITLE = "Counts";
