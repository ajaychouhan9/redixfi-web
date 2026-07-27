import type { CompareRow } from "@/lib/api/types";

// Maps each compare-table row to the ONE metric_explainers.json placeholder
// its own formatted value fills best. The compare table only carries a
// single pre-formatted display string per cell (not every raw sub-field an
// explainer's "short" text references — e.g. delivery_avg20, sector_count,
// promoter_pct/fii_pct/mf_pct as ownership LEVELS rather than QoQ change).
// ExplainTerm's interpolate() drops any placeholder it isn't given rather
// than printing "undefined", so the explainer still reads as a clean
// sentence with just the one live figure injected — a deliberate, honest
// simplification rather than a broken one.
const PRIMARY_PLACEHOLDER: Record<string, string> = {
  composite_score: "composite_score",
  delta_1d: "delta_1d",
  trend_10d_pct: "trend_10d_pct",
  delivery_pct: "delivery_pct",
  volume_ratio_5d: "volume_ratio",
  sector_rank: "sector_rank",
  pcr: "pcr",
  event_risk: "event_risk_state",
  pe_ttm: "pe_ttm",
  roe: "roe",
  revenue_yoy_pct: "revenue_yoy_pct",
  margin_trend: "opm_pct",
  debt_to_equity: "debt_to_equity",
  promoter_change_qoq: "promoter_pct",
  fii_change_qoq: "fii_pct",
  market_cap: "market_cap",
  next_results_date: "next_results_date",
};

export function compareExplainerCtx(row: CompareRow, symbol: string): Record<string, string> {
  const ctx: Record<string, string> = { symbol };
  const placeholderKey = PRIMARY_PLACEHOLDER[row.key];
  const value = row.values[symbol];
  if (placeholderKey && value && value !== "Not available") {
    ctx[placeholderKey] = value;
  }
  return ctx;
}
