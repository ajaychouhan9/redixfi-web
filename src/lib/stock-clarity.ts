// Presentation helpers for the stock pages (Signals and Research). Pure functions: everything is computed at
// read time from values already on the page; nothing here is stored, scored or fetched.

/** "Quick read": which parts of the one-line summary can be shown. */
export interface QuickReadInput {
  composite_score: number | null | undefined;
  delta_1d: number | null | undefined;
  delta_5d: number | null | undefined;
  delivery_pct: number | null | undefined;
  delivery_avg20: number | null | undefined;
  /** "BE" means trade-for-trade: delivery is not applicable. */
  delivery_series: string | null | undefined;
  volume_ratio_5d: number | null | undefined;
  vol_rank: number | null | undefined;
  ranked_of: number | null | undefined;
  /** Series of the stock in the volatility document (EQ, BE, BZ). */
  series: string | null | undefined;
  /** Corporate-action note status, when the page carries one. */
  corporate_action_status: string | null | undefined;
  limited_data: boolean | null | undefined;
}

const HELD_STATUSES = new Set(["unconfirmed", "review"]);

/** BE and BZ are trade-for-trade series: delivery is close to 100% by construction and is not applicable. */
export function isTradeForTrade(series: string | null | undefined): boolean {
  return series === "BE" || series === "BZ";
}
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function signed(v: number): string {
  return `${v > 0 ? "+" : v < 0 ? "-" : ""}${Math.abs(v)}`;
}

/** Rank restated as a share: "more volatile than X% of ranked stocks", X = round((N - rank) / N * 100). */
export function moreVolatileThanPct(rank: number, rankedOf: number): number {
  return Math.round(((rankedOf - rank) / rankedOf) * 100);
}

/** Whether the Quick read is allowed for this stock at all (held, limited-data, BE/BZ stocks and a missing score omit it). */
export function quickReadAllowed(i: QuickReadInput): boolean {
  if (!num(i.composite_score)) return false;
  if (i.limited_data) return false;
  if (i.corporate_action_status && HELD_STATUSES.has(i.corporate_action_status)) return false;
  if (isTradeForTrade(i.delivery_series) || isTradeForTrade(i.series)) return false;
  return true;
}

/** The parts of the Quick read that can be shown, in order. A change that is blank (including one blanked by the
 *  stale-baseline guard) is left out of the score part, never shown as 0. Empty when fewer than 3 parts exist. */
export function quickReadParts(i: QuickReadInput): string[] {
  if (!quickReadAllowed(i)) return [];
  const parts: string[] = [];

  const changes: string[] = [];
  if (num(i.delta_1d)) changes.push(`${signed(i.delta_1d)} today`);
  if (num(i.delta_5d)) changes.push(`${signed(i.delta_5d)} over 5 sessions`);
  parts.push(`Score ${i.composite_score}${changes.length ? ` (${changes.join(", ")})` : ""}`);

  if (num(i.delivery_pct) && num(i.delivery_avg20)) {
    parts.push(`Delivery ${i.delivery_pct}% vs ${i.delivery_avg20}% 20-day avg`);
  }
  if (num(i.volume_ratio_5d)) {
    parts.push(`Volume ${i.volume_ratio_5d}x usual`);
  }
  if (num(i.vol_rank) && num(i.ranked_of) && i.ranked_of > 0) {
    parts.push(`Volatility rank ${i.vol_rank.toLocaleString("en-IN")} of ${i.ranked_of.toLocaleString("en-IN")} (1 = most volatile)`);
  }
  return parts.length >= 3 ? parts : [];
}

/** Rupees as a readable value: crore for large amounts, lakh and plain rupees for small ones. */
export function formatRupeesCompact(value: number | null | undefined): string {
  if (!num(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const v = Math.abs(value);
  if (v >= 1e7) {
    const cr = v / 1e7;
    const text = cr >= 100 ? Math.round(cr).toLocaleString("en-IN") : cr.toLocaleString("en-IN", { maximumFractionDigits: 2 });
    return `${sign}₹${text} Cr`;
  }
  if (v >= 1e5) {
    return `${sign}₹${(v / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 2 })} lakh`;
  }
  return `${sign}₹${Math.round(v).toLocaleString("en-IN")}`;
}

/** Splits rows into the last 12 months and older ones (nothing is dropped). A row with no readable date stays in
 *  the recent list so it is never hidden. */
export function splitLast12Months<T>(rows: T[], dateOf: (row: T) => string | null | undefined, now: Date = new Date()): { recent: T[]; older: T[] } {
  const cut = new Date(now);
  cut.setFullYear(cut.getFullYear() - 1);
  const recent: T[] = [];
  const older: T[] = [];
  for (const row of rows) {
    const raw = dateOf(row);
    const t = raw ? new Date(raw).getTime() : NaN;
    (Number.isNaN(t) || t >= cut.getTime() ? recent : older).push(row);
  }
  return { recent, older };
}
