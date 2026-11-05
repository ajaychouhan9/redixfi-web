import type { SectorSummaryRow } from "@/lib/api/types";

/**
 * The threshold for an industry to appear in the Highest/Lowest lists.
 * One config value, overridable at build time.
 */
export const INDUSTRY_MIN_STOCKS = Math.max(
  1,
  Number(process.env.NEXT_PUBLIC_INDUSTRY_MIN_STOCKS ?? 3) || 3,
);

export function qualifyingIndustries(rows: SectorSummaryRow[]): SectorSummaryRow[] {
  return rows.filter((row) => Number(row.count) >= INDUSTRY_MIN_STOCKS);
}
