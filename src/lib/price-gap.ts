/** When the live price differs from the last close by at least this many percent, a line under the stock header says the readings below are
 *  from the last close. One config value (set NEXT_PUBLIC_PRICE_GAP_NOTE_PCT to change it). */
export const PRICE_GAP_NOTE_PCT = Number(process.env.NEXT_PUBLIC_PRICE_GAP_NOTE_PCT ?? 5);

export interface GapNoteInput {
  /** Day change of the price shown in the header, in percent (against the previous close). */
  pct: number | null | undefined;
  /** The date the readings were measured at (YYYY-MM-DD). */
  readingsDate: string | null | undefined;
  /** Today's date in IST (YYYY-MM-DD). */
  today: string;
  /** True while the market is open (the price is a delayed live price, not a close). */
  marketOpen: boolean;
}

/** The difference line, or null: shown only while the market is open, when the price has moved by the configured percent or more and the
 *  readings are for an earlier session. */
export function priceGapNote(i: GapNoteInput, threshold: number = PRICE_GAP_NOTE_PCT): string | null {
  if (!i.marketOpen || typeof i.pct !== "number" || !Number.isFinite(i.pct) || Math.abs(i.pct) < threshold) return null;
  if (!i.readingsDate || i.readingsDate >= i.today) return null;
  const [y, m, d] = i.readingsDate.slice(0, 10).split("-").map(Number);
  const label = `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]}`;
  void y;
  return `The price has moved ${i.pct > 0 ? "+" : "-"}${Math.abs(i.pct).toFixed(1)}% from the last close (${label}). The readings below were measured at the ${label} close and update after today\u2019s close.`;
}
