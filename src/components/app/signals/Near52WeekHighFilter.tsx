"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Lock } from "lucide-react";
import { getNear52WeekHigh } from "@/lib/api/endpoints";
import type { Near52WeekHighResponse, Near52WeekHighRow } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatInr, formatNumber } from "@/lib/format";

const PRESETS = [2, 5, 10, 20] as const;
const SORTS: { value: string; label: string }[] = [
  { value: "symbol", label: "Symbol (A–Z)" },
  { value: "last_price", label: "Price" },
  { value: "week52_high", label: "52-week high" },
  { value: "pct_below_52w_high", label: "% below 52-week high" },
  { value: "volume_ratio_5_20", label: "Volume 5d / 20d" },
  { value: "delivery_pct", label: "Delivery %" },
  { value: "volatility_rank", label: "Volatility rank" },
  { value: "sector", label: "Sector" },
];

type Order = "asc" | "desc";

function value(row: Near52WeekHighRow, key: string): string {
  if (row.locked && key !== "last_price" && key !== "sector") return "—";
  if (key === "last_price") return row.last_price == null ? "—" : formatInr(row.last_price);
  if (key === "week52_high") return row.week52_high == null ? "—" : formatInr(row.week52_high);
  if (key === "pct_below_52w_high") return row.pct_below_52w_high == null ? "—" : `${formatNumber(row.pct_below_52w_high, 1)}%`;
  if (key === "volume_ratio_5_20") return row.volume_ratio_5_20 == null ? "—" : `${formatNumber(row.volume_ratio_5_20, 2)}×`;
  if (key === "delivery_pct") {
    if (row.delivery_series === "BE" || row.delivery_series === "BZ") return "n/a";
    return row.delivery_pct == null ? "n/a" : `${formatNumber(row.delivery_pct, 1)}%`;
  }
  if (key === "volatility_text") return row.volatility_text || "—";
  if (key === "sector") return row.sector || "—";
  return "";
}

function HeaderCell({
  label,
  field,
  sort,
  order,
  onSort,
  align = "left",
}: {
  label: string;
  field: string;
  sort: string;
  order: Order;
  onSort: (field: string) => void;
  align?: "left" | "right";
}) {
  const active = sort === field;
  return (
    <th className={`whitespace-nowrap px-3 py-2 ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "text-foreground" : ""}`}
      >
        {label}
        {active && (order === "desc" ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
      </button>
    </th>
  );
}

export function Near52WeekHighFilter() {
  const { getToken } = useAuth();
  const [preset, setPreset] = useState<number | "custom" | null>(null);
  const [customMin, setCustomMin] = useState("");
  const [customMax, setCustomMax] = useState("");
  const [sort, setSort] = useState("symbol");
  const [order, setOrder] = useState<Order>("asc");
  const [data, setData] = useState<Near52WeekHighResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchRows(min: number | undefined, max: number | undefined, nextSort = sort, nextOrder = order) {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      const r = await getNear52WeekHigh(
        { min_pct: min, max_pct: max, sort: nextSort, order: nextOrder },
        { token }
      );
      setData(r.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the measured data.");
    } finally {
      setBusy(false);
    }
  }

  function choosePreset(p: number) {
    setPreset(p);
    void fetchRows(undefined, p);
  }

  function chooseCustom() {
    setPreset("custom");
    setError(null);
  }

  function applyCustom() {
    const min = customMin.trim() === "" ? undefined : Number(customMin);
    const max = customMax.trim() === "" ? undefined : Number(customMax);
    if ((min === undefined && max === undefined) || (min !== undefined && !Number.isFinite(min)) || (max !== undefined && !Number.isFinite(max))) {
      setError("Enter a minimum, a maximum, or both.");
      return;
    }
    if (min !== undefined && max !== undefined && min > max) {
      setError("The minimum cannot be greater than the maximum.");
      return;
    }
    void fetchRows(min, max);
  }

  function changeSort(field: string) {
    const nextOrder: Order = field === sort && order === "asc" ? "desc" : "asc";
    setSort(field);
    setOrder(nextOrder);
    if (data) {
      if (preset === "custom") {
        const min = customMin.trim() === "" ? undefined : Number(customMin);
        const max = customMax.trim() === "" ? undefined : Number(customMax);
        void fetchRows(min, max, field, nextOrder);
      } else if (typeof preset === "number") {
        void fetchRows(undefined, preset, field, nextOrder);
      }
    }
  }

  const rows = data?.results ?? [];
  const lockedRows = rows.filter((r) => r.locked).length;

  return (
    <section className="mt-5 border-t border-border pt-5" aria-labelledby="near-52w-title">
      <div className="mb-3">
        <h4 id="near-52w-title" className="text-sm font-semibold">Near 52-week high</h4>
        <p className="mt-1 text-[13px] text-foreground-muted">
          Distance from the 52-week high (%). Choose a range to see stocks with at least 52 weeks of data.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Distance from the 52-week high presets">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => choosePreset(p)}
            disabled={busy}
            className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors disabled:opacity-50 ${
              preset === p
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-hover text-foreground-muted hover:border-accent/40 hover:text-foreground"
            }`}
          >
            Within {p}%
          </button>
        ))}
        <button
          type="button"
          onClick={chooseCustom}
          disabled={busy}
          className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors disabled:opacity-50 ${
            preset === "custom"
              ? "border-accent bg-accent/10 text-accent"
              : "border-border bg-hover text-foreground-muted hover:border-accent/40 hover:text-foreground"
          }`}
        >
          Custom range
        </button>
      </div>

      {preset === "custom" && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-[12px] text-foreground-muted">
            Minimum % below
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={customMin}
              onChange={(e) => setCustomMin(e.target.value)}
              className="mt-1 block w-[120px] rounded-md border border-border bg-hover px-2.5 py-1.5 text-sm outline-none"
              placeholder="e.g. 2"
            />
          </label>
          <label className="text-[12px] text-foreground-muted">
            Maximum % below
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={customMax}
              onChange={(e) => setCustomMax(e.target.value)}
              className="mt-1 block w-[120px] rounded-md border border-border bg-hover px-2.5 py-1.5 text-sm outline-none"
              placeholder="e.g. 8"
            />
          </label>
          <button
            type="button"
            onClick={applyCustom}
            disabled={busy}
            className="rounded-md bg-accent px-3 py-2 text-[12px] font-medium text-accent-foreground disabled:opacity-50"
          >
            {busy ? "Loading…" : "Show stocks"}
          </button>
        </div>
      )}

      {error && <p className="mt-3 rounded-lg bg-amber-bg px-3 py-2 text-[13px] text-amber">{error}</p>}
      {!data && !busy && !error && <p className="mt-3 text-[13px] text-foreground-faint">Choose a preset or a custom range.</p>}

      {data && (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[12px] text-foreground-muted">
              Showing {formatNumber(rows.length)} of {formatNumber(data.result_count)} stocks
            </p>
            <p className="text-[12px] text-foreground-faint">
              Data as of {data.as_of}
            </p>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2 sm:hidden">
            <label className="text-[12px] text-foreground-muted">
              Sort
              <select
                value={sort}
                onChange={(e) => changeSort(e.target.value)}
                className="ml-2 rounded-md border border-border bg-hover px-2 py-1 text-[12px]"
              >
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={() => changeSort(sort)}
              className="rounded-md border border-border px-2 py-1 text-[12px] text-foreground-muted"
            >
              {order === "asc" ? "Ascending" : "Descending"}
            </button>
          </div>

          {lockedRows > 0 && (
            <p className="mb-3 rounded-lg bg-hover px-3 py-2 text-[12px] text-foreground-muted">
              Free plan rows outside the fixed sample keep their price and sector; measured fields are locked.{" "}
              <Link href="/pricing" className="text-accent underline-offset-2 hover:underline">See plans</Link>
            </p>
          )}

          <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
            <table className="w-full min-w-[840px] text-sm">
              <thead>
                <tr className="border-b border-border font-mono text-[12px] uppercase tracking-wide text-foreground-faint">
                  <HeaderCell label="Symbol" field="symbol" sort={sort} order={order} onSort={changeSort} />
                  <HeaderCell label="Price" field="last_price" sort={sort} order={order} onSort={changeSort} align="right" />
                  <HeaderCell label="52-week high" field="week52_high" sort={sort} order={order} onSort={changeSort} align="right" />
                  <HeaderCell label="% below high" field="pct_below_52w_high" sort={sort} order={order} onSort={changeSort} align="right" />
                  <HeaderCell label="Volume 5d / 20d" field="volume_ratio_5_20" sort={sort} order={order} onSort={changeSort} align="right" />
                  <HeaderCell label="Delivery" field="delivery_pct" sort={sort} order={order} onSort={changeSort} align="right" />
                  <HeaderCell label="Volatility rank" field="volatility_rank" sort={sort} order={order} onSort={changeSort} />
                  <HeaderCell label="Sector" field="sector" sort={sort} order={order} onSort={changeSort} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.symbol} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 font-mono font-medium">
                        {r.symbol}
                        {r.locked && <Lock size={11} className="text-foreground-faint" aria-label="Locked" />}
                      </div>
                      <div className="max-w-[190px] truncate text-[12px] text-foreground-faint">{r.company_name}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{value(r, "last_price")}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{value(r, "week52_high")}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{value(r, "pct_below_52w_high")}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{value(r, "volume_ratio_5_20")}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{value(r, "delivery_pct")}</td>
                    <td className="px-3 py-2 text-[12px] text-foreground-muted">{value(r, "volatility_text")}</td>
                    <td className="px-3 py-2 text-[12px] text-foreground-muted">{value(r, "sector")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 sm:hidden">
            {rows.map((r) => (
              <div key={r.symbol} className="rounded-lg border border-border bg-hover p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-mono text-sm font-medium">
                      {r.symbol}
                      {r.locked && <Lock size={11} className="text-foreground-faint" aria-label="Locked" />}
                    </div>
                    <div className="truncate text-[12px] text-foreground-faint">{r.company_name}</div>
                  </div>
                  <div className="shrink-0 text-right text-[12px] text-foreground-muted">{r.sector || "—"}</div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
                  <div className="flex justify-between gap-2"><span className="text-foreground-faint">Price</span><span className="tabular-nums">{value(r, "last_price")}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-foreground-faint">52-week high</span><span className="tabular-nums">{value(r, "week52_high")}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-foreground-faint">% below</span><span className="tabular-nums">{value(r, "pct_below_52w_high")}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-foreground-faint">Volume 5d / 20d</span><span className="tabular-nums">{value(r, "volume_ratio_5_20")}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-foreground-faint">Delivery</span><span className="tabular-nums">{value(r, "delivery_pct")}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-foreground-faint">Volatility rank</span><span>{value(r, "volatility_text")}</span></div>
                </div>
              </div>
            ))}
          </div>

          {rows.length === 0 && <p className="text-sm text-foreground-muted">No stocks meet this condition.</p>}

          <p className="mt-3 text-[12px] text-foreground-faint">
            {data.short_history_count > 0
              ? `${formatNumber(data.short_history_count)} stocks have less than 52 weeks of data and are not shown.`
              : "All tracked stocks meet the 52-week data requirement."}
          </p>
          <p className="mt-1 text-[12px] text-foreground-faint">
            Shows stocks that meet the chosen condition. This is data, not a recommendation.
          </p>
        </div>
      )}
    </section>
  );
}
