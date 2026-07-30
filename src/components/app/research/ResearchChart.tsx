"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { CandleChart } from "@/components/app/CandleChart";
import type { Candle } from "@/lib/api/types";

// The live API only serves interval=1d or interval=15m (verified — 1w/1mo/1y
// all 422). "1D" therefore means today's 15m intraday candles; W/M/Y are
// client-side slices of the same ~269-session daily series (server-fetched
// once, no from/to round-trip needed since the API already returns that much
// by default) — only the "1D" intraday series is fetched lazily client-side,
// on demand, since it's the one series genuinely not needed for the initial
// server-rendered view (Task 14: everything else must be in the first
// response, not behind a "Loading…" placeholder).
const INTERVALS = ["1D", "1W", "1M", "1Y"] as const;
const DAILY_SLICE: Record<Exclude<(typeof INTERVALS)[number], "1D">, number> = {
  "1W": 5,
  "1M": 22,
  "1Y": 269,
};

export function ResearchChart({ symbol, dailyCandles }: { symbol: string; dailyCandles: Candle[] }) {
  const [range, setRange] = useState<(typeof INTERVALS)[number]>("1M");
  const [intradayCandles, setIntradayCandles] = useState<Candle[]>([]);

  useEffect(() => {
    if (range !== "1D") return;
    let cancelled = false;
    apiGet<{ candles: Candle[] }>(`/charts/${encodeURIComponent(symbol)}`, { params: { interval: "15m" } })
      .then((env) => !cancelled && setIntradayCandles(env.data.candles))
      .catch(() => !cancelled && setIntradayCandles([]));
    return () => {
      cancelled = true;
    };
  }, [symbol, range]);

  const visibleCandles = range === "1D" ? intradayCandles : dailyCandles.slice(-DAILY_SLICE[range]);

  return (
    <Card
      title="Chart"
      action={
        <div className="flex gap-1 text-xs">
          {INTERVALS.map((i) => (
            <button
              key={i}
              onClick={() => setRange(i)}
              className={`rounded px-2 py-1 ${range === i ? "bg-accent text-accent-foreground" : "text-foreground-muted"}`}
            >
              {i}
            </button>
          ))}
        </div>
      }
    >
      <CandleChart candles={visibleCandles} />
    </Card>
  );
}
