import type { ScoreHistoryPoint } from "@/lib/api/types";

/**
 * Inline trend/comparison chart for Ask-RedixFi answers (2026-08-06).
 *
 * Readability fix (2026-08-21) — founder report: the rendered chart (title
 * "COMPOSITE SCORE — RECENT SESSIONS") had no x-axis date labels and no
 * y-axis score gridlines/labels at all, so a viewer couldn't tell which
 * point corresponded to which date/value at a glance — confirmed directly
 * against this file's prior version (a bare `<polyline>`/`<Sparkline>`,
 * zero axis markup). Both the single-symbol and multi-symbol (compare)
 * cases now render through ONE shared SVG layout with real axis labels —
 * the single-symbol case no longer delegates to the generic, deliberately
 * axis-less `Sparkline` component (still used elsewhere for compact glance
 * indicators, e.g. Research's Delivery(30d) mini chart, where axes would be
 * inappropriate clutter — that component is untouched).
 *
 * Y-AXIS: 3 gridlines (max/mid/min of the combined visible range), each
 * with its real composite-score value.
 * X-AXIS: date labels under a handful of evenly-spaced points (first, last,
 * and up to 3 more between them) rather than every single point, which
 * would overlap into unreadable clutter on a 20-30 point series — dates
 * come from whichever series has the MOST points (the widest date
 * coverage), since every series' own x-position is computed by index
 * within its own length (unchanged from before this fix; this chart
 * doesn't attempt real date-aligned x-positioning across series of
 * different lengths, a separate, out-of-scope data-alignment concern).
 *
 * TWO OR MORE symbols (compare mode) keep their SHARED-SCALE multi-line
 * rendering (one independently-scaled Sparkline per series would
 * misrepresent the comparison) and their existing direct-labeled legend
 * (symbol name + color swatch) below the chart — required by the
 * categorical palette's own light-mode contrast WARN (see globals.css's
 * --series-1..5 comment), unchanged by this fix.
 *
 * Real, measured data only (core/signals_view.py::score_history reading
 * measured_signals) — never a synthesized/interpolated line. A symbol with
 * fewer than 2 real data points is silently dropped (nothing to draw a
 * trend from yet), matching this product's own "honest, however short"
 * posture toward its own young signal history.
 */

const CHART_WIDTH = 320;
const CHART_HEIGHT = 150;
const PAD_LEFT = 30;
const PAD_RIGHT = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 20;
const PLOT_WIDTH = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
const MAX_X_TICKS = 5;

function formatTickDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function xTickIndices(pointCount: number): number[] {
  if (pointCount <= MAX_X_TICKS) return Array.from({ length: pointCount }, (_, i) => i);
  const ticks = new Set<number>();
  for (let i = 0; i < MAX_X_TICKS; i += 1) {
    ticks.add(Math.round((i / (MAX_X_TICKS - 1)) * (pointCount - 1)));
  }
  return Array.from(ticks).sort((a, b) => a - b);
}

export function ScoreHistoryChart({
  series,
}: {
  series: { symbol: string; points: ScoreHistoryPoint[] }[];
}) {
  const withData = series.filter((s) => s.points.length >= 2);
  if (withData.length === 0) return null;

  const allValues = withData.flatMap((s) => s.points.map((p) => p.composite_score));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const mid = (min + max) / 2;

  const xFor = (idx: number, len: number) => PAD_LEFT + (len <= 1 ? 0 : (idx / (len - 1)) * PLOT_WIDTH);
  const yFor = (value: number) => PAD_TOP + PLOT_HEIGHT - ((value - min) / range) * PLOT_HEIGHT;

  // Widest-coverage series drives the x-axis date ticks (see module docstring).
  const referenceSeries = withData.reduce((a, b) => (b.points.length > a.points.length ? b : a));
  const tickIndices = xTickIndices(referenceSeries.points.length);
  const yTicks = [max, mid, min];

  const title = withData.length === 1 ? `${withData[0].symbol} composite score — last ${withData[0].points.length} sessions` : "Composite score — recent sessions";

  return (
    <div className="mt-2 rounded-lg border border-border bg-surface-raised p-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground-faint">{title}</p>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        width="100%"
        height={CHART_HEIGHT}
        role="img"
        aria-label={withData.length === 1 ? `${withData[0].symbol} composite score over the last ${withData[0].points.length} sessions` : "Composite score comparison over recent sessions"}
      >
        {/* Y-axis gridlines + value labels */}
        {yTicks.map((v, i) => {
          const y = yFor(v);
          return (
            <g key={i}>
              <line x1={PAD_LEFT} y1={y} x2={CHART_WIDTH - PAD_RIGHT} y2={y} stroke="var(--border)" strokeWidth={1} />
              <text x={PAD_LEFT - 4} y={y} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="var(--foreground-faint)">
                {Math.round(v)}
              </text>
            </g>
          );
        })}
        {/* X-axis date labels, sparsely ticked (see xTickIndices) */}
        {tickIndices.map((idx) => {
          const point = referenceSeries.points[idx];
          if (!point) return null;
          const x = xFor(idx, referenceSeries.points.length);
          return (
            <text key={idx} x={x} y={CHART_HEIGHT - 4} textAnchor="middle" fontSize={9} fill="var(--foreground-faint)">
              {formatTickDate(point.date)}
            </text>
          );
        })}
        {withData.map((s, i) => {
          const points = s.points.map((p, idx) => `${xFor(idx, s.points.length)},${yFor(p.composite_score)}`).join(" ");
          return (
            <polyline
              key={s.symbol}
              points={points}
              fill="none"
              stroke={withData.length === 1 ? "var(--accent)" : `var(--series-${(i % 5) + 1})`}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      {withData.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {withData.map((s, i) => (
            <span key={s.symbol} className="flex items-center gap-1 text-[12px] text-foreground-muted">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: `var(--series-${(i % 5) + 1})` }} aria-hidden />
              {s.symbol}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
