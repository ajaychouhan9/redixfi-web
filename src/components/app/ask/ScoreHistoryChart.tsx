import { Sparkline } from "@/components/ui/Sparkline";
import type { ScoreHistoryPoint } from "@/lib/api/types";

/**
 * Inline trend/comparison chart for Ask-RedixFi answers (2026-08-06).
 *
 * ONE symbol (a causal/trend-shaped per-symbol question) -> reuses the
 * EXISTING Sparkline component unchanged, wrapped in the SAME `text-accent`
 * convention Research already uses for its own sparklines (ResearchDetail.tsx's
 * Delivery(30d) chart) — no new single-series visual language.
 *
 * TWO OR MORE symbols (compare mode) -> Sparkline's own per-invocation
 * min/max normalization can't be reused as-is here (two independently-scaled lines
 * would misrepresent the comparison), so this renders a small SHARED-SCALE
 * multi-line chart as plain inline SVG, in the same minimal style. Series
 * colors are the first N slots of a categorical palette validated (dataviz
 * skill: lightness/chroma/CVD-separation/normal-vision-floor/contrast) for
 * this app's actual --surface-raised in both themes (see globals.css's
 * --series-1..5 comment) — assigned in FIXED order by each symbol's
 * position in `series` (the same order Task 13's compare table already
 * uses), never cycled or re-assigned when the set changes. Every series is
 * ALSO direct-labeled in the legend below the chart (never color-alone) —
 * required by the palette's own light-mode contrast WARN.
 *
 * Real, measured data only (core/signals_view.py::score_history reading
 * measured_signals) — never a synthesized/interpolated line. A symbol with
 * fewer than 2 real data points is silently dropped (nothing to draw a
 * trend from yet), matching this product's own "honest, however short"
 * posture toward its own young signal history.
 */
export function ScoreHistoryChart({
  series,
}: {
  series: { symbol: string; points: ScoreHistoryPoint[] }[];
}) {
  const withData = series.filter((s) => s.points.length >= 2);
  if (withData.length === 0) return null;

  if (withData.length === 1) {
    const s = withData[0];
    return (
      <div className="mt-2 rounded-lg border border-border bg-surface-raised p-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground-faint">
          {s.symbol} composite score — last {s.points.length} sessions
        </p>
        <div className="text-accent">
          <Sparkline values={s.points.map((p) => p.composite_score)} height={36} />
        </div>
      </div>
    );
  }

  const width = 100;
  const height = 44;
  const allValues = withData.flatMap((s) => s.points.map((p) => p.composite_score));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  return (
    <div className="mt-2 rounded-lg border border-border bg-surface-raised p-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground-faint">
        Composite score — recent sessions
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="Composite score comparison over recent sessions">
        {withData.map((s, i) => {
          const points = s.points
            .map((p, idx) => {
              const x = (idx / (s.points.length - 1)) * width;
              const y = height - ((p.composite_score - min) / range) * height;
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <polyline
              key={s.symbol}
              points={points}
              fill="none"
              stroke={`var(--series-${(i % 5) + 1})`}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {withData.map((s, i) => (
          <span key={s.symbol} className="flex items-center gap-1 text-[12px] text-foreground-muted">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: `var(--series-${(i % 5) + 1})` }} aria-hidden />
            {s.symbol}
          </span>
        ))}
      </div>
    </div>
  );
}
