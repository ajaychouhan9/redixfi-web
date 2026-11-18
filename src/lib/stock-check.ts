// "The 15-Minute Stock Check" (19 Nov 2026): the shortlist ladder as plain, testable data and functions. No React here.
// The ladder counts stocks in the browser from ONE anonymous figures file (GET /ladder-data: numbers only, no symbol or name), so a
// count never needs a server call per step. The shortlist with names still comes from GET /signals (same rules, same server tests).
import type { SignalsListParams } from "@/lib/api/endpoints";
import type { SharedScreenParams } from "@/lib/api/types";

export const PAGE_TITLE = "The 15-Minute Stock Check";
export const PAGE_SUBTITLE = "Stock analysis, simplified.";
export const SEO_TITLE = "How to Analyse a Stock in 15 Minutes | RedixFi";
export const MENU_LABEL = "Stock Check";
export const HOME_BUTTON = "New to stocks? Start the 15-minute check";
export const STOCK_BUTTON = "Run the 15-minute check";
export const LADDER_TITLE = "Build Your Shortlist";
export const LADDER_INTRO = "Set the rules that matter to you, one step at a time. The bar that stays on screen shows how many stocks are left after your rules.";
export const COMMON_LABEL = "Common rules from published methods. Change them.";
export const START_COMMON = "Start with common rules";
export const CLEAR_ALL = "Clear all";
export const PAST_LINE = "Filters use past reported numbers. They do not tell what happens next.";
export const RESULTS_TITLE = "Your shortlist";
export const RESULTS_LEAD = "Stocks that meet the rules you chose, listed A to Z unless you choose a column to sort by. We do not rank them.";
export const SHOW_BUTTON = "Show stocks that meet my rules";
export const PRICE_NOTE = "A good company can still be priced high.";
export const COMPARE_NOTE = "Compare a company with others of its own kind.";
export const NUMBERS_AS_OF = (date: string) => `Numbers as of ${date}`;

export const BANK_NOTE =
  "ROCE is not shown for banks, insurers and finance companies. Their business is borrowing and lending money, so the ROCE formula does not work for them.";
export const BANK_WHY_LABEL = "Why?";
export const BANK_WHY =
  "ROCE asks: for every Rs 100 put into the business, how much operating profit did it earn? That works for a company that makes or sells things, because interest it pays is a separate cost of raising money. A bank is different. It takes money from depositors and lends it out. Deposits are what it works with, and the interest it pays is part of its day-to-day cost, like steel for a car maker. So there is no clean profit before interest, and most of its liabilities are deposits. The result would look like a number but would not mean the same thing. Banks and finance companies are usually read with other measures: return on equity, return on assets, bad loans and the gap between what they earn on loans and pay on deposits. Return on equity is shown on this page. The others are not on the page yet.";

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
  roe: string;
  roce: string;
  de: string;
  pledge: string;
  vol: "" | "calmer" | "active";
  volNum: string;
  volRatio: string;
  delivery: string;
  pe: string;
}
export const EMPTY_RULES: Rules = {
  mcMin: "", profitQ: false, profitYears: "", sales3: "", profit3: "", salesQ: "", profitQg: "",
  roe: "", roce: "", de: "", pledge: "", vol: "", volNum: "", volRatio: "", delivery: "", pe: "",
};
/** Common starting values (editable). Price behaviour and P/E are left empty: they are choices, not common rules. */
export const COMMON_RULES: Rules = { ...EMPTY_RULES, mcMin: "1000", profitQ: true, profitYears: "5", sales3: "10", roe: "15", roce: "15", de: "1", pledge: "10" };

export interface RuleDef {
  key: keyof Rules;
  step: number;
  label: string;
  unit: string;
  hint: string;
  col: string;
  op: "min" | "max" | "gt0";
  /** The GET /signals (and saved-screen) parameter this rule sends. */
  param: string;
  max?: number;
}
export const RULES: RuleDef[] = [
  { key: "mcMin", step: 0, label: "Market value at least", unit: "₹ crore", hint: "shares × price", col: "mc", op: "min", param: "market_cap_min" },
  { key: "profitQ", step: 1, label: "Profit in the latest quarter", unit: "", hint: "earnings per share above zero", col: "eps", op: "gt0", param: "eps_positive" },
  { key: "profitYears", step: 1, label: "Profit in at least this many of the last 5 years", unit: "of 5", hint: "5 means every one of the last five years", col: "py", op: "min", param: "profit_years_min", max: 5 },
  { key: "sales3", step: 1, label: "Sales growth over 3 years at least", unit: "% a year", hint: "compound, from annual figures", col: "sg3", op: "min", param: "sales_cagr_3y_min" },
  { key: "profit3", step: 1, label: "Profit growth over 3 years at least", unit: "% a year", hint: "compound, from annual figures", col: "pg3", op: "min", param: "profit_cagr_3y_min" },
  { key: "salesQ", step: 1, label: "Sales growth, latest quarter, at least", unit: "%", hint: "against the same quarter a year earlier", col: "sgq", op: "min", param: "sales_growth_min" },
  { key: "profitQg", step: 1, label: "Profit growth, latest quarter, at least", unit: "%", hint: "against the same quarter a year earlier", col: "pgq", op: "min", param: "profit_growth_min" },
  { key: "roe", step: 2, label: "Return on equity at least", unit: "%", hint: "profit for each ₹100 owners have in the company", col: "roe", op: "min", param: "roe_min" },
  { key: "roce", step: 2, label: "Return on capital employed (ROCE) at least", unit: "%", hint: "annual, calculated by RedixFi", col: "roce", op: "min", param: "roce_min" },
  { key: "de", step: 3, label: "Debt to equity at most", unit: "times", hint: "what it owes compared with what owners put in", col: "de", op: "max", param: "de_max" },
  { key: "pledge", step: 3, label: "Promoter pledge at most", unit: "% of promoter holding", hint: "latest disclosure", col: "pl", op: "max", param: "pledge_max" },
  { key: "volRatio", step: 4, label: "Volume vs usual at least", unit: "times", hint: "last 5 days against the 20 days before", col: "vr", op: "min", param: "volume_ratio_min" },
  { key: "delivery", step: 4, label: "Delivery at least", unit: "%", hint: "share of traded shares taken for delivery", col: "dl", op: "min", param: "delivery_pct_min" },
  { key: "pe", step: 5, label: "P/E at most", unit: "times", hint: "price over the last 12 months of profit per share", col: "pe", op: "max", param: "pe_max" },
];

export const num = (v: string): number | undefined => {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** A rule that is switched on. Price behaviour (calmer / more active) is handled beside the table-driven rules. */
export const isOn = (r: Rules, d: RuleDef): boolean => (d.op === "gt0" ? r[d.key] === true : num(r[d.key] as string) !== undefined);
export const volOn = (r: Rules): boolean => r.vol !== "" && num(r.volNum) !== undefined;

type Test = { col: string; ok: (v: number) => boolean };
export function activeTests(r: Rules, upToStep: number): Test[] {
  const out: Test[] = [];
  for (const d of RULES) {
    if (d.step > upToStep || !isOn(r, d)) continue;
    if (d.op === "gt0") out.push({ col: d.col, ok: (v) => v > 0 });
    else {
      const n = num(r[d.key] as string) as number;
      out.push({ col: d.col, ok: d.op === "min" ? (v) => v >= n : (v) => v <= n });
    }
  }
  if (upToStep >= 4 && volOn(r)) {
    const n = num(r.volNum) as number;
    out.push({ col: "vol", ok: r.vol === "calmer" ? (v) => v <= n : (v) => v >= n });
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

/** Counts after steps 0..5 (step 6 has no rules). */
export function countsByStep(data: LadderData, r: Rules): number[] {
  return [0, 1, 2, 3, 4, 5].map((s) => countAfter(data, r, s));
}

/** Stocks with no ROCE figure among those meeting every other rule that is on (the "left out of this filter" line), and how many of those are banks, insurers or finance companies. */
export function roceGap(data: LadderData, r: Rules): { noFigure: number; notApplicable: number } {
  const idx = indexOf(data);
  const tests = activeTests(r, 5)
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

/** The GET /signals parameters for the rules (the same rules the counts use). */
export function toParams(r: Rules): Partial<SignalsListParams> {
  const p: Record<string, number | boolean | undefined> = {};
  for (const d of RULES) {
    if (!isOn(r, d)) continue;
    p[d.param] = d.op === "gt0" ? true : (num(r[d.key] as string) as number);
  }
  if (volOn(r)) p[r.vol === "calmer" ? "volatility_max" : "volatility_min"] = num(r.volNum) as number;
  return p as Partial<SignalsListParams>;
}

/** The rules back from a saved screen (anything the ladder has no rule for is ignored). */
export function fromParams(p: SharedScreenParams | Record<string, unknown>): Rules {
  const q = p as Record<string, unknown>;
  const out: Record<string, unknown> = { ...EMPTY_RULES };
  const s = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? String(v) : "");
  for (const d of RULES) {
    const v = q[d.param];
    out[d.key] = d.op === "gt0" ? v === true : s(v);
  }
  if (typeof q.volatility_max === "number") {
    out.vol = "calmer";
    out.volNum = String(q.volatility_max);
  } else if (typeof q.volatility_min === "number") {
    out.vol = "active";
    out.volNum = String(q.volatility_min);
  }
  return out as unknown as Rules;
}

export const hasAnyRule = (r: Rules): boolean => RULES.some((d) => isOn(r, d)) || volOn(r);

// ---- the steps (copy) -------------------------------------------------------------------------------------------------------------------
export interface StepDef {
  n: number;
  title: string;
  why: string;
}
export const STEPS: StepDef[] = [
  { n: 0, title: "Size and trading", why: "Very small companies can be hard to trade at the price you see, and their numbers can jump around. A minimum market value leaves out the smallest ones. Market value describes size, not quality." },
  { n: 1, title: "Is it earning?", why: "A company that makes a profit year after year has more room to pay its costs, repay loans and keep running. These rules look at the latest quarter, the last five years and growth over three years. A profit in the past does not promise one in the future." },
  { n: 2, title: "Is it using money well?", why: "Return on equity asks how much profit a company earned for each ₹100 its owners have in it. ROCE asks how much operating profit it earned for each ₹100 put into the business. " + COMPARE_NOTE },
  { n: 3, title: "Is it safe?", why: "Debt has to be paid back whatever the company earns. Debt to equity compares what it owes with what its owners put in. Promoter pledge shows how much of the promoters' holding is pledged to lenders as security." },
  { n: 4, title: "How does the price behave?", why: "Two neutral options: calmer means the price has moved less than most stocks lately, more active means it has moved more. Bigger swings can go either way. Volume vs usual and delivery % describe how much trading there was and how much of it ended in delivery." },
  { n: 5, title: "What you pay (optional)", why: "P/E is the price divided by the profit per share over the last 12 months. " + PRICE_NOTE + " A low P/E does not make a company a good one." },
];
export const STEP6_TITLE = "Read the rest with Ask AI";
export const STEP6_WHY = "Rules cannot read a company's filings. For each company on your shortlist, Ask AI can list the points to watch, what management said and the last three years of numbers, with sources.";

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
  if (num(r.salesQ) !== undefined) add("Sales growth, quarter", f1(n("sales_growth_pct"), "%"));
  if (num(r.profitQg) !== undefined) add("Profit growth, quarter", f1(n("profit_growth_pct"), "%"));
  if (num(r.roe) !== undefined) add("ROE", f1(n("roe"), "%"));
  if (num(r.roce) !== undefined) add("ROCE", f1(n("roce"), "%"));
  if (num(r.de) !== undefined) add("Debt to equity", f1(n("de")));
  if (num(r.pledge) !== undefined) add("Promoter pledge", f1(n("pledge_pct"), "%"));
  if (volOn(r)) add("More volatile than", f1(n("vol_pct_more"), "% of stocks"));
  if (num(r.volRatio) !== undefined) add("Volume vs usual", f1(n("volume_ratio_5d"), "x"));
  if (num(r.delivery) !== undefined) add("Delivery", f1(n("delivery_pct"), "%"));
  if (num(r.pe) !== undefined) add("P/E", f1(n("pe")));
  return out;
}

/** The Screener row carries the promoter pledge only when asked for it. */
export const needsPledge = (r: Rules): boolean => num(r.pledge) !== undefined;
