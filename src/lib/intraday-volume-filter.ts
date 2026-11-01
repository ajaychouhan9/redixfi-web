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
