"use client";

import { useEffect, useRef } from "react";
import type { Candle, DeliveryPoint } from "@/lib/api/types";

export function CandleChart({ candles, delivery }: { candles: Candle[]; delivery?: DeliveryPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;
    let disposed = false;
    let chart: import("lightweight-charts").IChartApi | null = null;

    (async () => {
      const { createChart, CandlestickSeries, HistogramSeries, LineSeries, ColorType } = await import("lightweight-charts");
      if (disposed || !containerRef.current) return;

      const styles = getComputedStyle(document.documentElement);
      const fg = styles.getPropertyValue("--foreground").trim() || "#14181f";
      const border = styles.getPropertyValue("--border").trim() || "#e4e7eb";
      const up = styles.getPropertyValue("--up").trim() || "#0f7a4a";
      const down = styles.getPropertyValue("--down").trim() || "#b3261e";
      const accent = styles.getPropertyValue("--accent").trim() || "#2f5ce0";

      chart = createChart(containerRef.current, {
        layout: { textColor: fg, background: { type: ColorType.Solid, color: "transparent" } },
        grid: { vertLines: { color: border }, horzLines: { color: border } },
        rightPriceScale: { borderColor: border },
        timeScale: { borderColor: border },
        height: 360,
        autoSize: true,
      });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: up,
        downColor: down,
        borderVisible: false,
        wickUpColor: up,
        wickDownColor: down,
      });
      candleSeries.setData(
        candles.map((c) => ({
          time: c.timestamp.slice(0, 10),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
        color: border,
      });
      chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      volumeSeries.setData(
        candles.map((c, i) => ({
          time: c.timestamp.slice(0, 10),
          value: c.volume,
          color: i > 0 && c.close < candles[i - 1].close ? down : up,
        }))
      );

      if (delivery && delivery.length > 0) {
        const deliverySeries = chart.addSeries(LineSeries, {
          color: accent,
          lineWidth: 1,
          priceScaleId: "delivery",
          priceFormat: { type: "percent" },
        });
        chart.priceScale("delivery").applyOptions({ scaleMargins: { top: 0.05, bottom: 0.3 }, visible: false });
        deliverySeries.setData(
          [...delivery]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((d) => ({ time: d.date, value: d.delivery_pct }))
        );
      }

      chart.timeScale().fitContent();
    })();

    return () => {
      disposed = true;
      chart?.remove();
    };
  }, [candles, delivery]);

  if (candles.length === 0) {
    return <p className="text-sm text-foreground-muted">No chart data available.</p>;
  }

  return (
    <div>
      <div ref={containerRef} className="w-full" />
      {delivery && delivery.length > 0 && (
        <p className="mt-1 text-xs text-foreground-faint">Accent line: delivery % (last {delivery.length} sessions).</p>
      )}
    </div>
  );
}
