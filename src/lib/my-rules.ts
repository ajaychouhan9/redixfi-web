// "My rules" (Stock Check, 20 Nov 2026): common rules and saved rules in one card. Copy and small pure helpers, no React.
import type { MyScreen } from "@/lib/api/mutations";
import type { Rules } from "@/lib/stock-check";

export const MY_RULES_TITLE = "My rules";
export const MY_RULES_LEAD = "Open a rule you saved, or set the steps below and save them under a name. Each time you press Show stocks that meet my rule on a saved rule, the result is saved with it.";
export const NAME_PLACEHOLDER = "Name these rules";
/** A new rule starts with "My rule" and today's date (India date), for example "My rule 24 Nov". The person can change it. */
export function defaultRuleName(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 330 * 60000);
  return `My rule ${ist.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][ist.getUTCMonth()]}`;
}
export const SNAPSHOT_LABEL = "Also save today's stock list (a dated copy)";
export const SNAPSHOT_HELP = "The rules are always saved. With the list, you can open the rule later and see the stocks as they were on that date.";
export const SAVE_BUTTON = "Save";
export const SAVE_NEW_BUTTON = "Save as new";
export const OPEN_BUTTON = "Open";
export const DELETE_BUTTON = "Delete";
export const RUN_AGAIN_BUTTON = "Run again";
export const REPLACE_OLD = "Replace the old rule";
export const SAVE_AS_NEW_RULE = "Save as a new rule";
export const REPLACE_QUESTION = (name: string): string => `You changed the rules in "${name}". Replace the old rule, or save these as a new rule?`;
export const LOGGED_OUT_LINE = "Keep your rules under a name and open them again later.";
export const PLAN_LINE = (limit: number, have: number): string => `Your plan keeps ${limit} saved ${limit === 1 ? "rule" : "rules"}. You have ${have}.`;
export const LIMIT_REACHED = (limit: number): string =>
  limit === 1
    ? "Your Free plan keeps 1 saved rule. Delete the saved rule, or update it with Save, to save this one. Basic keeps 10 and Pro 30."
    : `Your plan keeps up to ${limit} saved rules. Delete one, or update a saved rule with Save.`;
export const SHOWING_RULE = (name: string): string => `Showing rule: ${name}`;
export const RULES_APPLIED_TITLE = "Rules applied";
export const RULES_APPLIED_NOTE = "Read only. To change a rule, use the steps above or My rules.";
export const SAVE_RESULT_BUTTON = "Save this result";
export const SAVE_RESULT_NAME_LABEL = "Name for this rule";
export const SAVE_RESULT_NAME_HELP = "The rule and this result are saved together under this name.";
export const SAVE_RESULT_CONFIRM = "Save the rule and this result";
export const SAVE_RESULT_CANCEL = "Cancel";
export const SAVE_RESULT_NEED_NAME = "Give the rule a name first.";
export const SAVE_RESULT_NEED_RULE = "Set at least one rule first.";
export const SAVED_RULE_AND_RESULT = (name: string, n: number): string => `Saved the rule "${name}" and its result (${n.toLocaleString("en-IN")} ${n === 1 ? "stock" : "stocks"}).`;
export const SAVED_RESULT_ONLY = (name: string, n: number): string => `Saved this result with "${name}" (${n.toLocaleString("en-IN")} ${n === 1 ? "stock" : "stocks"}).`;
export const RULES_SET_LINE = (n: number): string => `${n} ${n === 1 ? "rule" : "rules"} applied`;
export const NO_RULES_LINE = "No rule is applied: every stock is listed.";

export interface ActiveRule {
  id: string;
  name: string;
  /** The rules as they were when the rule was opened or last saved, to tell whether they were changed since. */
  base: Rules;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "20 Nov 2026" from an ISO date or date-time (read as UTC dates, so the day never shifts with the browser's time zone). Null when it is not a date. */
export function fmtDay(iso: string | null | undefined): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (m < 1 || m > 12) return null;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export const stocksText = (n: number): string => `${n.toLocaleString("en-IN")} ${n === 1 ? "stock" : "stocks"}`;

/** One line under a saved rule's name: the date it was saved and how many stocks met it then. */
export function savedLine(s: { updated_at?: string | null; created_at?: string | null; stock_count?: number | null; latest_run?: { count: number; as_of: string | null; run_date: string } | null }): string {
  const when = fmtDay(s.updated_at ?? s.created_at);
  const parts: string[] = [];
  if (when) parts.push(`Saved ${when}`);
  if (s.latest_run) {
    // the newest saved result carries its own count and the date of its figures
    parts.push(stocksText(s.latest_run.count));
    const asOf = fmtDay(s.latest_run.as_of) ?? fmtDay(s.latest_run.run_date);
    if (asOf) parts.push(`Figures as of ${asOf}`);
  } else if (typeof s.stock_count === "number" && s.stock_count > 0) {
    // a stored 0 means the count was not known when the rule was saved (the figures file had not loaded), so it is not shown as "0 stocks"
    parts.push(`${stocksText(s.stock_count)} when saved`);
  }
  return parts.join(" · ");
}

/** The line about the stock list saved with a rule, or null when only the rules were saved. */
export function snapshotLine(s: { snapshot?: MyScreen["snapshot"] }): string | null {
  const sn = s.snapshot;
  if (!sn) return null;
  const when = fmtDay(sn.as_of) ?? fmtDay(sn.at);
  return `Stock list saved${when ? ` as of ${when}` : ""}: ${stocksText(sn.count)}`;
}

/** What pressing Save does: no rule open (a new rule, needs a name), an open rule with changes (ask once), or an open rule with no changes (save it again). */
export function saveAction(hasActive: boolean, changed: boolean): "new" | "ask" | "replace" {
  if (!hasActive) return "new";
  return changed ? "ask" : "replace";
}

/** Symbols added to, and left out of, a list since a saved copy (both sorted). */
export function diffLists(before: string[], now: string[]): { added: string[]; left: string[] } {
  const b = new Set(before);
  const n = new Set(now);
  return { added: now.filter((s) => !b.has(s)).sort(), left: before.filter((s) => !n.has(s)).sort() };
}

export const RUN_AGAIN_RESULT = (savedOn: string | null, d: { added: number; left: number }): string =>
  `Compared with the list saved${savedOn ? ` as of ${savedOn}` : ""}: ${d.added.toLocaleString("en-IN")} added, ${d.left.toLocaleString("en-IN")} no longer ${d.left === 1 ? "meets" : "meet"} the rules.`;

/** A name for a copy that must differ from the rule it came from. */
export function copyName(wanted: string, oldName: string): string {
  const w = wanted.trim();
  if (w && w !== oldName) return w;
  return `${(w || oldName).slice(0, 52)} (new)`;
}
