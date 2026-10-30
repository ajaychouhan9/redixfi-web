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
  MarketActivityRedFlagRow,
} from "@/lib/api/types";
import { downloadCsv } from "@/lib/csv";
import { downloadXlsx } from "@/lib/xlsx";
import { formatDateTimeIst } from "@/lib/format";
import type { EventKind } from "@/lib/api/types";
import { ExportButton } from "@/components/ui/ExportButton";
import { UnlockBanner } from "@/components/ui/Locked";
import { MarketActivityTabs, type MarketActivityTabDef } from "./MarketActivityTabs";
import { ConcallsTable, InsiderTable, CorporateEventsTable, BulkBlockTable, RedFlagTable, AllActivityTable, eventName } from "./CategoryTables";

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
  // Corporate Events tab: two parts. Upcoming (scheduled) is the default.
  const [eventWhen, setEventWhen] = useState<"upcoming" | "recent">("upcoming");
  const [eventKind, setEventKind] = useState<EventKind | "">("");
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

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
      when: tab === "corporate_event" ? eventWhen : undefined,
      event_kind: tab === "corporate_event" && eventKind ? eventKind : undefined,
    }),
    [tab, symbolFilter, dateFrom, dateTo, eventWhen, eventKind]
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
          setLastFetchedAt(env.page_info.last_fetched_at ?? null);
        })
        .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load market activity."))
        .finally(() => !cancelled && setLoading(false));
    })();
    return () => {
      cancelled = true;
    };
  }, [params, getToken]);

  const buildExportRows = useCallback(() => {
    if (tab === "all") {
      const typeLabel: Record<MarketActivityType, string> = {
        concall: "Concall",
        insider: "Insider trade",
        corporate_event: "Corporate event",
        bulk_block: "Bulk/block deal",
        red_flag: "Governance disclosure",
      };
      return rows.map((row) => {
        let detail = "";
        switch (row.type) {
          case "concall":
            detail = row.subject === "EARNINGS_CALL_TRANSCRIPT" ? "Concall transcript" : "Investor presentation";
            break;
          case "insider":
            detail = `${row.transaction_type} · ${row.quantity.toLocaleString("en-IN")} shares · ₹${row.value_amount.toLocaleString("en-IN")}`;
            break;
          case "bulk_block": {
            const types = row.deal_types_present?.length ? row.deal_types_present.join("/") : "Deal";
            detail = `${types} · ${row.net_direction ?? "—"} · ${row.net_quantity != null ? Number(row.net_quantity).toLocaleString("en-IN") : "—"} shares`;
            break;
          }
          case "corporate_event":
            detail = eventName(row);
            break;
          case "red_flag":
            detail = `${row.category_label} · ${row.source_type_label}`;
            break;
        }
        return { date: row.date, symbol: row.symbol, type: typeLabel[row.type], detail };
      });
    }
    return rows.map((row) => {
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
            status: row.scheduled ? "Scheduled" : "Recorded",
            event: eventName(row),
            headline: row.headline ?? row.summary ?? "",
          };
        case "red_flag":
          return {
            type: row.type,
            symbol: row.symbol,
            company_name: row.company_name ?? "",
            date: row.date,
            category: row.category_label,
            source: row.source_type_label,
            fiscal_year: row.fiscal_year ?? "",
            finding: row.finding,
            source_pdf_url: row.source_pdf_url ?? "",
          };
      }
    });
  }, [rows, tab]);

  const exportCsv = useCallback(() => {
    const flat = buildExportRows();
    downloadCsv(`redixfi-market-activity-${tab}-${new Date().toISOString().slice(0, 10)}.csv`, flat);
  }, [buildExportRows, tab]);

  const exportXlsx = useCallback(() => {
    downloadXlsx(`redixfi-market-activity-${tab}-${new Date().toISOString().slice(0, 10)}.xlsx`, [{ name: tab === "all" ? "All Activity" : tab, rows: buildExportRows() }]);
  }, [buildExportRows, tab]);

  // BUG 3 fix (2026-08-16): these 4 data types are NOT daily events —
  // the hub itself never hard-required "today" (rows already come back
  // most-recent-first from the API regardless of date), but it also
  // never told the caller HOW recent what they're looking at is. Rows
  // are already sorted most-recent-first (backend BUG 8 fix), so the
  // first row's date is the honest "as of" date for whatever's
  // currently on screen — surfaced explicitly rather than left implicit.
  return (
    <div>
      <MarketActivityTabs active={tab} onChange={setTab} />
      {/* The time the data was last fetched, from the server. Never a row's
          event date (a scheduled future event is not an update). Hidden when
          the server has no fetch time for this view. */}
      {!loading && !error && lastFetchedAt && (
        <p className="mb-3 text-xs text-foreground-faint">Last updated: {formatDateTimeIst(lastFetchedAt)}</p>
      )}
      {tab === "corporate_event" && (
        <div className="mb-3 flex gap-1" role="group" aria-label="Corporate events view">
          {([
            ["upcoming", "Upcoming (scheduled)"],
            ["recent", "Recent"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setEventWhen(key)}
              aria-pressed={eventWhen === key}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                eventWhen === key ? "border-accent bg-accent/10 text-accent" : "border-border bg-hover text-foreground-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* BUG 5 fix (2026-08-16): re-uses SignalsExplorer.tsx's own filter-bar
          structure/sizing verbatim (2-tier wrapper — outer bg-surface-raised
          card, inner filter row — border-border/bg-hover/px-3
          py-1.5/text-xs on every control) instead of the previous
          ad-hoc-sized inline row. The symbol input is now SymbolTypeahead
          (BUG 4) instead of a bare <input>, and the date inputs get
          explicit text-xs/min-w sizing (previously bare, so they fell back
          to the browser's default ~16px control size — visibly smaller/
          larger than everything else in the bar and easy to misread as
          "too small"). Native <input type="date">'s calendar icon
          contrast is fixed globally in globals.css (`color-scheme`), not
          per-input, since it's a browser rendering default with no
          per-element color/size API.

          BUG 4 fix (2026-08-18): this row used `overflow-x-auto`, which
          clips SymbolTypeahead's absolutely positioned suggestion dropdown
          instead of letting it float below the Symbol field — the dropdown
          rendered but was invisible past the row's own scroll boundary.
          Swapped for `overflow-visible`: the row already wraps via
          `flex-wrap` when controls don't fit, so horizontal scrolling was
          never actually needed here. */}
      {filtersEnabled && (
        <div className="mb-3 rounded-xl border border-border bg-surface-raised p-3">
          <div className="flex flex-wrap items-center gap-2 overflow-visible pb-1">
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
            {tab === "corporate_event" && (
              <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs text-foreground-muted">
                Event type
                <select
                  value={eventKind}
                  onChange={(e) => setEventKind(e.target.value as EventKind | "")}
                  className="bg-transparent text-xs text-foreground outline-none"
                  aria-label="Filter by event type"
                >
                  <option value="">All</option>
                  <option value="results">Results</option>
                  <option value="dividend">Dividend</option>
                  <option value="split_bonus">Split/Bonus</option>
                </select>
              </label>
            )}
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
                onCsv={exportCsv}
                onXlsx={exportXlsx}
                canExport={csvExportEnabled && !!user}
                label="Download"
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
            onCsv={exportCsv}
            onXlsx={exportXlsx}
            canExport={!!user}
            label="Download"
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
            <CorporateEventsTable
              rows={rows.filter((r): r is MarketActivityCorporateEventRow => r.type === "corporate_event")}
              emptyText={eventWhen === "upcoming" ? "No scheduled corporate events on file." : "No recent corporate events recorded."}
            />
          </div>
        ) : tab === "bulk_block" ? (
          <div className="p-4">
            <BulkBlockTable rows={rows.filter((r): r is MarketActivityBulkBlockRow => r.type === "bulk_block")} />
          </div>
        ) : (
          <div className="p-4">
            <RedFlagTable rows={rows.filter((r): r is MarketActivityRedFlagRow => r.type === "red_flag")} />
          </div>
        )}

        {!loading && !error && !csvExportEnabled && maxRows !== null && rows.length >= maxRows && (
          <UnlockBanner
            label={`Showing the latest ${maxRows} entries for your plan. Pro gets full history, filters, and CSV export.`}
            cta="Upgrade to Pro"
          />
        )}
      </div>
    </div>
  );
}
