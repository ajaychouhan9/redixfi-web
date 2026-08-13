"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { getIntradayScan, type IntradayScanParams } from "@/lib/api/endpoints";
import type { ScanRow } from "@/lib/api/types";

const FILTER_CHIPS: { key: string; label: string; params: IntradayScanParams }[] = [
  { key: "vol2x", label: "Vol > 2x", params: { min_volume_ratio: 2 } },
  { key: "above_vwap", label: "> VWAP", params: { vwap_side: "above" } },
  { key: "below_vwap", label: "< VWAP", params: { vwap_side: "below" } },
  { key: "breakout_up", label: "Range-break up", params: { range_state: "breakout_up" } },
  { key: "breakout_down", label: "Range-break down", params: { range_state: "breakout_down" } },
];

export function ScannerTab() {
  const [active, setActive] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [meta, setMeta] = useState<{ universe_count: number; criteria: string; has_candle_data: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const params: IntradayScanParams = FILTER_CHIPS.filter((c) => active.has(c.key)).reduce(
    (acc, c) => ({ ...acc, ...c.params }),
    { size: 100 } as IntradayScanParams
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getIntradayScan(params)
      .then((env) => {
        if (cancelled) return;
        setRows(env.data.results);
        setMeta({ universe_count: env.data.universe_count, criteria: env.data.criteria, has_candle_data: env.data.has_candle_data });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.from(active).sort().join(",")]);

  function toggle(key: string) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {FILTER_CHIPS.map((c) => (
          <button
            key={c.key}
            onClick={() => toggle(c.key)}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs font-medium",
              active.has(c.key) ? "border-accent bg-accent/10 text-accent" : "border-border text-foreground-muted"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      {meta && (
        <p className="mb-2 text-xs text-foreground-faint">
          Active Universe: {meta.universe_count} stocks meeting minimum liquidity and price criteria today ({meta.criteria}).
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-surface text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
            <tr>
              <th className="px-3 py-2">Symbol</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Day %</th>
              <th className="px-3 py-2">Vol ratio</th>
              <th className="px-3 py-2">VWAP side</th>
              <th className="px-3 py-2">Range</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.symbol} className="border-t border-border">
                <td className="px-3 py-2">
                  <Link href={`/signals/${r.symbol}`} className="font-medium hover:text-accent">
                    {r.symbol}
                  </Link>
                </td>
                <td className="px-3 py-2 tabular-nums">₹{r.last_price}</td>
                <td className={clsx("px-3 py-2 tabular-nums", r.day_pct > 0 ? "text-up" : r.day_pct < 0 ? "text-down" : "text-neutral")}>
                  {r.day_pct > 0 ? "+" : ""}
                  {r.day_pct}%
                </td>
                <td className="px-3 py-2 tabular-nums">{r.volume_ratio}x</td>
                <td className="px-3 py-2 capitalize">{r.vwap_side}</td>
                <td className="px-3 py-2">{r.range_state.replace(/_/g, " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="p-3 text-center text-sm text-foreground-muted">Loading…</p>}
        {!loading && rows.length === 0 && meta && !meta.has_candle_data && (
          <p className="p-3 text-center text-sm text-foreground-muted">
            Today&apos;s intraday scan data is still being compiled — check back shortly once the session has a few completed candles.
          </p>
        )}
        {!loading && rows.length === 0 && meta && meta.has_candle_data && (
          <p className="p-3 text-center text-sm text-foreground-muted">No stocks match these filters.</p>
        )}
      </div>
    </div>
  );
}
