// "Shortlist Lab" (19 Nov 2026): the shortlist ladder as plain, testable data and functions. No React here.
// The ladder counts stocks in the browser from ONE anonymous figures file (GET /ladder-data: numbers only, no symbol or name), so a
// count never needs a server call per step. The shortlist with names still comes from GET /signals (same rules, same server tests).
import type { SignalsListParams } from "@/lib/api/endpoints";
import type { SharedScreenParams } from "@/lib/api/types";

export const PAGE_TITLE = "Shortlist Lab";
export const PAGE_SUBTITLE = "Set your rules. Read the result.";
export const SEO_TITLE = "Shortlist Lab: set your rules, read the result | RedixFi";
export const MENU_LABEL = "Shortlist Lab";
export const HOME_BUTTON = "New to stocks? Learn the 5 questions";
export const LADDER_TITLE = "Build Your Shortlist";
export const CLEAR_ALL = "Clear all";
export const FILL_BUTTON = "Fill typical values";
export const FILL_NOTE = "Typical numbers from published methods. Change any of them. A field with no published number is left blank.";
export const SECTION_RULES = "Rules";
export const CREATE_NEW_RULE = "Create new rule";
export const BACK_TO_RULES = "Back to my rules";
export const VIEW_STOCKS = "View stocks";
export const RULES_LIST_NONE = "You have no saved rule yet. Press Create new rule.";
export const EARLIER_VALUES_LINE = "Your saved results were made with the earlier values. They stay as they were.";
export const AFTER_STEP = (left: number, removed: number): string => `After this step: ${left.toLocaleString("en-IN")} left. This step removed ${removed.toLocaleString("en-IN")}.`;
export const REMOVED_DEPENDS = "The removed number depends on the steps before it.";
/** One step row: how many rules are set and how many stocks are left after the step (counted in step order). The count shows only once something is filled. */
export const stepRowText = (set: number, left: number | null): string => `${set > 0 ? `✓ ${set} set` : "Not set"}${left === null ? "" : ` · ${left.toLocaleString("en-IN")} left`}`;
export const BLANK_LINE = "Leave a field blank to ignore it.";
export const PAST_LINE = "Filters use past reported numbers. They do not tell what happens next.";
export const RESULTS_TITLE = "Your shortlist";
export const SHOW_BUTTON = "Show stocks that meet my rule";
export const NO_FILTER_LINE = "No filter applied. Fill at least one field.";
export const ABOUT_MATCH = (n: number): string => `About ${n.toLocaleString("en-IN")} ${n === 1 ? "stock matches" : "stocks match"} so far`;
export const SECTION_CREATE = "Create rule";
export const SECTION_SAVED = "Saved rules";
export const SECTION_RESULTS = "Results";
export const BACK_TO_STEPS = "Back to the steps";
export const NEXT_STEP = (n: number): string => `Next: Step ${n}`;
export const STEPS_TITLE = "The 7 steps";
export const STEP_NOT_SET = "Not set";
export const stepSetText = (n: number): string => (n > 0 ? `✓ ${n} set` : STEP_NOT_SET);
/** The price-swings option of step 5 (a clear name and plain words). The stored values are unchanged: a rule saved with "calmer" or "more active" opens the same way. */
export const VOL_LABEL = "Day-to-day price swings";
export const VOL_LINE = "How much the closing price moved from one day to the next over the last 21 trading days, compared with other stocks.";
export const VOL_OPTIONS: readonly (readonly ["" | "calmer" | "active", string])[] = [
  ["", "Not used"],
  ["calmer", "Calmer: swung less than most stocks"],
  ["active", "More active: swung more than most stocks"],
];
export const volNumLabel = (v: "" | "calmer" | "active"): string => (v === "calmer" ? "Swung more than at most" : "Swung more than at least");
export const COUNTS_NOTE = "Counts come from last night's figures. The final list may differ by a few stocks.";
export const NUMBERS_AS_OF = (date: string) => `Numbers as of ${date}`;

export const BANK_NOTE =
  "ROCE is not shown for banks, insurers and finance companies. Their business is borrowing and lending money, so the ROCE formula does not work for them.";
export const BANK_WHY_LABEL = "Why?";
export const BANK_WHY =
  "ROCE asks: for every Rs 100 put into the business, how much operating profit did it earn? That works for a company that makes or sells things, because interest it pays is a separate cost of raising money. A bank is different. It takes money from depositors and lends it out. Deposits are what it works with, and the interest it pays is part of its day-to-day cost, like steel for a car maker. So there is no clean profit before interest, and most of its liabilities are deposits. The result would look like a number but would not mean the same thing. Banks and finance companies are usually read with other measures: return on equity, return on assets, bad loans and the gap between what they earn on loans and pay on deposits. Return on equity is shown on this page. The others are not on the page yet.";

export const DEBT_NOTE = "Debt to equity does not suit banks and finance companies. Borrowing is their business.";
export const DEBT_WHY =
  "Debt to equity compares what a company owes with what its owners put in. For a company that makes or sells things, debt pays for plants and stock, so a high ratio says something. A bank or a finance company takes in deposits or borrows, and lends the money out. Owing a lot is how that business works, so the ratio is high by design and cannot be compared with a maker of goods. Other measures are used for them.";

/** Example values for the rules, shown as a short grey "e.g." line and as the grey text of an empty box. Examples only. */
export const EXAMPLES: Record<string, { value: string; text: string }> = {
  mcMin: { value: "500", text: "500 (₹ crore)" },
  profitYears: { value: "5", text: "5 (every one of the last 5 years)" },
  sales3: { value: "10", text: "10 (% a year)" },
  profit3: { value: "10", text: "10 (% a year)" },
  salesQ: { value: "10", text: "10 (%)" },
  profitQg: { value: "10", text: "10 (%)" },
  roe: { value: "15", text: "15 (%)" },
  roce: { value: "15", text: "15 (%)" },
  de: { value: "1", text: "1 (times)" },
  pledge: { value: "10", text: "10 (%)" },
  volNum: { value: "25", text: "25 (%) for calmer, 75 (%) for more active" },
  volRatio: { value: "1.5", text: "1.5 times" },
  delivery: { value: "50", text: "50 (%)" },
  pe: { value: "25", text: "25 times" },
  chgMin: { value: "10", text: "10 (%) over 3 months" },
  near52: { value: "10", text: "10 (%)" },
  volDay: { value: "1.5", text: "1.5 times" },
};
export const exampleLine = (text: string): string => `e.g. ${text}`;

export const GROWTH_LABEL = "Sales and profit both higher than the year before, 3 years in a row.";
export const GROWTH_HINT = "Compares rupee figures from annual results, not percentages. A move from a loss to a profit counts as higher. Needs 4 years of annual figures.";
export const NO_GROWTH_LINE = (n: number): string =>
  `${n.toLocaleString("en-IN")} ${n === 1 ? "stock has" : "stocks have"} fewer than 4 years of annual figures and ${n === 1 ? "is" : "are"} left out of this rule`;

export const NO_ROCE_LINE = (n: number): string =>
  `${n.toLocaleString("en-IN")} ${n === 1 ? "stock has" : "stocks have"} no ROCE figure and ${n === 1 ? "is" : "are"} left out of this filter`;

// ---- the anonymous figures file ---------------------------------------------------------------------------------------------------------
export type Cell = number | null;
export interface LadderData {
  version: number;
  as_of: string | null;
  fund_quarter_end: string | null;
  built_at: string;
  cols: string[];
  rows: Cell[][];
}
export const LADDER_VERSION = 1;

export function validLadderData(d: unknown): d is LadderData {
  const x = d as LadderData | null;
  return (
    !!x &&
    x.version === LADDER_VERSION &&
    Array.isArray(x.cols) &&
    Array.isArray(x.rows) &&
    x.rows.length > 0 &&
    x.rows.every((r) => Array.isArray(r) && r.length === x.cols.length)
  );
}

// ---- the rules --------------------------------------------------------------------------------------------------------------------------
export interface Rules {
  mcMin: string;
  profitQ: boolean;
  profitYears: string;
  sales3: string;
  profit3: string;
  salesQ: string;
  profitQg: string;
  /** Sales and profit both higher than the year before, 3 years in a row (rupee figures; four annual figures needed). */
  growthUp: boolean;
  roe: string;
  roce: string;
  de: string;
  pledge: string;
  vol: "" | "calmer" | "active";
  volNum: string;
  volRatio: string;
  delivery: string;
  pe: string;
  /** "Price and volume" (22 Nov 2026): price change of at least chgMin % over chgMonths months (1, 3 or 6); within near52 % of the 52-week high; above the avgDays-day average (50 or 200); latest day's volume at least volDay times its 20-day average. */
  chgMonths: "" | "1" | "3" | "6";
  chgMin: string;
  near52: string;
  avgDays: "" | "50" | "200";
  volDay: string;
}
export const EMPTY_RULES: Rules = {
  mcMin: "", profitQ: false, profitYears: "", sales3: "", profit3: "", salesQ: "", profitQg: "", growthUp: false,
  roe: "", roce: "", de: "", pledge: "", vol: "", volNum: "", volRatio: "", delivery: "", pe: "",
  chgMonths: "", chgMin: "", near52: "", avgDays: "", volDay: "",
};
/** Typical values (editable) for "Fill typical values". Only a field with a published number is filled (sources are in the release report, not on screen):
 *  steps 1 to 4 and 6 use the example numbers; step 5 fills Delivery (50 %, a cut-off used by published delivery screens) and leaves "Volume vs usual" and "Day-to-day price swings" blank;
 *  step 7 fills "within 25 % of the 52-week high", "above the 200-day average" (Minervini Trend Template) and "volume at least 1.5 times its 20-day average" (a published volume-spike number);
 *  the price change over 1, 3 or 6 months is left blank. */
export const COMMON_RULES: Rules = {
  ...EMPTY_RULES,
  profitQ: true,
  mcMin: EXAMPLES.mcMin.value, profitYears: EXAMPLES.profitYears.value, sales3: EXAMPLES.sales3.value, profit3: EXAMPLES.profit3.value,
  salesQ: EXAMPLES.salesQ.value, profitQg: EXAMPLES.profitQg.value, roe: EXAMPLES.roe.value, roce: EXAMPLES.roce.value, de: EXAMPLES.de.value,
  pledge: EXAMPLES.pledge.value, pe: EXAMPLES.pe.value,
  delivery: "50",
  near52: "25", avgDays: "200", volDay: "1.5",
};

export interface RuleDef {
  key: keyof Rules;
  step: number;
  label: string;
  unit: string;
  hint: string;
  col: string;
  op: "min" | "max" | "gt0" | "flag";
  /** The GET /signals (and saved-screen) parameter this rule sends. */
  param: string;
  /** The range the server accepts for this filter (a value outside it is not a rule: it is not counted and not sent). */
  lo?: number;
  hi?: number;
  int?: boolean;
}
export const RULES: RuleDef[] = [
  { key: "mcMin", step: 0, label: "Market value at least", unit: "₹ crore", hint: "shares × price", col: "mc", op: "min", param: "market_cap_min" },
  { key: "profitQ", step: 1, label: "Profit in the latest quarter", unit: "", hint: "earnings per share above zero", col: "eps", op: "gt0", param: "eps_positive" },
  { key: "profitYears", step: 1, label: "Profit in at least this many of the last 5 years", unit: "of 5", hint: "5 means every one of the last five years", col: "py", op: "min", param: "profit_years_min", lo: 0, hi: 5, int: true },
  { key: "sales3", step: 1, label: "Sales growth over 3 years at least", unit: "% a year", hint: "compound, from annual figures", col: "sg3", op: "min", param: "sales_cagr_3y_min", lo: -100, hi: 100000 },
  { key: "profit3", step: 1, label: "Profit growth over 3 years at least", unit: "% a year", hint: "compound, from annual figures", col: "pg3", op: "min", param: "profit_cagr_3y_min", lo: -100, hi: 100000 },
  { key: "salesQ", step: 1, label: "Sales growth, latest quarter, at least", unit: "%", hint: "against the same quarter a year earlier", col: "sgq", op: "min", param: "sales_growth_min", lo: -100, hi: 100000 },
  { key: "profitQg", step: 1, label: "Profit growth, latest quarter, at least", unit: "%", hint: "against the same quarter a year earlier", col: "pgq", op: "min", param: "profit_growth_min", lo: -100000, hi: 100000 },
  { key: "growthUp", step: 1, label: GROWTH_LABEL, unit: "", hint: GROWTH_HINT, col: "gs", op: "flag", param: "growth_up_3y" },
  { key: "roe", step: 2, label: "Return on equity at least", unit: "%", hint: "profit for each ₹100 owners have in the company", col: "roe", op: "min", param: "roe_min", lo: -1000, hi: 1000 },
  { key: "roce", step: 2, label: "Return on capital employed (ROCE) at least", unit: "%", hint: "annual, calculated by RedixFi", col: "roce", op: "min", param: "roce_min", lo: -1000, hi: 1000 },
  { key: "de", step: 3, label: "Debt to equity at most", unit: "times", hint: "what it owes compared with what owners put in", col: "de", op: "max", param: "de_max", lo: 0, hi: 100000 },
  { key: "pledge", step: 3, label: "Promoter pledge at most", unit: "% of promoter holding", hint: "latest disclosure", col: "pl", op: "max", param: "pledge_max", lo: 0, hi: 100 },
  { key: "volRatio", step: 4, label: "Volume vs usual at least", unit: "times", hint: "last 5 days against the 20 days before", col: "vr", op: "min", param: "volume_ratio_min", lo: 0, hi: 20 },
  { key: "delivery", step: 4, label: "Delivery at least", unit: "%", hint: "share of traded shares taken for delivery", col: "dl", op: "min", param: "delivery_pct_min", lo: 0, hi: 100 },
  { key: "pe", step: 5, label: "P/E at most", unit: "times", hint: "price over the last 12 months of profit per share", col: "pe", op: "max", param: "pe_max", lo: 0, hi: 100000 },
  { key: "near52", step: 6, label: "Price within this % of its 52-week high", unit: "%", hint: "how far the latest price is below the highest price of the last 52 weeks", col: "h52", op: "max", param: "from_52w_max", lo: 0, hi: 100 },
  { key: "volDay", step: 6, label: "Latest day's volume at least", unit: "times its 20-day average", hint: "shares traded on the latest trading day, against the average of the 20 days before it", col: "vd", op: "min", param: "volume_day_min", lo: 0, hi: 1000 },
];

export const num = (v: string): number | undefined => {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Whether a typed value is a usable number for this rule (a number, a whole number where one is needed, inside the range the server accepts). */
export function validValue(d: RuleDef, text: string): boolean {
  const n = num(text);
  if (n === undefined) return false;
  if (d.int && !Number.isInteger(n)) return false;
  if (d.lo !== undefined && n < d.lo) return false;
  if (d.hi !== undefined && n > d.hi) return false;
  return true;
}
/** The short line shown under an input when what was typed cannot be used (nothing is applied until it is fixed). */
export function ruleProblem(d: RuleDef, text: string): string | null {
  if (text.trim() === "" || validValue(d, text)) return null;
  if (num(text) === undefined) return "Enter a number. This is not used yet.";
  const range = d.lo !== undefined && d.hi !== undefined ? `${d.int ? "a whole number" : "a number"} from ${d.lo.toLocaleString("en-IN")} to ${d.hi.toLocaleString("en-IN")}` : "a different number";
  return `Enter ${range}. This is not used yet.`;
}
/** A rule that is switched on. Price behaviour (calmer / more active) is handled beside the table-driven rules. */
export const isOn = (r: Rules, d: RuleDef): boolean => (d.op === "gt0" || d.op === "flag" ? r[d.key] === true : validValue(d, r[d.key] as string));
/** Price change over 1, 3 or 6 months: both the period and a number are needed (a period alone, or a number alone, is not a rule). */
export const chgOn = (r: Rules): boolean => (r.chgMonths === "1" || r.chgMonths === "3" || r.chgMonths === "6") && num(r.chgMin) !== undefined && (num(r.chgMin) as number) >= -100 && (num(r.chgMin) as number) <= 100000;
export const avgOn = (r: Rules): boolean => r.avgDays === "50" || r.avgDays === "200";
export const volOn = (r: Rules): boolean => r.vol !== "" && num(r.volNum) !== undefined && (num(r.volNum) as number) >= 0 && (num(r.volNum) as number) <= 100;

type Test = { col: string; ok: (v: number) => boolean };
export function activeTests(r: Rules, upToStep: number): Test[] {
  const out: Test[] = [];
  for (const d of RULES) {
    if (d.step > upToStep || !isOn(r, d)) continue;
    if (d.op === "gt0") out.push({ col: d.col, ok: (v) => v > 0 });
    else if (d.op === "flag") out.push({ col: d.col, ok: (v) => v === 1 });
    else {
      const n = num(r[d.key] as string) as number;
      out.push({ col: d.col, ok: d.op === "min" ? (v) => v >= n : (v) => v <= n });
    }
  }
  if (upToStep >= 4 && volOn(r)) {
    const n = num(r.volNum) as number;
    out.push({ col: "vol", ok: r.vol === "calmer" ? (v) => v <= n : (v) => v >= n });
  }
  if (upToStep >= 6) {
    if (chgOn(r)) out.push({ col: `r${r.chgMonths}`, ok: (v) => v >= (num(r.chgMin) as number) });
    if (avgOn(r)) out.push({ col: `a${r.avgDays}`, ok: (v) => v === 1 });
  }
  return out;
}

function indexOf(data: LadderData): Record<string, number> {
  const m: Record<string, number> = {};
  data.cols.forEach((c, i) => {
    m[c] = i;
  });
  return m;
}

/** How many stocks pass every rule set in steps 0..upToStep. A stock with no figure for a rule that is on does not pass it, as on the server. */
export function countAfter(data: LadderData, r: Rules, upToStep: number): number {
  const idx = indexOf(data);
  const tests = activeTests(r, upToStep).map((t) => ({ i: idx[t.col], ok: t.ok }));
  if (tests.some((t) => t.i === undefined)) return 0;
  let n = 0;
  for (const row of data.rows) {
    let pass = true;
    for (const t of tests) {
      const v = row[t.i];
      if (v === null || v === undefined || !t.ok(v)) {
        pass = false;
        break;
      }
    }
    if (pass) n += 1;
  }
  return n;
}

/** Counts after steps 0..6 (the last one is the count after every rule). */
export function countsByStep(data: LadderData, r: Rules): number[] {
  return [0, 1, 2, 3, 4, 5, 6].map((s) => countAfter(data, r, s));
}

/** Stocks with no ROCE figure among those meeting every other rule that is on (the "left out of this filter" line), and how many of those are banks, insurers or finance companies. */
export function roceGap(data: LadderData, r: Rules): { noFigure: number; notApplicable: number } {
  const idx = indexOf(data);
  const tests = activeTests(r, 6)
    .filter((t) => t.col !== "roce")
    .map((t) => ({ i: idx[t.col], ok: t.ok }));
  let noFigure = 0;
  let notApplicable = 0;
  for (const row of data.rows) {
    if (tests.some((t) => row[t.i] == null || !t.ok(row[t.i] as number))) continue;
    if (row[idx.roce] == null) {
      noFigure += 1;
      if (row[idx.rna] === 1) notApplicable += 1;
    }
  }
  return { noFigure, notApplicable };
}

/** Stocks with fewer than four annual figures (no answer for the growth rule) among those meeting every other rule that is on: the "left out of this rule" line. */
export function growthGap(data: LadderData, r: Rules): number {
  const idx = indexOf(data);
  if (idx.gs === undefined) return 0;
  const tests = activeTests(r, 6)
    .filter((t) => t.col !== "gs")
    .map((t) => ({ i: idx[t.col], ok: t.ok }));
  let n = 0;
  for (const row of data.rows) {
    if (tests.some((t) => row[t.i] == null || !t.ok(row[t.i] as number))) continue;
    if (row[idx.gs] == null) n += 1;
  }
  return n;
}

/** The GET /signals parameters for the rules (the same rules the counts use). */
export function toParams(r: Rules): Partial<SignalsListParams> {
  const p: Record<string, number | boolean | undefined> = {};
  for (const d of RULES) {
    if (!isOn(r, d)) continue;
    p[d.param] = d.op === "gt0" || d.op === "flag" ? true : (num(r[d.key] as string) as number);
  }
  if (volOn(r)) p[r.vol === "calmer" ? "volatility_max" : "volatility_min"] = num(r.volNum) as number;
  if (chgOn(r)) {
    p.price_change_months = Number(r.chgMonths);
    p.price_change_min = num(r.chgMin) as number;
  }
  if (avgOn(r)) p.above_avg_days = Number(r.avgDays);
  return p as Partial<SignalsListParams>;
}

/** The rules back from a saved screen (anything the ladder has no rule for is ignored). */
export function fromParams(p: SharedScreenParams | Record<string, unknown>): Rules {
  const q = p as Record<string, unknown>;
  const out: Record<string, unknown> = { ...EMPTY_RULES };
  const s = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? String(v) : "");
  for (const d of RULES) {
    const v = q[d.param];
    out[d.key] = d.op === "gt0" || d.op === "flag" ? v === true : s(v);
  }
  if (typeof q.volatility_max === "number") {
    out.vol = "calmer";
    out.volNum = String(q.volatility_max);
  } else if (typeof q.volatility_min === "number") {
    out.vol = "active";
    out.volNum = String(q.volatility_min);
  }
  if ((q.price_change_months === 1 || q.price_change_months === 3 || q.price_change_months === 6) && typeof q.price_change_min === "number" && Number.isFinite(q.price_change_min)) {
    out.chgMonths = String(q.price_change_months);
    out.chgMin = String(q.price_change_min);
  }
  if (q.above_avg_days === 50 || q.above_avg_days === 200) out.avgDays = String(q.above_avg_days);
  return out as unknown as Rules;
}

export const hasAnyRule = (r: Rules): boolean => RULES.some((d) => isOn(r, d)) || volOn(r) || chgOn(r) || avgOn(r);

/** Every rule that is switched on, as one plain line each (for the read-only "Rules applied" card and the saved-rule summary). Empty when no rule is on. */
export function describeRules(r: Rules): string[] {
  const out: string[] = [];
  for (const d of RULES) {
    if (!isOn(r, d)) continue;
    if (d.op === "gt0" || d.op === "flag") out.push(d.label.replace(/\.$/, ""));
    else out.push(`${d.label} ${num(r[d.key] as string)}${d.unit ? ` ${d.unit}` : ""}`);
  }
  if (volOn(r)) out.push(`Day-to-day price swings: ${r.vol === "calmer" ? "calmer, swung more than at most" : "more active, swung more than at least"} ${num(r.volNum)}% of stocks`);
  if (chgOn(r)) out.push(`Price change over ${r.chgMonths} ${r.chgMonths === "1" ? "month" : "months"} at least ${num(r.chgMin)}%`);
  if (avgOn(r)) out.push(`Price above its ${r.avgDays}-day average`);
  return out;
}

/** Whether two sets of rules switch on the same rules with the same values (a typed value that is not used yet does not count). */
export function sameRules(a: Rules, b: Rules): boolean {
  return JSON.stringify(toParams(a)) === JSON.stringify(toParams(b));
}

// ---- the steps (copy) -------------------------------------------------------------------------------------------------------------------
export interface StepDef {
  n: number;
  title: string;
  /** One plain line under the name (the same as on the Learn tab). */
  line: string;
}
export const STEPS: StepDef[] = [
  { n: 0, title: "Size and trading", line: "How big the company is and how much of its stock changes hands." },
  { n: 1, title: "Earnings", line: "Whether the company made a profit, and whether its sales and profit grew." },
  { n: 2, title: "Returns", line: "How much profit the company made for the money put into it." },
  { n: 3, title: "Debt and pledge", line: "How much the company owes, and how much of the promoters' shares are pledged to lenders." },
  { n: 4, title: "Price movement", line: "How much the price moved lately, and how much was traded." },
  { n: 5, title: "Price you pay", line: "How the price compares with the profit per share." },
  { n: 6, title: "Price and volume", line: "How the price has moved over past months, and how much was traded on the latest day." },
];

/** The four "Price and volume" filters: a plain label, one plain line and an example for the field, and (folded away) what it tells you and what it does not tell you. Past prices and volume only. */
export const PV_FILTERS = [
  { id: "chg", label: "Price change over a past period", line: "Choose 1, 3 or 6 months, then the least change in the price you want.", example: "e.g. 3 months, at least 10 %", tells: "How far the price moved over that time, from past closing prices.", not: "It is not a prediction and not advice." },
  { id: "near52", label: "Price close to its 52-week high", line: "How far the price may be below the highest price of the last 52 weeks.", example: "e.g. within 10 %", tells: "How close the latest price is to the highest price of the last 52 weeks.", not: "It is not a prediction and not advice." },
  { id: "avg", label: "Price above its average price", line: "Choose the average of the last 50 or the last 200 closing prices. The latest price must be above it.", example: "e.g. the 200-day average", tells: "Whether the latest closing price is above the average of the last 50 or 200 closing prices.", not: "It is not a prediction and not advice." },
  { id: "volDay", label: "Shares traded on the latest day", line: "How many times its 20-day average volume was traded on the latest day. The average is of the 20 days before.", example: "e.g. at least 1.5 times its 20-day average", tells: "How many shares traded on the latest trading day, compared with the average of the 20 days before it.", not: "It is not a prediction and not advice." },
] as const;
export const PV_FOLD = "What this tells you and what it does not";
export const PV_AS_OF = (d: string): string => `Prices as of ${d}`;
// ---- the shortlist ------------------------------------------------------------------------------------------------------------------------
export const SORT_CHOICES: { value: string; label: string; order: "asc" | "desc" }[] = [
  { value: "name", label: "Name, A to Z", order: "asc" },
  { value: "market_cap", label: "Market value, largest first", order: "desc" },
  { value: "roe", label: "Return on equity, highest first", order: "desc" },
  { value: "roce", label: "ROCE, highest first", order: "desc" },
  { value: "pe", label: "P/E, lowest first", order: "asc" },
  { value: "de", label: "Debt to equity, lowest first", order: "asc" },
];
export const LIST_PAGE_SIZE = 12;

/** Plain value of each rule that is on, for a result card, from the row the Screener returns. */
export function cardValues(r: Rules, row: Record<string, unknown>): { label: string; value: string }[] {
  const n = (k: string) => (typeof row[k] === "number" ? (row[k] as number) : null);
  const f1 = (v: number | null, suf = "") => (v === null ? "Not available" : `${(Math.round(v * 10) / 10).toLocaleString("en-IN")}${suf}`);
  const out: { label: string; value: string }[] = [];
  const add = (label: string, value: string) => out.push({ label, value });
  if (num(r.mcMin) !== undefined) add("Market value", n("market_cap") === null ? "Not available" : `₹${Math.round(n("market_cap") as number).toLocaleString("en-IN")} cr`);
  if (r.profitQ) add("Profit in the latest quarter", n("eps") === null ? "Not available" : (n("eps") as number) > 0 ? "Yes" : "No");
  if (num(r.profitYears) !== undefined) add("Profit in the last 5 years", n("profit_years") === null ? "Not available" : `${n("profit_years")} of 5 years`);
  if (num(r.sales3) !== undefined) add("Sales growth, 3 years", f1(n("sales_cagr_3y_pct"), "% a year"));
  if (num(r.profit3) !== undefined) add("Profit growth, 3 years", f1(n("profit_cagr_3y_pct"), "% a year"));
  if (r.growthUp) add("Sales and profit higher 3 years in a row", row["both_up_3y"] === true ? "Yes" : row["both_up_3y"] === false ? "No" : "Not available");
  if (num(r.salesQ) !== undefined) add("Sales growth, quarter", f1(n("sales_growth_pct"), "%"));
  if (num(r.profitQg) !== undefined) add("Profit growth, quarter", f1(n("profit_growth_pct"), "%"));
  if (num(r.roe) !== undefined) add("ROE", f1(n("roe"), "%"));
  if (num(r.roce) !== undefined) add("ROCE", f1(n("roce"), "%"));
  if (num(r.de) !== undefined) add("Debt to equity", f1(n("de")));
  if (num(r.pledge) !== undefined) add("Promoter pledge", f1(n("pledge_pct"), "%"));
  if (volOn(r)) add("Swung more than", f1(n("vol_pct_more"), "% of stocks"));
  if (num(r.volRatio) !== undefined) add("Volume vs usual", f1(n("volume_ratio_5d"), "x"));
  if (num(r.delivery) !== undefined) add("Delivery", f1(n("delivery_pct"), "%"));
  if (num(r.pe) !== undefined) add("P/E", f1(n("pe")));
  if (chgOn(r)) add(`Price change, ${r.chgMonths} ${r.chgMonths === "1" ? "month" : "months"}`, f1(n(`ret_${r.chgMonths}m`), "%"));
  if (num(r.near52) !== undefined) add("Below 52-week high", f1(n("pct_below_52w_high"), "%"));
  if (avgOn(r)) add(`Above ${r.avgDays}-day average`, row[`sma${r.avgDays}_above`] === true ? "Yes" : row[`sma${r.avgDays}_above`] === false ? "No" : "Not available");
  if (num(r.volDay) !== undefined) add("Latest volume vs 20-day average", f1(n("vol_day_x"), "x"));
  return out;
}

/** The Screener row carries the promoter pledge only when asked for it. */
export const needsPledge = (r: Rules): boolean => num(r.pledge) !== undefined;

/** The saved-rule values of a step (for the one line under a saved rule): how many rules are set. */
export const rulesSetCount = (r: Rules): number => describeRules(r).length;

/** "Fill typical values": every field with a published typical number is filled; a field with none stays blank. Returns new rules (the sort and everything else are not touched). */
export const typicalRules = (): Rules => ({ ...COMMON_RULES });

/** How many rules are set in one step (0 to 6), for the "N set" mark on the step list. */
export function stepSetCount(r: Rules, step: number): number {
  let n = RULES.filter((d) => d.step === step && isOn(r, d)).length;
  if (step === 4 && volOn(r)) n += 1;
  if (step === 6) n += (chgOn(r) ? 1 : 0) + (avgOn(r) ? 1 : 0);
  return n;
}
