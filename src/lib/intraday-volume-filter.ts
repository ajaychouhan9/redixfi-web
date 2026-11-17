// Scan tab: 1-tap filter on volume against the stock's own usual level (the `vr` field already on every Scan row: volume so far today divided by the
// 20-day average volume scaled to the time elapsed). The filter only chooses which of the listed rows are shown; the order, the lists and the
// series gate are untouched. Steps chosen from the 28-30 Oct Scan lists (see OPS_LOG 2026-11-01): about 23% of listed rows are at 3x or more,
// 13-16% at 5x, 6-8% at 10x, so each step still leaves a readable list.
export const VOLUME_STEPS = [3, 5, 10] as const;
export type VolumeStep = (typeof VOLUME_STEPS)[number];

export const volumeStepLabel = (n: number): string => `Volume ${n}x or more than its usual level`;
export const volumePillLabel = (n: number): string => `${n}x or more`;

/** The rows whose volume ratio is at least `min`, in the order given. `min` null = no filter (the same array comes back). A row with no ratio never matches. */
export function filterByVolume<T extends { vr: number | null }>(rows: T[], min: number | null): T[] {
  if (min === null) return rows;
  return rows.filter((r) => r.vr !== null && r.vr >= min);
}

/** The count line above the pills (the step's own wording is the pills' caption, so it is not repeated here). */
export function volumeCountText(shown: number, listed: number, min: number | null): string {
  return min === null ? `Showing ${listed}.` : `${shown} of ${listed} listed rows match.`;
}

/** Share counts the Indian way: 12.5 lakh (1,00,000) and 1.2 crore (1,00,00,000); below a lakh the plain number with Indian digit grouping. */
export function formatShares(n: number): string {
  const trim = (x: number) => String(Number(x.toFixed(1)));
  if (n >= 1e7) return `${trim(n / 1e7)} crore`;
  if (n >= 1e5) return `${trim(n / 1e5)} lakh`;
  return Math.round(n).toLocaleString("en-IN");
}

/**
 * The Volume cell of a Scan row (18 Nov 2026): "12 lakh shares today, usual 4 lakh, 3x" when the row carries the real share counts
 * (`vt` volume so far today, `vu` the usual volume for this time of day), and "3x its usual volume" when only the ratio is stored (rows written
 * before the counts were added). "usual" is the 20-day average volume scaled to the time elapsed, the same figure the ratio is made from.
 */
export function volumeLine(r: { vt?: number | null; vu?: number | null; vr: number | null }): string {
  const ratio = r.vr !== null && Number.isFinite(r.vr) ? `${Number(r.vr.toFixed(1))}x` : null;
  if (typeof r.vt === "number" && typeof r.vu === "number" && r.vu > 0) {
    return `${formatShares(r.vt)} shares today, usual ${formatShares(r.vu)}${ratio ? `, ${ratio}` : ""}`;
  }
  return ratio ? `${ratio} its usual volume` : "-";
}
