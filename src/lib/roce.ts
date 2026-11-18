// Return on capital employed, annual (19 Nov 2026). Pure helpers and the page copy, so the rules can be tested without a browser.
// The figure is calculated by RedixFi from annual statements (backend: data-pipeline/fundamentals_derived_builder.py, parse_roce).

export const ROCE_LABEL = "Return on capital employed (ROCE)";
export const ROCE_SOURCE = "Calculated by RedixFi from annual statements";
export const ROCE_HOW_TITLE = "How is this calculated?";
/** The formula line the page shows, word for word. */
export const ROCE_FORMULA =
  "Operating profit before exceptional items ÷ (total assets − current liabilities). Calculated by RedixFi from annual statements; may differ slightly from the company's own figure.";
export const ROCE_HOW_BODY =
  "For each financial year, take the operating profit before exceptional items and divide it by capital employed, which is total assets minus current liabilities at the year end. The result is shown as a percentage. Amounts are in ₹ crore, from the company's annual statements. Interest income and other income are not part of operating profit.";
export const ROCE_NOT_APPLICABLE = "Not applicable for banks, insurers and finance companies";
export const ROCE_CAUTION_ADVANCES = "Customer advances can distort this figure";
export const ROCE_NOT_AVAILABLE = "Not available";
export const ROCE_TABLE_TITLE = "ROCE, last five years";
/** The note on the data sources page. */
export const ROCE_DATA_NOTE =
  "ROCE (return on capital employed) is calculated by RedixFi from annual statements: operating profit before exceptional items divided by total assets minus current liabilities. It is not applicable to banks, insurers and finance companies, and a year is left empty when an input is missing.";

export interface RoceRow {
  fiscal_year: string | null;
  period_end: string;
  total_assets: number | null;
  current_liabilities: number | null;
  operating_profit_pre_exceptional: number | null;
  capital_employed: number | null;
  roce_pct: number | null;
}

/** The `roce` block of the stock's fundamentals (absent on records built before 19 Nov 2026). */
export interface RoceBlock {
  roce_applicable: boolean;
  roce_caution?: string | null;
  roce_pct: number | null;
  roce_year: string | null;
  roce_period_end?: string | null;
  series: RoceRow[];
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export type RoceState =
  | { kind: "figure"; value: string; year: string; caution: string | null }
  | { kind: "not_applicable" }
  | { kind: "missing" };

export const fy = (year: string | null | undefined): string | null => (year && /^\d{4}$/.test(String(year)) ? `FY${year}` : null);

/** What the stock page shows for the headline figure. */
export function roceState(roce: RoceBlock | null | undefined): RoceState {
  if (!roce) return { kind: "missing" };
  if (roce.roce_applicable === false) return { kind: "not_applicable" };
  const year = fy(roce.roce_year);
  if (!isNum(roce.roce_pct) || !year) return { kind: "missing" };
  const caution = roce.roce_caution === "customer_advances" ? ROCE_CAUTION_ADVANCES : null;
  return { kind: "figure", value: `${(Math.round(roce.roce_pct * 10) / 10).toFixed(1)}%`, year, caution };
}

const crore = (n: number | null | undefined): string => (isNum(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : ROCE_NOT_AVAILABLE);
const roundPct = (n: number | null | undefined): string => (isNum(n) ? `${(Math.round(n * 10) / 10).toFixed(1)}%` : ROCE_NOT_AVAILABLE);

/** The five-year table, newest year first. Empty for a stock where the figure does not apply or no year is stored. */
export function roceTableRows(roce: RoceBlock | null | undefined): string[][] {
  if (!roce || roce.roce_applicable === false) return [];
  return [...(roce.series ?? [])]
    .sort((a, b) => (a.period_end < b.period_end ? 1 : -1))
    .map((r) => [fy(r.fiscal_year) ?? r.period_end.slice(0, 4), crore(r.operating_profit_pre_exceptional), crore(r.capital_employed), roundPct(r.roce_pct)]);
}
export const ROCE_TABLE_HEAD = ["Year", "Operating profit", "Capital employed", "ROCE"];
export const ROCE_TABLE_NOTE = "Amounts in ₹ crore. Operating profit is before exceptional items; capital employed is total assets minus current liabilities.";

/** Screener cell text. */
export function roceCell(row: { roce?: number | null; roce_year?: string | null; roce_applicable?: boolean | null }): { primary: string; sub?: string } | null {
  if (row.roce_applicable === false) return { primary: "Not applicable" };
  if (!isNum(row.roce)) return null;
  const year = fy(row.roce_year);
  return { primary: roundPct(row.roce), ...(year ? { sub: year } : {}) };
}

/** The line under the Screener results when the ROCE filter is on. */
export function roceFilterNote(noFigure: number | null | undefined, notApplicable: number | null | undefined): string | null {
  if (!isNum(noFigure) || noFigure <= 0) return null;
  const n = noFigure.toLocaleString("en-IN");
  const na = isNum(notApplicable) && notApplicable > 0 ? ` (${notApplicable.toLocaleString("en-IN")} of them are banks, insurers or finance companies, where it does not apply)` : "";
  return `${n} ${noFigure === 1 ? "stock has" : "stocks have"} no ROCE figure and ${noFigure === 1 ? "is" : "are"} left out of this filter${na}.`;
}
