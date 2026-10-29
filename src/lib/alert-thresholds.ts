// Sensible thresholds for a user-set alert, checked in the form before it is sent (the API checks the same bounds).

export type AlertMetricKey = "price" | "score" | "delivery" | "volume";

/** A clear message when `value` is not a sensible threshold for `metric`, else null. */
export function thresholdError(metric: AlertMetricKey, value: number): string | null {
  if (!Number.isFinite(value)) return "Enter a numeric threshold.";
  switch (metric) {
    case "price":
      return value > 0 ? null : "Price must be above 0.";
    case "score":
      return value >= 0 && value <= 100 ? null : "Conditions Reading must be between 0 and 100.";
    case "delivery":
      return value >= 0 && value <= 100 ? null : "Delivery % must be between 0 and 100.";
    case "volume":
      return value > 0 && value <= 100 ? null : "Volume ratio must be above 0 and at most 100.";
    default:
      return null;
  }
}

/** "crosses above" / "crosses below" for every alert label. */
export function directionLabel(direction: string): string {
  return direction === "below" ? "crosses below" : "crosses above";
}
