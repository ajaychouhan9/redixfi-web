/**
 * The 52-week range with the current price applied: a price above the stored high is the new high and a price below the stored
 * low is the new low (2026-11-11: /stocks/ICICIBANK printed price Rs 1,592.2 next to a "52-week high Rs 1,592" and "99% of the way up").
 * Every page that prints a 52-week high, low or position uses this one function.
 */
export function resolve52Week(
  storedHigh: number | null | undefined,
  storedLow: number | null | undefined,
  price: number | null | undefined,
): { high: number; low: number; positionPct: number; belowHighPct: number } | null {
  if (storedHigh == null || storedLow == null || !Number.isFinite(storedHigh) || !Number.isFinite(storedLow)) return null;
  const p = typeof price === "number" && Number.isFinite(price) ? price : null;
  const high = p != null ? Math.max(storedHigh, p) : storedHigh;
  const low = p != null ? Math.min(storedLow, p) : storedLow;
  if (!(high > low)) return null;
  const at = p ?? high;
  return {
    high,
    low,
    positionPct: Math.max(0, Math.min(100, ((at - low) / (high - low)) * 100)),
    belowHighPct: Math.max(0, (1 - at / high) * 100),
  };
}

/** One way to print a 52-week figure on every page: Indian grouping, up to two decimals. */
export function formatPrice52(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
