// Saved results of a saved rule (Shortlist Lab, 21 Nov 2026). Copy and tiny pure helpers; facts only.
export const RESULTS_TITLE = (rule: string): string => `Saved results for "${rule}"`;
export const RESULTS_NONE = "No result is saved for this rule yet.";
export const RESULT_GROUPS_NONE = "No saved results yet. Show your stocks, then press Save this result.";
export const RESULT_GROUP_COUNT = "Results";
export const RESULT_ANSWERS_TITLE = (n: number): string => `Ask AI answers (${n})`;
export const RESULT_ANSWERS_NONE = "No answers saved yet.";
export const RESULT_LIMIT_LINE = (limit: number, have: number): string => `Your plan keeps ${limit} saved ${limit === 1 ? "result" : "results"} for each rule. You have ${have}.`;
export const RESULT_COUNT_LINE = (day: string, count: number, asOf: string | null): string =>
  `${day} · ${count.toLocaleString("en-IN")} ${count === 1 ? "stock" : "stocks"}${asOf ? ` · figures as of ${asOf}` : ""}`;
export const RESULT_EARLIER = "Run with earlier values: the rule has changed since.";
export const RESULT_SINCE = (since: string, added: number, dropped: number): string =>
  `Since ${since}: ${added.toLocaleString("en-IN")} added, ${dropped.toLocaleString("en-IN")} dropped.`;
export const RESULT_VIEW = "View stocks";
export const RESULT_HIDE = "Hide stocks";
export const RESULT_DELETE = "Delete this result";
export const REPORT_PDF = "Download full report";
export const REPORT_STOCK_PDF = "Download PDF";
export const REPORT_CSV = "Download CSV";
export const REPORT_FAILED = "The report could not be made right now. Please try again in a moment.";
export const REPORT_LEAD = "The full report covers the ticked stocks (up to 8).";
export const REPORT_FREE = "Free accounts can open a sample report to see the format.";
export const DROP_WARNING = (limit: number, oldest: string): string =>
  `Your plan keeps ${limit} saved ${limit === 1 ? "result" : "results"} for each rule. Saving this one removes the oldest (${oldest}) and the answers saved with it.`;
export const DROP_CONFIRM = "Save and remove the oldest";
export const DROP_CANCEL = "Do not save this result";
export const SAVED_NOTE = (n: number): string => `This result was saved with the rule (${n.toLocaleString("en-IN")} ${n === 1 ? "stock" : "stocks"}).`;
export const SAME_DAY_NOTE = "Today's saved result was updated. Same rule, same values.";
export const DIFF_NOTE = (since: string, added: number, dropped: number): string =>
  `Since the result of ${since}: ${added.toLocaleString("en-IN")} added, ${dropped.toLocaleString("en-IN")} dropped.`;

// 23 Nov 2026: saving results and the plan limits
export const SAVE_REPLACE_FREE = "Saving replaces your saved result, and the Ask AI answers saved with it are removed. Download the report or CSV first if you want to keep them.";
export const SAVE_REPLACE_BUTTON = "Save and replace";
export const FREE_MORE_LINE = "Basic keeps 10 saved results for each rule and Pro keeps 30.";
export const SEE_PLANS = "See the plans";
export const DROP_WARNING_DATE = (limit: number, oldest: string): string =>
  `Your plan keeps ${limit} saved results for each rule. Saving this one removes the oldest result (${oldest}) and the Ask AI answers saved with it. Download the report or CSV first if you want to keep them.`;
export const DELETE_OTHER = "Delete a different result";
export const DELETE_OTHER_LEAD = "Choose a result to delete. Its Ask AI answers go with it.";
export const DL_REPORT = "Download report";
export const DL_CSV = "Download CSV";
export const DL_FREE = "Downloads are on Basic and Pro.";
export const DELETE_RULE_WARN = (n: number): string =>
  n > 0
    ? `Deleting this rule also deletes its ${n} saved ${n === 1 ? "result" : "results"} and the Ask AI answers saved with ${n === 1 ? "it" : "them"}. Download the report or CSV first if you want to keep them.`
    : "Deleting this rule cannot be undone.";
export const DELETE_RULE_CONFIRM = "Delete the rule and its results";
export const DELETE_RULE_KEEP = "Keep it";
export const OVER_LIMIT_LINE = (limit: number, have: number): string =>
  `Your plan keeps ${limit} saved ${limit === 1 ? "result" : "results"} for each rule and this rule has ${have}. You can still open and download them all. Delete some results to save a new one.`;
export const LIVE_TITLE = "Your rule today";
export const LIVE_NOT_SAVED = "Not saved yet. Press Save this result to keep it.";
export const ASK_STATUS = (k: number): string => `${k} of 5 answered`;
export const ASK_STATUS_OTHER = (k: number): string => `${k} ${k === 1 ? "answer" : "answers"}`;
export const ASK_NONE = "Not asked";
export const TICK_NEXT_8 = "Tick next 8 not yet asked";
export const TICK_NEXT_NONE = "Every stock here has been asked.";
export const SAVED_RESULT_HINT = "Tick up to 8 stocks to ask about them or put them in the report.";
export const RESULTS_IDLE = "No list shown yet. Use the button on your rule page.";
