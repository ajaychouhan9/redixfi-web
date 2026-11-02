"use client";

import { useMemo, useRef, useState } from "react";

import { formatNumber, formatShortDate } from "@/lib/format";
import { closesFrom, labelIndexes, linePath, pctFromStart, periodPoints, type ChartPeriod } from "@/lib/price-chart";
import type { Candle } from "@/lib/api/types";

const W = 320;
const H = 150;

/**
 * The one price chart of the stock page: daily closes adjusted for splits and bonus issues, a plain neutral line (no indicators, no trend lines, no
 * annotations), periods 1M / 3M (default) / 1Y, a touch or hover tooltip with the date, the close and the % from the start of the period, the min and
 * max on the y axis, 3-4 date labels, and the 52-week high and low only when they fall inside the range. `touch-action: pan-y` keeps vertical page
 * scroll working over the chart. The last point is the last close; the header carries the delayed live price.
 */
export function PriceChart({ candles, high52, low52 }: { candles: Candle[]; high52?: number | null; low52?: number | null }) {
  const [period, setPeriod] = useState<ChartPeriod>("3M");
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const all = useMemo(() => closesFrom(candles), [candles]);
  const pts = useMemo(() => periodPoints(all, period), [all, period]);

  if (pts.length < 2) {
    return (
      <section className="rounded-xl border border-border bg-surface-raised px-4 py-3" data-testid="price-chart">
        <h3 className="text-sm font-semibold text-foreground">Price chart</h3>
        <p className="mt-2 text-sm text-foreground-muted">Chart unavailable</p>
      </section>
    );
  }
  const { d, min, max, x, y } = linePath(pts, W, H);
  const lines = [high52, low52].filter((v): v is number => typeof v === "number" && v >= min && v <= max);
  const idx = hover ?? pts.length - 1;
  const move = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setHover(Math.round(f * (pts.length - 1)));
  };
  const p = pts[idx];
  const pct = pctFromStart(pts, idx);
  const last = all[all.length - 1];
  const tab = (on: boolean) => `min-h-11 min-w-12 rounded-md px-3 text-xs font-medium ${on ? "bg-accent/15 text-foreground ring-1 ring-accent" : "text-foreground-muted"}`;
  return (
    <section id="price-chart" className="scroll-mt-20 rounded-xl border border-border bg-surface-raised px-4 py-3" data-testid="price-chart">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Price chart</h3>
        <div role="group" aria-label="Period" className="flex gap-1">
          {(["1M", "3M", "1Y"] as ChartPeriod[]).map((k) => (
            <button key={k} type="button" aria-pressed={period === k} onClick={() => { setPeriod(k); setHover(null); }} className={tab(period === k)}>{k}</button>
          ))}
        </div>
      </div>
      <p className="mt-1 min-h-[18px] text-xs text-foreground-muted" data-testid="chart-readout">
        {formatShortDate(p.date)} · ₹{formatNumber(p.close, 2)}
        {pct !== null && idx > 0 && ` · ${pct >= 0 ? "+" : "-"}${Math.abs(pct).toFixed(1)}% from the start of the period`}
      </p>
      <div className="mt-1 flex items-stretch gap-2">
        <div className="flex w-14 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-foreground-muted" aria-hidden="true">
          <span>{formatNumber(max, 0)}</span>
          <span>{formatNumber(min, 0)}</span>
        </div>
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-[150px] w-full min-w-0 text-foreground-muted"
          style={{ touchAction: "pan-y" }}
          role="img"
          aria-label={`Daily closes for the selected period, last close ${formatShortDate(last.date)}`}
          onPointerMove={(e) => move(e.clientX)}
          onPointerDown={(e) => move(e.clientX)}
          onPointerLeave={() => setHover(null)}
        >
          {lines.map((v) => (
            <line key={v} x1="0" x2={W} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity="0.35" strokeDasharray="3 3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={d} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <line x1={x(idx)} x2={x(idx)} y1="0" y2={H} stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="mt-1 flex justify-between pl-16 text-[10px] text-foreground-muted">
        {labelIndexes(pts.length).map((i) => (
          <span key={i}>{formatShortDate(pts[i].date)}</span>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-foreground-faint">Daily closes, adjusted for splits and bonus issues. Last close {formatShortDate(last.date)}.</p>
    </section>
  );
}
