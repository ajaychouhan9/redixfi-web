// Saved results of a saved rule (Shortlist Lab, 21 Nov 2026). Copy and tiny pure helpers; facts only.
export const RESULTS_TITLE = (rule: string): string => `Saved results for "${rule}"`;
export const RESULTS_NONE = "No result is saved yet. A result is saved each time you press Show stocks while this rule is open.";
export const RESULT_LIMIT_LINE = (limit: number, have: number): string => `Your plan keeps ${limit} saved ${limit === 1 ? "result" : "results"} for each rule. You have ${have}.`;
export const RESULT_COUNT_LINE = (day: string, count: number, asOf: string | null): string =>
  `${day} · ${count.toLocaleString("en-IN")} ${count === 1 ? "stock" : "stocks"}${asOf ? ` · figures as of ${asOf}` : ""}`;
export const RESULT_EARLIER = "Run with earlier values: the rule has changed since.";
export const RESULT_SINCE = (since: string, added: number, dropped: number): string =>
  `Since ${since}: ${added.toLocaleString("en-IN")} added, ${dropped.toLocaleString("en-IN")} dropped.`;
export const RESULT_VIEW = "View stocks";
export const RESULT_HIDE = "Hide stocks";
export const RESULT_DELETE = "Delete this result";
export const REPORT_PDF = "Download report (PDF)";
export const REPORT_CSV = "Download report (CSV)";
export const REPORT_FAILED = "The report could not be made right now. Please try again in a moment.";
export const REPORT_LEAD = "The report covers the stocks you ticked (up to 8): the rule, the stocks, and each stock's five answers with sources and dates. A stock with no answers shows \"Not asked yet\".";
export const REPORT_FREE = "Free accounts can open a sample report to see the format.";
export const DROP_WARNING = (limit: number, oldest: string): string =>
  `Your plan keeps ${limit} saved ${limit === 1 ? "result" : "results"} for each rule. Saving this one removes the oldest (${oldest}) and the answers saved with it.`;
export const DROP_CONFIRM = "Save and remove the oldest";
export const DROP_CANCEL = "Do not save this result";
export const SAVED_NOTE = (n: number): string => `This result was saved with the rule (${n.toLocaleString("en-IN")} ${n === 1 ? "stock" : "stocks"}).`;
export const SAME_DAY_NOTE = "Today's saved result was replaced with this one.";
export const DIFF_NOTE = (since: string, added: number, dropped: number): string =>
  `Since the result of ${since}: ${added.toLocaleString("en-IN")} added, ${dropped.toLocaleString("en-IN")} dropped.`;
