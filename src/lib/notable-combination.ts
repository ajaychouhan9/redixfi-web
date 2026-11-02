/**
 * "Notable combination": one factual sentence when two measured readings point different ways, by rule. It replaces the AI "Tension in the data" card:
 * the same five rules and thresholds as data-pipeline/measured_signals_builder.py::detect_conflicts (10-session move of 3.0% or more, delivery against
 * its 20-day average at 0.85 / 1.25, volume at or below 0.7x its norm, sector rank in the top or bottom 4, options positioning at 0.7 / 1.3, a flat move
 * under 1.5%), facts only, with no reading of what the combination means. No model is called.
 */
export interface CombinationInput {
  trend_10d_pct: number | null | undefined;
  delivery_pct: number | null | undefined;
  delivery_avg20: number | null | undefined;
  volume_ratio_5d: number | null | undefined;
  pcr: number | null | undefined;
  pcr_available: boolean | null | undefined;
  sector_rank: number | null | undefined;
  sector_count: number | null | undefined;
}

export const TREND_STATE_PCT = 3.0;
export const DELIVERY_RATIO_HI = 1.25;
export const DELIVERY_RATIO_LO = 0.85;
export const VOLUME_THIN = 0.7;
export const SECTOR_EDGE = 4;
export const PCR_HI = 1.3;
export const PCR_LO = 0.7;
export const FLAT_TREND_PCT = 1.5;

const ok = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** The first matching sentence, or null. Order: price vs delivery, price vs volume, stock vs sector, price vs options, delivery vs a flat price. */
export function notableCombination(i: CombinationInput): string | null {
  const t = i.trend_10d_pct;
  const dp = i.delivery_pct;
  const da = i.delivery_avg20;
  const dr = ok(dp) && ok(da) && da ? dp / da : null;
  const vr = i.volume_ratio_5d;
  const up = ok(t) && t >= TREND_STATE_PCT;
  const down = ok(t) && t <= -TREND_STATE_PCT;
  const a = (n: number) => Math.abs(n).toFixed(1);

  if (up && dr !== null && dr <= DELIVERY_RATIO_LO) return `Price rose ${a(t as number)}% over 10 sessions while delivery stayed below its 20-day average (${Math.round(dp as number)}% vs ${Math.round(da as number)}%).`;
  if (down && dr !== null && dr >= DELIVERY_RATIO_HI) return `Price fell ${a(t as number)}% over 10 sessions while delivery ran above its 20-day average (${Math.round(dp as number)}% vs ${Math.round(da as number)}%).`;
  if (ok(vr) && vr <= VOLUME_THIN) {
    if (up) return `Price rose ${a(t as number)}% over 10 sessions on volume well below its 20-day norm (${vr.toFixed(1)}x).`;
    if (down) return `Price fell ${a(t as number)}% over 10 sessions on volume well below its 20-day norm (${vr.toFixed(1)}x).`;
  }
  const rank = i.sector_rank;
  const cnt = i.sector_count;
  if (ok(rank) && ok(cnt) && cnt) {
    if (up && rank > cnt - SECTOR_EDGE) return `The stock rose ${a(t as number)}% over 10 sessions while its sector ranked ${rank} of ${cnt}.`;
    if (down && rank <= SECTOR_EDGE) return `The stock fell ${a(t as number)}% over 10 sessions while its sector ranked ${rank} of ${cnt}.`;
  }
  const pcr = i.pcr_available && ok(i.pcr) ? i.pcr : null;
  if (pcr !== null) {
    if (up && pcr <= PCR_LO) return `Price rose ${a(t as number)}% over 10 sessions while options positioning stayed call-heavy (PCR ${pcr.toFixed(2)}).`;
    if (down && pcr >= PCR_HI) return `Price fell ${a(t as number)}% over 10 sessions while options positioning stayed put-heavy (PCR ${pcr.toFixed(2)}).`;
  }
  if (ok(t) && Math.abs(t) < FLAT_TREND_PCT && dr !== null) {
    if (dr >= 1.3) return `Delivery strengthened well above its 20-day average (${Math.round(dp as number)}% vs ${Math.round(da as number)}%) while price stayed roughly flat (${t >= 0 ? "+" : "-"}${a(t)}%).`;
    if (dr <= 0.7) return `Delivery weakened well below its 20-day average (${Math.round(dp as number)}% vs ${Math.round(da as number)}%) while price stayed roughly flat (${t >= 0 ? "+" : "-"}${a(t)}%).`;
  }
  return null;
}
