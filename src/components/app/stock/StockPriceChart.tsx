"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { getChart } from "@/lib/api/endpoints";
import type { Candle } from "@/lib/api/types";
import { changeOver, dailyRangesAvailable, rangeWords, signedPct, signedRupees, sliceDaily, toneOf, type Close, type RangeKey } from "@/lib/stock-visual";

/**
 * The price chart of the stock page (26 Nov 2026). Buttons 1D | 1W | 1M | 3M | 6M | 1Y | 5Y, only for ranges that have data.
 * 1D is today's 15-minute bars (the latest session when the market is closed); the others are daily closes. The line is green when the
 * range ended higher than it started and red when lower; the change and % for the selected range are written under it.
 * Lazy: the page sends about a year of closes as plain numbers; the chart library and the 15-minute / 5-year data are loaded only when the
 * chart scrolls into view (or the range is tapped). Same anonymous public data for everyone.
 */
type Pt = { t: number | string; v: number };

const dayOf = (ts: string) => ts.slice(0, 10);

/** Epoch seconds shifted to IST so the time axis reads in Indian time. */
const istSeconds = (ts: string) => Math.floor(new Date(ts).getTime() / 1000) + 19800;

export function StockPriceChart({ symbol, closes, has5y, lastPrice, sentence }: { symbol: string; closes: Close[]; has5y: boolean; lastPrice: number; sentence?: string | null }) {
  const daily = useMemo(() => dailyRangesAvailable(closes), [closes]);
  const [intraday, setIntraday] = useState<Candle[] | null | "none">(null);
  const [long, setLong] = useState<Close[] | null | "none">(null);
  const [visible, setVisible] = useState(false);
  const [range, setRange] = useState<RangeKey | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ label: string; value: number } | null>(null);
  const [theme, setTheme] = useState("");

  // the chart code and the extra data are fetched only once the chart is near the screen
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme ?? "");
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  // today's 15-minute bars: loaded when the chart becomes visible
  useEffect(() => {
    if (!visible || intraday !== null) return;
    let off = false;
    (async () => {
      try {
        // @auth-ok: public 15-minute bars, anonymous by design (the same data for everyone).
        const env = await getChart(symbol, { interval: "15m" });
        if (off) return;
        const c = env.data.candles ?? [];
        const last = c.length ? dayOf(c[c.length - 1].timestamp) : null;
        const today = last ? c.filter((x) => dayOf(x.timestamp) === last) : [];
        setIntraday(today.length >= 3 ? today : "none");
      } catch {
        if (!off) setIntraday("none");
      }
    })();
    return () => { off = true; };
  }, [visible, intraday, symbol]);

  const ranges: RangeKey[] = useMemo(() => {
    const r: RangeKey[] = [];
    if (Array.isArray(intraday)) r.push("1D");
    r.push(...daily.filter((k) => k !== "5Y"));
    if (has5y) r.push("5Y");
    return r;
  }, [intraday, daily, has5y]);

  // default range: 1D when the bars are in, else the first daily range of at least a month
  const active: RangeKey | null = range && ranges.includes(range) ? range : ranges.includes("1D") ? "1D" : ranges.includes("1M") ? "1M" : ranges[0] ?? null;

  // 5 years: fetched when that button is tapped
  useEffect(() => {
    if (active !== "5Y" || long !== null) return;
    let off = false;
    (async () => {
      try {
        const from = new Date(Date.now() - 5 * 366 * 86400000).toISOString().slice(0, 10);
        // @auth-ok: public daily closes, anonymous by design (the same data for everyone).
        const env = await getChart(symbol, { interval: "1d", from });
        if (off) return;
        const pts: Close[] = (env.data.candles ?? []).map((c) => [dayOf(c.timestamp), c.close]);
        setLong(pts.length >= 2 ? pts : "none");
      } catch {
        if (!off) setLong("none");
      }
    })();
    return () => { off = true; };
  }, [active, long, symbol]);

  const series: Pt[] = useMemo(() => {
    if (!active) return [];
    if (active === "1D") return Array.isArray(intraday) ? intraday.map((c) => ({ t: istSeconds(c.timestamp), v: c.close })) : [];
    if (active === "5Y") return Array.isArray(long) ? long.map(([d, v]) => ({ t: d, v })) : [];
    return sliceDaily(closes, active).map(([d, v]) => ({ t: d, v }));
  }, [active, intraday, long, closes]);

  // the change over the range: for 1D it is against the previous close
  const change = useMemo(() => {
    if (!active || series.length < 2) return null;
    if (active === "1D" && Array.isArray(intraday)) {
      const day = dayOf(intraday[0].timestamp);
      const prev = [...closes].reverse().find(([d]) => d < day);
      const base = prev ? prev[1] : intraday[0].open;
      return changeOver([base, series[series.length - 1].v]);
    }
    return changeOver(series.map((p) => p.v));
  }, [active, series, intraday, closes]);

  const tone = toneOf(change?.abs);

  useEffect(() => {
    const el = box.current;
    if (!el || !visible || series.length < 2) return;
    let disposed = false;
    let chart: import("lightweight-charts").IChartApi | null = null;
    (async () => {
      const lw = await import("lightweight-charts");
      if (disposed || !box.current) return;
      const css = getComputedStyle(document.documentElement);
      const cssVar = (n: string, fb: string) => css.getPropertyValue(n).trim() || fb;
      const up = cssVar("--up-fill", cssVar("--up", "#00a86b"));
      const down = cssVar("--down-fill", cssVar("--down", "#e5484d"));
      const line = tone === "down" ? down : tone === "up" ? up : cssVar("--foreground-muted", "#6b7280");
      chart = lw.createChart(box.current, {
        autoSize: true,
        height: 220,
        layout: { textColor: cssVar("--foreground-muted", "#6b7280"), background: { type: lw.ColorType.Solid, color: "transparent" }, fontSize: 12, attributionLogo: false },
        grid: { vertLines: { visible: false }, horzLines: { color: cssVar("--border", "#eeeeee") } },
        rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.1 } },
        timeScale: { borderVisible: false, timeVisible: active === "1D", secondsVisible: false, fixLeftEdge: true, fixRightEdge: true },
        handleScroll: false,
        handleScale: false,
        crosshair: { mode: lw.CrosshairMode.Magnet, vertLine: { labelVisible: false }, horzLine: { visible: false, labelVisible: false } },
      });
      const s = chart.addSeries(lw.LineSeries, { color: line, lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerRadius: 4 });
      s.setData(series.map((p) => ({ time: p.t as never, value: p.v })));
      chart.timeScale().fitContent();
      chart.subscribeCrosshairMove((param) => {
        const d = param.seriesData.get(s) as { value?: number } | undefined;
        if (!param.time || !d || typeof d.value !== "number") { setHover(null); return; }
        const label = typeof param.time === "number"
          ? new Date((param.time as number) * 1000).toISOString().slice(11, 16)
          : typeof param.time === "string" ? param.time : "";
        setHover({ label, value: d.value });
      });
    })();
    return () => {
      disposed = true;
      chart?.remove();
    };
  }, [visible, series, tone, theme, active]);

  if (!ranges.length) return null;

  const toneClass = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-foreground-muted";
  const loadingRange = active === "5Y" && long === null;
  const failedRange = active === "5Y" && long === "none";
  const pctText = change ? signedPct(change.pct) : null;
  const absText = change ? signedRupees(change.abs) : null;

  return (
    <section ref={wrap} aria-label="Price chart" className="mt-7 border-t border-border pt-6" data-testid="price-chart-visual">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">Price</h2>
        {hover ? (
          <p className="text-sm font-bold tabular-nums" data-testid="chart-hover">₹{hover.value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="font-normal text-foreground-muted">{hover.label}</span></p>
        ) : change && pctText && absText ? (
          <p className={`text-sm font-bold tabular-nums ${toneClass}`} data-testid="chart-change">
            {absText} ({pctText}) <span className="font-normal text-foreground-muted">{active === "1D" ? "today" : `in ${rangeWords(active as RangeKey)}`}</span>
          </p>
        ) : null}
      </div>
      <div ref={box} className="mt-3 h-[220px] w-full" data-testid="chart-box" data-no-stack aria-hidden={series.length < 2}>
        {(loadingRange || (visible && series.length < 2 && !failedRange)) && <div className="h-full w-full animate-pulse rounded bg-hover" aria-hidden="true" />}
      </div>
      {failedRange && <p className="text-sm text-foreground-muted">The 5-year chart could not be loaded right now.</p>}
      <div role="group" aria-label="Chart range" className="mt-2 flex justify-between gap-1">
        {ranges.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={active === k}
            onClick={() => setRange(k)}
            data-testid={`range-${k}`}
            className={`min-h-[44px] flex-1 rounded-md text-[13px] font-medium ${active === k ? "bg-hover font-bold text-foreground" : "text-foreground-muted"}`}
          >
            {k}
          </button>
        ))}
      </div>
      {sentence && <p className="mt-3 text-[15px] leading-6" data-testid="price-sentence">{sentence}</p>}
      <p className="mt-2 text-xs text-foreground-muted">Last close ₹{lastPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Daily closes are adjusted for splits and bonus issues.</p>
    </section>
  );
}
