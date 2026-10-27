import type { SmartScreenFilters } from "@/lib/api/types";

/** The subset of AI-parsed filters that the one manual filter bar can express. */
export interface SmartFilterPatch {
  sector: string | null;
  score_min: number | null;
  score_max: number | null;
  from_52w_max: number | null;
  from_52w_min: number | null;
  volatility_band: "lower" | "lower_middle" | "upper_middle" | "higher" | null;
  volatility_min: number | null;
  volatility_max: number | null;
  volume_ratio_min: number | null;
  delivery_state: "above_avg" | "below_avg" | null;
  delta_1d_min: number | null;
  dma_state: "above_20dma" | "below_20dma" | null;
  pcr_band: "low" | "neutral" | "high" | null;
  anomaly: boolean | null;
  event_risk: boolean | null;
  watchlist_only: boolean | null;
}

export function toFilterPatch(f: SmartScreenFilters): SmartFilterPatch {
  return {
    sector: f.sector,
    score_min: f.score_min,
    score_max: f.score_max,
    from_52w_max: f.from_52w_max,
    from_52w_min: f.from_52w_min,
    volatility_band: f.volatility_band,
    volatility_min: f.volatility_min,
    volatility_max: f.volatility_max,
    volume_ratio_min: f.volume_ratio_min,
    delivery_state: f.delivery_state === "above_avg" || f.delivery_state === "below_avg" ? f.delivery_state : null,
    delta_1d_min: f.delta_1d_min,
    dma_state: f.dma_state === "above_20dma" || f.dma_state === "below_20dma" ? f.dma_state : null,
    pcr_band: f.pcr_band === "low" || f.pcr_band === "neutral" || f.pcr_band === "high" ? f.pcr_band : null,
    anomaly: f.anomaly,
    event_risk: f.event_risk,
    watchlist_only: f.watchlist_only,
  };
}

export function hasAnyFilter(p: SmartFilterPatch): boolean {
  return Object.values(p).some((v) => v !== null && v !== undefined);
}

/** True when the only recognized AI filter is one the manual bar cannot show. */
export function hasOnlyUnsupported(f: SmartScreenFilters): boolean {
  return Boolean(f.vwap_side) && !hasAnyFilter(toFilterPatch(f));
}
