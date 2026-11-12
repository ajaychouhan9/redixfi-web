import type { ResearchDetail } from "@/lib/api/types";
import { quarterDate } from "@/lib/seo/stock-facts";

/** The 8 reported figures the public stock page shows. A figure counts as available when the stored record has a value for it. */
export function fundamentalsCoverage(f: ResearchDetail["fundamentals"] | null | undefined): { available: number; total: number; missing: string[] } {
  const v = f?.valuation;
  const q = f?.quarterly;
  const sh = f?.shareholding;
  const checks: [string, unknown][] = [
    ["P/E", v?.pe_ttm],
    ["return on equity", v?.roe_ttm],
    ["price to book", v?.pb],
    ["debt to equity", v?.debt_to_equity],
    ["quarterly revenue", q?.revenue],
    ["quarterly net profit", q?.pat],
    ["quarterly EPS", q?.eps],
    ["promoter holding", sh?.promoter_pct],
  ];
  const missing = checks.filter(([, x]) => x === null || x === undefined).map(([k]) => k);
  return { available: checks.length - missing.length, total: checks.length, missing };
}

function shortDay(ymd: string | null | undefined): string | null {
  if (!ymd || ymd.length < 10) return null;
  const d = new Date(`${ymd.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** For example: "Fundamentals: 30 Sep 2026 quarter, fetched 11 Nov; 6 of 8 figures available (not available: P/E, price to book)." */
export function coverageLine(f: ResearchDetail["fundamentals"] | null | undefined): string {
  if (!f) return "Fundamentals: no reported figures are stored for this stock.";
  const c = fundamentalsCoverage(f);
  const quarter = f.quarterly?.latest_quarter_end ? `${quarterDate(f.quarterly.latest_quarter_end)} quarter` : "quarter not recorded";
  const fetched = shortDay(f.fetched_on);
  const missing = c.missing.length ? ` (not available: ${c.missing.join(", ")})` : "";
  return `Fundamentals: ${quarter}${fetched ? `, fetched ${fetched}` : ""}; ${c.available} of ${c.total} figures available${missing}.`;
}
