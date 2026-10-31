/** Display name and one-line explanation of the composite measure (internal field names stay `composite_score`). */
export const READING_NAME = "Stock Condition";
export const READING_SHORT = "Reading";
export const READING_EXPLAINER = "Weighted combination of 8 measured readings. Not a probability, a rating or a forecast.";

/** "-5 vs previous session" / "+3 vs previous session"; null when there is no change figure. */
export function conditionChangeText(delta: number | null | undefined): string | null {
  if (delta === null || delta === undefined || Number.isNaN(delta)) return null;
  const v = Math.round(delta);
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)} vs previous session`;
}
