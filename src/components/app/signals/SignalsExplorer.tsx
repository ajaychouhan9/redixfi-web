"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGetPaged } from "@/lib/api/client";
import type { SignalRow } from "@/lib/api/types";
import { SIGNAL_SECTORS } from "@/data/sectors";
import { SignalTableRow, type VisibleColumns } from "./SignalTableRow";
import { downloadCsv } from "@/lib/csv";
import { useAuth } from "@/lib/auth/AuthContext";
import { getWatchlist } from "@/lib/api/mutations";

const SORT_OPTIONS = [
  { value: "name", label: "Name (A–Z)" },
  // Task 09: genuinely market-cap-ordered now (symbols_master.market_cap,
  // backfilled from fundamentals_raw) — rows without a market_cap yet sort
  // last regardless of direction.
  { value: "market_cap", label: "Market cap" },
  { value: "composite_score", label: "Composite score" },
  { value: "delta_1d", label: "Score change" },
  { value: "delivery_pct", label: "Delivery %" },
  { value: "sector_rank", label: "Sector rank" },
  { value: "volume_ratio", label: "Volume ratio" },
] as const;

const PAGE_SIZE = 50;

export function SignalsExplorer() {
  const { user, getToken } = useAuth();
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("");
  const [scoreMin, setScoreMin] = useState("");
  const [scoreMax, setScoreMax] = useState("");
  const [eventRiskOnly, setEventRiskOnly] = useState(false);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[] | null>(null);
  // Default sort is name — NEVER score by default (compliance CURATION TEST).
  const [sort, setSort] = useState<string>("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [columns, setColumns] = useState<VisibleColumns>({ sector: true, marketCap: false, delivery: true, chips: true, eventRisk: true });
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);

  const [rows, setRows] = useState<SignalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!watchlistOnly || !user) return;
    (async () => {
      const token = await getToken();
      if (!token) return;
      const wl = await getWatchlist(token);
      setWatchlistSymbols(wl.symbols);
    })();
  }, [watchlistOnly, user, getToken]);

  const params = useMemo(
    () => ({
      q: q || undefined,
      sector: sector || undefined,
      score_min: scoreMin ? Number(scoreMin) : undefined,
      score_max: scoreMax ? Number(scoreMax) : undefined,
      event_risk: eventRiskOnly ? true : undefined,
      sort,
      order,
      page,
      size: PAGE_SIZE,
    }),
    [q, sector, scoreMin, scoreMax, eventRiskOnly, sort, order, page]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGetPaged<SignalRow>("/signals", { params })
      .then((env) => {
        if (cancelled) return;
        let data = env.data;
        if (watchlistOnly) {
          const set = new Set(watchlistSymbols ?? []);
          data = data.filter((r) => set.has(r.symbol));
        }
        setRows(data);
        setTotal(env.page_info.total);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load signals."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [params, watchlistOnly, watchlistSymbols]);

  useEffect(() => setPage(1), [q, sector, scoreMin, scoreMax, eventRiskOnly, watchlistOnly, sort, order]);

  const canExport = user && user.tier !== "free";

  const exportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const size = 200;
      const first = await apiGetPaged<SignalRow>("/signals", { params: { ...params, page: 1, size } });
      const pages = Math.ceil(first.page_info.total / size);
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
          apiGetPaged<SignalRow>("/signals", { params: { ...params, page: i + 2, size } })
        )
      );
      const all = [first, ...rest].flatMap((p) => p.data);
      downloadCsv(
        `redixfi-signals-${new Date().toISOString().slice(0, 10)}.csv`,
        all.map((r) => ({
          symbol: r.symbol,
          company_name: r.company_name,
          sector: r.sector,
          composite_score: r.composite_score ?? "",
          delta_1d: r.delta_1d ?? "",
          delivery_pct: r.delivery_pct ?? "",
          delivery_avg20: r.delivery_avg20 ?? "",
          sector_rank: r.sector_rank ?? "",
          event_risk: r.event_risk ?? "",
        }))
      );
    } finally {
      setExporting(false);
    }
  }, [params]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search company or symbol"
          className="w-52 rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm"
        />
        <select value={sector} onChange={(e) => setSector(e.target.value)} className="rounded-lg border border-border bg-transparent px-2 py-1.5 text-sm">
          <option value="">All sectors</option>
          {SIGNAL_SECTORS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={scoreMin}
          onChange={(e) => setScoreMin(e.target.value)}
          placeholder="Score min"
          type="number"
          className="w-24 rounded-lg border border-border bg-transparent px-2 py-1.5 text-sm"
        />
        <input
          value={scoreMax}
          onChange={(e) => setScoreMax(e.target.value)}
          placeholder="Score max"
          type="number"
          className="w-24 rounded-lg border border-border bg-transparent px-2 py-1.5 text-sm"
        />
        <label className="flex items-center gap-1.5 text-sm text-foreground-muted">
          <input type="checkbox" checked={eventRiskOnly} onChange={(e) => setEventRiskOnly(e.target.checked)} />
          Event risk
        </label>
        {user && (
          <label className="flex items-center gap-1.5 text-sm text-foreground-muted">
            <input type="checkbox" checked={watchlistOnly} onChange={(e) => setWatchlistOnly(e.target.checked)} />
            Watchlist only
          </label>
        )}

        <div className="ml-auto flex items-center gap-2">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-border bg-transparent px-2 py-1.5 text-sm">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Sort: {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}
            className="rounded-lg border border-border px-2 py-1.5 text-sm"
            title="Toggle sort order"
          >
            {order === "asc" ? "↑" : "↓"}
          </button>
          <div className="relative">
            <button onClick={() => setColumnPickerOpen((o) => !o)} className="rounded-lg border border-border px-2 py-1.5 text-sm">
              Columns ⚙
            </button>
            {columnPickerOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-surface-raised p-2 text-sm shadow-lg">
                {(Object.keys(columns) as (keyof VisibleColumns)[]).map((k) => (
                  <label key={k} className="flex items-center gap-2 py-1 capitalize">
                    <input
                      type="checkbox"
                      checked={columns[k]}
                      onChange={(e) => setColumns((c) => ({ ...c, [k]: e.target.checked }))}
                    />
                    {k === "eventRisk" ? "Event risk" : k === "marketCap" ? "Market cap" : k}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={exportCsv}
            disabled={!canExport || exporting}
            title={canExport ? "Export current filter as CSV" : "Upgrade to export CSV"}
            className="rounded-lg border border-border px-2 py-1.5 text-sm disabled:opacity-40"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
            <tr>
              <th className="px-3 py-2">Symbol</th>
              {columns.sector && <th className="px-3 py-2">Sector</th>}
              {columns.marketCap && <th className="px-3 py-2">Market cap</th>}
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Change</th>
              {columns.delivery && <th className="px-3 py-2">Delivery</th>}
              {columns.chips && <th className="px-3 py-2">Signals</th>}
              {columns.eventRisk && <th className="px-3 py-2 text-center">Event</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <SignalTableRow key={row.symbol} row={row} columns={columns} />
            ))}
          </tbody>
        </table>
        {loading && <div className="p-4 text-center text-sm text-foreground-muted">Loading…</div>}
        {!loading && rows.length === 0 && <div className="p-4 text-center text-sm text-foreground-muted">No stocks match these filters.</div>}
        {error && <div className="p-4 text-center text-sm text-down">{error}</div>}
      </div>

      {!watchlistOnly && (
        <div className="mt-3 flex items-center justify-between text-xs text-foreground-muted">
          <span>
            {total.toLocaleString("en-IN")} stocks · page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded border border-border px-2 py-1 disabled:opacity-40">
              Prev
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded border border-border px-2 py-1 disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      )}

      {!user?.tier || user.tier === "free" ? (
        <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
          {/* B5: was silent on WHICH 20 stay unlocked, which read as an
              implied "top by market cap" selection — the free-tier unlock
              set is a fixed A–Z sample regardless of sort (Task 04's
              free_tier_unlocked_symbols, name-asc so it can't be gamed by
              re-sorting), so the real rule is stated plainly instead. Task 09
              added a genuine symbols_master.market_cap field/sort, but it
              does not change which symbols are unlocked. */}
          Locked rows show 🔒 in place of scores — a fixed sample of 20 stocks (A–Z) stays visible on the free tier.{" "}
          <a href="/pricing" className="font-medium text-accent">
            Unlock all 750 measured scores
          </a>
          .
        </div>
      ) : null}
    </div>
  );
}
