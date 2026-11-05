/**
 * The one 52-week-high display rule for the Signals table and exports.
 *
 * The stored high/pct are close-based. While the market is open the table
 * and stock page use the current delayed price; a price above the stored
 * high is itself the new high, so the distance is zero. After the close the
 * same calculation uses the close, which is the row's last_price.
 */
export interface From52Display {
  high: number | null;
  belowPct: number | null;
  atHigh: boolean;
}

export function from52Display(
  storedHigh: number | null | undefined,
  storedBelowPct: number | null | undefined,
  price: number | null | undefined,
): From52Display {
  // A missing stored high is n/a (new listing / tier-masked), never a
  // synthetic "high" made from the current price.
  if (storedHigh == null) return { high: null, belowPct: storedBelowPct ?? null, atHigh: false };
  const effectiveHigh = price != null ? Math.max(storedHigh, price) : storedHigh;
  const belowPct = effectiveHigh != null && effectiveHigh > 0 && price != null
    ? Math.max(0, (1 - price / effectiveHigh) * 100)
    : (storedBelowPct ?? null);
  return {
    high: effectiveHigh,
    belowPct: belowPct == null ? null : Math.round(belowPct * 10) / 10,
    atHigh: belowPct != null && belowPct < 0.05,
  };
}
