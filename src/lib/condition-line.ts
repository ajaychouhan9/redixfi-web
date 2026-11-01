import type { ConditionLinePoint } from "@/lib/api/types";

export const CONDITION_LINE_MIN_POINTS = 5;
export const CONDITION_LINE_SESSIONS = 30;

/** The plain caption: the full 30 sessions, or the honest count when fewer are stored. Never a trend word. */
export function conditionLineCaption(n: number): string {
  if (n >= CONDITION_LINE_SESSIONS) return `Stock Condition, last ${CONDITION_LINE_SESSIONS} sessions`;
  return `Stock Condition, last ${n} sessions (all stored so far)`;
}

/** What to draw: the points when there are enough of them, otherwise nothing. */
export function usableConditionPoints(points: ConditionLinePoint[] | undefined | null): ConditionLinePoint[] {
  const p = (points ?? []).filter((x) => typeof x.value === "number" && Number.isFinite(x.value));
  return p.length >= CONDITION_LINE_MIN_POINTS ? p : [];
}

/** SVG path for the points inside a w x h box with `pad` on every side. A flat series is drawn in the middle. */
export function conditionLinePath(values: number[], w: number, h: number, pad = 4): { d: string; min: number; max: number } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const step = values.length > 1 ? (w - 2 * pad) / (values.length - 1) : 0;
  const y = (v: number) => (span === 0 ? h / 2 : pad + (1 - (v - min) / span) * (h - 2 * pad));
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${(pad + i * step).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return { d, min, max };
}
