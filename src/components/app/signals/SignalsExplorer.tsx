"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Filter, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { getSignals } from "@/lib/api/endpoints";
import type { SignalRow } from "@/lib/api/types";
import { SIGNAL_SECTORS } from "@/data/sectors";
import { SignalTableRow, type VisibleColumns } from "./SignalTableRow";
import { UnlockBanner } from "@/components/ui/Locked";
import { ExportButton } from "@/components/ui/ExportButton";
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
  // Column spec (2026-08-08, finalized): Symbol/Price/Score are always on
  // (not in this picker state at all). VWAP removed — intraday-only,
  // wrong fit for this evening/post-close table (stays on the Intraday
  // Scanner page). Volume (5d ratio) added.
  const [columns, setColumns] = useState<VisibleColumns>({ sector: true, delivery: true, volume: true, chips: true, eventRisk: true });
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);

  const [rows, setRows] = useState<SignalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    // Bug fix: this fetch never sent the caller's auth token, so B8's
    // per-tier masking always saw an anonymous/free request here — a
    // logged-in paid user's Signal Dashboard list showed the same masked
    // composite_score/locked rows a free visitor would. getToken()
    // resolves to null when logged out, matching the previous (correct)
    // anonymous behavior for that case.
    (async () => {
      const token = await getToken();
      getSignals(params, { token })
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
    })();
    return () => {
      cancelled = true;
    };
  }, [params, watchlistOnly, watchlistSymbols, getToken]);

  useEffect(() => setPage(1), [q, sector, scoreMin, scoreMax, eventRiskOnly, watchlistOnly, sort, order]);

  // Multi-tier restructure (2026-08-08) — CSV export is now Pro-only
  // (was any-paid-tier). "founding" resolves to Pro-equivalent, matching
  // core/plan_limits.py::resolve_tier() server-side (a founding
  // subscriber shouldn't lose a capability they already had while their
  // account awaits the founder's manual decision).
  const canExport = user && (user.tier === "pro" || user.tier === "founding");
  // The core new differentiation mechanic: Basic sees the full, unmasked
  // table but with NO sort/filter/search controls — server-side
  // (routers/signals.py) already ignores these params for a Basic
  // caller and forces the fixed default order regardless of what this
  // component sends, so hiding the controls here is a UX match for that
  // real enforcement, not the enforcement itself. "paid" (legacy,
  // pre-migration) treated the same as "basic" — matches
  // core/plan_limits.py::resolve_tier() server-side. Unaffected for
  // free/anonymous, per the task's own "confirm free tier unaffected"
  // instruction.
  const explorerControlsEnabled = user?.tier !== "basic" && user?.tier !== "paid";

  const exportCsv = useCallback(async () => {
    // Bug fix (2026-08-08) — this fetch never sent the caller's auth
    // token (the 4th occurrence of this project's recurring auth-token
    // bug pattern, caught during this session's explicit audit): every
    // export request hit the backend anonymously, so a paying Pro
    // subscriber's CSV silently came back free-tier-masked (locked rows,
    // composite_score/etc. nulled outside the fixed unlocked sample) even
    // though the button itself is gated on `canExport`. Same getToken()
    // pattern the main list-fetch effect above already uses correctly.
    const token = await getToken();
    const size = 200;
    const first = await getSignals({ ...params, page: 1, size }, { token });
    const pages = Math.ceil(first.page_info.total / size);
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
        getSignals({ ...params, page: i + 2, size }, { token })
      )
    );
    const all = [first, ...rest].flatMap((p) => p.data);
    // Column spec (2026-08-08, finalized) — a fuller set than the table's
    // own 8 visible columns, since a CSV should give more than a
    // screenshot would. Signal Chips flattened to one comma-separated
    // field (not one column per possible chip) so the CSV stays tabular.
    downloadCsv(
      `redixfi-signals-${new Date().toISOString().slice(0, 10)}.csv`,
      all.map((r) => ({
        symbol: r.symbol,
        company_name: r.company_name,
        sector: r.sector,
        industry: r.industry ?? "",
        price: r.last_price ?? "",
        day_change_pct: r.day_change_pct ?? "",
        score: r.composite_score ?? "",
        score_change_1d: r.delta_1d ?? "",
        delivery_pct: r.delivery_pct ?? "",
        delivery_avg20: r.delivery_avg20 ?? "",
        volume_ratio_5d: r.volume_ratio_5d ?? "",
        signal_chips: r.signal_states.join(", "),
        event_risk: r.event_risk ?? "",
      }))
    );
  }, [params, getToken]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      {!explorerControlsEnabled && (
        <p className="mb-3 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-foreground-muted">
          Basic shows the full table, sorted A–Z. For a filtered or sorted view, ask Ask-RedixFi AI directly — e.g.
          &quot;highest composite score today&quot; or &quot;IT sector stocks with high delivery&quot;.
        </p>
      )}
      {/* Step 5 polish (2026-08-11): wrapped in a card (border+background+
          padding) so the filter bar reads as one cohesive design-system
          element instead of a bare row of pills — each control keeps its
          own border but now sits on `bg-hover` for depth against the
          card's `bg-surface-raised`, same layering SmartScreenerBox's own
          input row already uses. All filter logic below is unchanged. */}
      <div className="mb-3 rounded-xl border border-border bg-surface-raised p-3">
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
          {explorerControlsEnabled && (
            <>
              <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs text-foreground-muted">
                <Search size={12} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search company or symbol"
                  className="w-36 bg-transparent outline-none sm:w-44"
                />
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="shrink-0 rounded-lg border border-border bg-hover px-2 py-1.5 text-xs text-foreground-muted"
              >
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
                className="w-20 shrink-0 rounded-lg border border-border bg-hover px-2 py-1.5 text-xs"
              />
              <input
                value={scoreMax}
                onChange={(e) => setScoreMax(e.target.value)}
                placeholder="Score max"
                type="number"
                className="w-20 shrink-0 rounded-lg border border-border bg-hover px-2 py-1.5 text-xs"
              />
              <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs text-foreground-muted">
                <Filter size={12} />
                <input type="checkbox" checked={eventRiskOnly} onChange={(e) => setEventRiskOnly(e.target.checked)} />
                Event risk
              </label>
            </>
          )}
          {user && (
            <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs text-foreground-muted">
              <input type="checkbox" checked={watchlistOnly} onChange={(e) => setWatchlistOnly(e.target.checked)} />
              Watchlist only
            </label>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {explorerControlsEnabled && (
              <>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="rounded-lg border border-border bg-hover px-2 py-1.5 text-xs text-foreground-muted"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      Sort: {o.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}
                  className="flex items-center gap-1 rounded-lg border border-border bg-hover px-2 py-1.5 text-xs text-foreground-muted"
                  title="Toggle sort order"
                >
                  <ArrowUpDown size={11} /> {order === "asc" ? "↑" : "↓"}
                </button>
              </>
            )}
            <div className="relative">
              <button
                onClick={() => setColumnPickerOpen((o) => !o)}
                className="flex items-center gap-1 rounded-lg border border-border bg-hover px-2 py-1.5 text-xs text-foreground-muted"
              >
                <SlidersHorizontal size={11} /> Columns
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
                      {k === "eventRisk" ? "Event risk" : k}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <ExportButton
              onExport={exportCsv}
              canExport={!!canExport}
              label="CSV"
              enabledTitle="Export current filter as CSV"
              className="flex items-center gap-1 rounded-lg border border-border bg-hover px-2 py-1.5 text-xs text-foreground-muted disabled:opacity-40"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-foreground-faint">
                <th className="px-4 py-3">Symbol</th>
                {columns.sector && <th className="hidden px-3 py-3 md:table-cell">Sector</th>}
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Score</th>
                {columns.delivery && <th className="hidden px-3 py-3 sm:table-cell">Delivery</th>}
                {columns.volume && <th className="hidden px-3 py-3 sm:table-cell">Volume</th>}
                {columns.chips && <th className="hidden px-3 py-3 lg:table-cell">Signals</th>}
                {columns.eventRisk && <th className="hidden px-3 py-3 text-center sm:table-cell">Event</th>}
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <SignalTableRow key={row.symbol} row={row} columns={columns} />
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-4 text-center text-sm text-foreground-muted">Loading…</div>}
        {!loading && rows.length === 0 && <div className="p-4 text-center text-sm text-foreground-muted">No stocks match these filters.</div>}
        {error && <div className="p-4 text-center text-sm text-down">{error}</div>}

        {!user?.tier || user.tier === "free" ? (
          // B5: was silent on WHICH 20 stay unlocked, which read as an
          // implied "top by market cap" selection — the free-tier unlock
          // set is a fixed A–Z sample regardless of sort (Task 04's
          // free_tier_unlocked_symbols, name-asc so it can't be gamed by
          // re-sorting), so the real rule is stated plainly here.
          <UnlockBanner label="Locked rows show 🔒 in place of scores — a fixed sample of 20 stocks (A–Z) stays visible on the free tier." />
        ) : null}
      </div>

      {!watchlistOnly && (
        <div className="mt-3 flex items-center justify-between text-xs text-foreground-muted">
          <span className="font-mono">
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
    </div>
  );
}
