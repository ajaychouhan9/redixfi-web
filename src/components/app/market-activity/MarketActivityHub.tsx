"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMarketActivity } from "@/lib/api/endpoints";
import type {
  MarketActivityRow,
  MarketActivityType,
  MarketActivityConcallRow,
  MarketActivityInsiderRow,
  MarketActivityCorporateEventRow,
  MarketActivityBulkBlockRow,
} from "@/lib/api/types";
import { downloadCsv } from "@/lib/csv";
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
          return {
            type: row.type,
            symbol: row.symbol,
            company_name: row.company_name ?? "",
            date: row.date,
            deal_type: String(row.dealType ?? ""),
            buy_sell: String(row.buySell ?? ""),
            quantity: row.quantity != null ? Number(row.quantity) : "",
            price: row.price != null ? Number(row.price) : "",
            client_name: String(row.clientName ?? ""),
          };
        case "corporate_event":
          return {
            type: row.type,
            symbol: row.symbol,
            company_name: row.company_name ?? "",
            date: row.date,
            event_type: String(row.event_type ?? ""),
          };
      }
    });
    downloadCsv(`redixfi-market-activity-${tab}-${new Date().toISOString().slice(0, 10)}.csv`, flat);
  }, [rows, tab]);

  return (
    <div>
      <MarketActivityTabs active={tab} onChange={setTab} />

      {filtersEnabled && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-raised p-3">
          <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs text-foreground-muted">
            <Filter size={12} />
            <input
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              placeholder="Symbol"
              className="w-28 bg-transparent outline-none"
            />
          </label>
          <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs text-foreground-muted">
            From
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-transparent outline-none" />
          </label>
          <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs text-foreground-muted">
            To
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-transparent outline-none" />
          </label>
          <div className="ml-auto">
            <ExportButton
              onExport={exportCsv}
              canExport={csvExportEnabled && !!user}
              label="Export CSV"
              enabledTitle="Export current view as CSV"
              className="flex items-center gap-1 rounded-lg border border-border bg-hover px-2 py-1.5 text-xs text-foreground-muted disabled:opacity-40"
            />
          </div>
        </div>
      )}
      {!filtersEnabled && csvExportEnabled && (
        <div className="mb-3 flex justify-end">
          <ExportButton onExport={exportCsv} canExport={!!user} label="Export CSV" className="flex items-center gap-1 rounded-lg border border-border bg-hover px-2 py-1.5 text-xs text-foreground-muted disabled:opacity-40" />
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
