"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMarketActivity } from "@/lib/api/endpoints";
import { SymbolTypeahead } from "@/components/ui/SymbolTypeahead";
import type {
  MarketActivityRow,
  MarketActivityType,
  MarketActivityConcallRow,
  MarketActivityInsiderRow,
  MarketActivityCorporateEventRow,
  MarketActivityBulkBlockRow,
} from "@/lib/api/types";
import { downloadCsv } from "@/lib/csv";
import { formatDateIst } from "@/lib/format";
import { ExportButton } from "@/components/ui/ExportButton";
import { UnlockBanner } from "@/components/ui/Locked";
import { MarketActivityTabs, type MarketActivityTabDef } from "./MarketActivityTabs";
import { ConcallsTable, InsiderTable, CorporateEventsTable, BulkBlockTable, AllActivityTable } from "./CategoryTables";

/** Market Activity hub (2026-08-15) — cross-stock tabs for concalls,
 * insider trades, corporate events, bulk/block deals: all 4 already
 * exist and render per-stock, unmasked for every tier, on
 * ResearchDetail.tsx. This is that same data, aggregated, not a new
 * fetch pattern being invented — same client-fetch-with-real-token shape
 * SignalsExplorer.tsx already established (server-side row cap/filter
 * gating depends on the caller's real tier, so an anonymous fetch would
 * silently under-serve a paying user — the exact auth-token bug class
 * this codebase has hit 4 times before).
 *
 * Tier gating is read from the API's OWN page_info
 * (filters_enabled/csv_export_enabled/max_rows — sourced server-side
 * from core/plan_limits.py::capabilities_for(tier).market_activity_*
 * and the SAME .csv_export flag Signals/Research export already use),
 * not re-guessed from a duplicated tier-string literal here — a more
 * accurate source of truth than the existing ResearchExportButton/
 * SignalsExplorer pattern, while still driven by the identical
 * underlying config and the identical ExportButton/downloadCsv
 * mechanism those two already use. */
export function MarketActivityHub() {
  const { user, getToken } = useAuth();
  const [tab, setTab] = useState<MarketActivityTabDef["key"]>("all");
  const [symbolFilter, setSymbolFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [rows, setRows] = useState<MarketActivityRow[]>([]);
  const [maxRows, setMaxRows] = useState<number | null>(null);
  const [filtersEnabled, setFiltersEnabled] = useState(false);
  const [csvExportEnabled, setCsvExportEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      type: tab === "all" ? undefined : (tab as MarketActivityType),
      symbol: symbolFilter ? symbolFilter.trim().toUpperCase() : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [tab, symbolFilter, dateFrom, dateTo]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const token = await getToken();
      getMarketActivity(params, { token })
        .then((env) => {
          if (cancelled) return;
          setRows(env.data);
          setMaxRows(env.page_info.max_rows);
          setFiltersEnabled(env.page_info.filters_enabled);
          setCsvExportEnabled(env.page_info.csv_export_enabled);
        })
        .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load market activity."))
        .finally(() => !cancelled && setLoading(false));
    })();
    return () => {
      cancelled = true;
    };
  }, [params, getToken]);

  const exportCsv = useCallback(() => {
    const flat = rows.map((row) => {
      switch (row.type) {
        case "concall":
          return {
            type: row.type,
            symbol: row.symbol,
            company_name: row.company_name ?? "",
            date: row.filing_date,
            subject: row.subject,
            tone: row.tone_label,
            summary: row.summary,
            source_pdf_url: row.source_pdf_url,
          };
        case "insider":
          return {
            type: row.type,
            symbol: row.symbol,
            company_name: row.company_name ?? "",
            date: row.trade_date,
            insider_name: row.insider_name,
            transaction_type: row.transaction_type,
            quantity: row.quantity,
            value_amount: row.value_amount,
            relation: row.relation ?? "",
          };
        case "bulk_block":
          // Real bulk_block_deals field shape (BUG 7 fix, 2026-08-16) —
          // a per-symbol-per-day aggregate, not a per-deal row.
          return {
            type: row.type,
            symbol: row.symbol,
            company_name: row.company_name ?? "",
            date: row.date,
            deal_types_present: row.deal_types_present ? row.deal_types_present.join("/") : "",
            net_direction: row.net_direction ?? "",
            net_quantity: row.net_quantity != null ? Number(row.net_quantity) : "",
            total_value: row.total_value != null ? Number(row.total_value) : "",
            participation_pct: row.participation_pct != null ? Number(row.participation_pct) : "",
            deal_strength: row.deal_strength ?? "",
          };
        case "corporate_event":
          return {
            type: row.type,
            symbol: row.symbol,
            company_name: row.company_name ?? "",
            date: row.date,
            event_type: row.event_type ?? "",
            headline: row.headline ?? row.summary ?? "",
          };
      }
    });
    downloadCsv(`redixfi-market-activity-${tab}-${new Date().toISOString().slice(0, 10)}.csv`, flat);
  }, [rows, tab]);

  // BUG 3 fix (2026-08-16): these 4 data types are NOT daily events —
  // the hub itself never hard-required "today" (rows already come back
  // most-recent-first from the API regardless of date), but it also
  // never told the caller HOW recent what they're looking at is. Rows
  // are already sorted most-recent-first (backend BUG 8 fix), so the
  // first row's date is the honest "as of" date for whatever's
  // currently on screen — surfaced explicitly rather than left implicit.
  const latestDate = rows[0]?.date;

  return (
    <div>
      <MarketActivityTabs active={tab} onChange={setTab} />
      {!loading && !error && latestDate && (
        <p className="mb-3 text-xs text-foreground-faint">Last updated: {formatDateIst(latestDate)}</p>
      )}

      {/* BUG 5 fix (2026-08-16): re-uses SignalsExplorer.tsx's own filter-bar
          structure/sizing verbatim (2-tier wrapper — outer bg-surface-raised
          card, inner overflow-x-auto row — border-border/bg-hover/px-3
          py-1.5/text-xs on every control) instead of the previous
          ad-hoc-sized inline row. The symbol input is now SymbolTypeahead
          (BUG 4) instead of a bare <input>, and the date inputs get
          explicit text-xs/min-w sizing (previously bare, so they fell back
          to the browser's default ~16px control size — visibly smaller/
          larger than everything else in the bar and easy to misread as
          "too small"). Native <input type="date">'s calendar icon
          contrast is fixed globally in globals.css (`color-scheme`), not
          per-input, since it's a browser rendering default with no
          per-element color/size API. */}
      {filtersEnabled && (
        <div className="mb-3 rounded-xl border border-border bg-surface-raised p-3">
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
            <SymbolTypeahead
              value={symbolFilter}
              onChange={setSymbolFilter}
              onSelect={(row) => setSymbolFilter(row.canonicalSymbol)}
              placeholder="Symbol"
              ariaLabel="Filter by symbol"
              wrapperClassName="relative shrink-0"
              showIcon={false}
              inputClassName="w-28 shrink-0 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs text-foreground-muted outline-none focus:border-accent"
            />
            <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs text-foreground-muted">
              From
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="min-w-[120px] bg-transparent text-xs text-foreground outline-none"
              />
            </label>
            <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs text-foreground-muted">
              To
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="min-w-[120px] bg-transparent text-xs text-foreground outline-none"
              />
            </label>
            <div className="ml-auto shrink-0">
              <ExportButton
                onExport={exportCsv}
                canExport={csvExportEnabled && !!user}
                label="Export CSV"
                enabledTitle="Export current view as CSV"
                className="flex items-center gap-1 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs text-foreground-muted disabled:opacity-40"
              />
            </div>
          </div>
        </div>
      )}
      {!filtersEnabled && csvExportEnabled && (
        <div className="mb-3 flex justify-end">
          <ExportButton
            onExport={exportCsv}
            canExport={!!user}
            label="Export CSV"
            className="flex items-center gap-1 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs text-foreground-muted disabled:opacity-40"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
        {loading ? (
          <div className="p-4 text-center text-sm text-foreground-muted">Loading…</div>
        ) : error ? (
          <div className="p-4 text-center text-sm text-down">{error}</div>
        ) : tab === "all" ? (
          <div className="p-4">
            <AllActivityTable rows={rows} />
          </div>
        ) : tab === "concall" ? (
          <div className="p-4">
            <ConcallsTable rows={rows.filter((r): r is MarketActivityConcallRow => r.type === "concall")} />
          </div>
        ) : tab === "insider" ? (
          <div className="p-4">
            <InsiderTable rows={rows.filter((r): r is MarketActivityInsiderRow => r.type === "insider")} />
          </div>
        ) : tab === "corporate_event" ? (
          <div className="p-4">
            <CorporateEventsTable rows={rows.filter((r): r is MarketActivityCorporateEventRow => r.type === "corporate_event")} />
          </div>
        ) : (
          <div className="p-4">
            <BulkBlockTable rows={rows.filter((r): r is MarketActivityBulkBlockRow => r.type === "bulk_block")} />
          </div>
        )}

        {!loading && !error && maxRows !== null && rows.length >= maxRows && (
          <UnlockBanner
            label={`Showing the latest ${maxRows} entries for your plan. Pro gets full history, filters, and CSV export.`}
            cta="Upgrade to Pro"
          />
        )}
      </div>
    </div>
  );
}
