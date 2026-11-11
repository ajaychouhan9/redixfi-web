/** The two measured points that replaced the "Sustaining / Fading" label (11 Nov 2026): the change from the day's open at the second-to-last window
 *  start and at the latest 15-minute candle, e.g. "Up 2.1% at 10:15, up 0.8% at 11:30". Empty when fewer than three candles exist. */
export interface IntradayPoint {
  time: string | null;
  pct: number;
}

function word(pct: number): string {
  return `${pct >= 0 ? "up" : "down"} ${Math.abs(pct).toFixed(1)}%`;
}

export function intradayPointsLine(points: IntradayPoint[] | null | undefined): string | null {
  if (!points || points.length !== 2) return null;
  const [a, b] = points;
  const t = (p: IntradayPoint) => (p.time ? String(p.time).slice(11, 16) : "");
  const line = `${word(a.pct)}${t(a) ? ` at ${t(a)}` : ""}, ${word(b.pct)}${t(b) ? ` at ${t(b)}` : ""}`;
  return line.charAt(0).toUpperCase() + line.slice(1);
}
