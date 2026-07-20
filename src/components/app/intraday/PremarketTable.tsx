"use client";

import { useEffect, useState } from "react";
import { apiGetPaged } from "@/lib/api/client";
import type { PremarketRow } from "@/lib/api/types";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

const SORTS = [
  { value: "gap_pct", label: "Gap %" },
  { value: "preopen_qty", label: "Pre-open volume" },
] as const;

export function PremarketTable() {
  const [direction, setDirection] = useState<"" | "up" | "down">("");
  const [sort, setSort] = useState("gap_pct");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [rows, setRows] = useState<PremarketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGetPaged<PremarketRow>("/intraday/premarket", { params: { direction: direction || undefined, sort, order, size: 30 } })
      .then((env) => {
        if (cancelled) return;
        setRows(env.data);
        setTotal(env.page_info.total);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [direction, sort, order]);

  return (
    <Card
      title="Pre-open movers"
      action={
        <div className="flex items-center gap-2 text-xs">
          <select value={direction} onChange={(e) => setDirection(e.target.value as never)} className="rounded border border-border bg-transparent px-1.5 py-1">
            <option value="">Both directions</option>
            <option value="up">Gap up</option>
            <option value="down">Gap down</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded border border-border bg-transparent px-1.5 py-1">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))} className="rounded border border-border px-1.5 py-1">
            {order === "asc" ? "↑" : "↓"}
          </button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
            <tr>
              <th className="py-1.5 pr-3">Symbol</th>
              <th className="py-1.5 pr-3">Gap</th>
              <th className="py-1.5 pr-3">Pre-open vol</th>
              <th className="py-1.5 pr-3">Tags</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.symbol} className="border-t border-border">
                <td className="py-1.5 pr-3 font-medium">{r.symbol}</td>
                <td className={`py-1.5 pr-3 tabular-nums ${r.gap_direction === "UP" ? "text-up" : "text-down"}`}>
                  {r.gap_direction === "UP" ? "+" : "-"}
                  {Math.abs(r.gap_pct)}%
                </td>
                <td className="py-1.5 pr-3 tabular-nums">{r.preopen_qty.toLocaleString("en-IN")}</td>
                <td className="py-1.5 pr-3">
                  <div className="flex flex-wrap gap-1">
                    {r.premarket_tags.map((t) => (
                      <Chip key={t}>{t.replace(/_/g, " ").toLowerCase()}</Chip>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="py-3 text-center text-sm text-foreground-muted">Loading…</p>}
        {!loading && rows.length === 0 && <p className="py-3 text-center text-sm text-foreground-muted">No pre-open movers yet.</p>}
      </div>
      <p className="mt-2 text-xs text-foreground-faint">{total.toLocaleString("en-IN")} stocks with a pre-open indication.</p>
    </Card>
  );
}
