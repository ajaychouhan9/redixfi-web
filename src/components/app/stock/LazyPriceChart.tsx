"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { getChart } from "@/lib/api/endpoints";
import type { Candle } from "@/lib/api/types";

const PriceChart = dynamic(() => import("@/components/app/signals/PriceChart").then((m) => m.PriceChart), {
  ssr: false,
  loading: () => <div className="h-[260px] animate-pulse rounded-xl bg-hover" aria-hidden="true" />,
});

/**
 * The daily price chart, loaded only when asked for: the stock page is static and carries no chart data, so the closes are fetched in the
 * browser on the first tap (public data, same for everyone) and the chart code is loaded then too.
 */
export function LazyPriceChart({ symbol, high52, low52 }: { symbol: string; high52?: number | null; low52?: number | null }) {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [candles, setCandles] = useState<Candle[]>([]);

  async function load() {
    setState("loading");
    try {
      // @auth-ok: public daily closes, anonymous by design (the same data the chart on the old Signals stock page drew for everyone).
      const env = await getChart(symbol, { interval: "1d" });
      setCandles(env.data.candles ?? []);
      setState("ok");
    } catch {
      setState("error");
    }
  }

  if (state === "ok") return <PriceChart candles={candles} high52={high52} low52={low52} />;
  return (
    <div id="price-chart" data-testid="price-chart-lazy">
      <button
        type="button"
        onClick={load}
        disabled={state === "loading"}
        className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground disabled:opacity-60"
      >
        {state === "loading" ? "Loading chart…" : "Show price chart"}
      </button>
      {state === "error" && <p className="mt-2 text-sm text-foreground-muted">The chart could not be loaded right now.</p>}
    </div>
  );
}
