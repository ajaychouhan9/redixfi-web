import Link from "next/link";
import type {
  MarketActivityConcallRow,
  MarketActivityInsiderRow,
  MarketActivityCorporateEventRow,
  MarketActivityBulkBlockRow,
  MarketActivityRedFlagRow,
  MarketActivityRow,
} from "@/lib/api/types";
import { formatDateIst } from "@/lib/format";
import { Chip } from "@/components/ui/Chip";

/** Per-category tables (2026-08-15) — each reuses the EXACT column
 * choices ResearchDetail.tsx already renders per-stock (insider: date/
 * insider/type/qty/value; concalls: type chip + tone + date + summary +
 * source link), just made cross-stock with a Symbol column added and
 * every row linking back to /research/{symbol}. Columns genuinely
 * differ per category, per the locked spec — no shared-columns generic
 * table across tabs (the "All" tab below is the only unified view). */

const TONE_CHIP_TONE: Record<string, "up" | "down" | "amber"> = {
  Positive: "up",
  Negative: "down",
  Mixed: "amber",
  Neutral: "amber",
};

function SymbolLink({ symbol, companyName }: { symbol: string; companyName: string | null }) {
  return (
    <Link href={`/research/${symbol}`} className="font-medium hover:text-accent" title={companyName ?? undefined}>
      {symbol}
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="p-4 text-center text-sm text-foreground-muted">{text}</p>;
}

export function ConcallsTable({ rows }: { rows: MarketActivityConcallRow[] }) {
  if (rows.length === 0) return <EmptyState text="No concall transcripts or investor presentations recorded yet." />;
  return (
    <div className="space-y-3">
      {rows.map((c, i) => (
        <div key={`${c.symbol}-${i}`} className="rounded-lg border border-border bg-surface-raised p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <SymbolLink symbol={c.symbol} companyName={c.company_name} />
              <span className="rounded-full bg-neutral-bg px-2 py-0.5 font-semibold uppercase tracking-wide text-foreground-muted">
                {c.subject === "EARNINGS_CALL_TRANSCRIPT" ? "Concall transcript" : "Investor presentation"}
              </span>
              {TONE_CHIP_TONE[c.tone_label] && <Chip tone={TONE_CHIP_TONE[c.tone_label]}>{c.tone_label}</Chip>}
              <span className="text-foreground-faint">{formatDateIst(c.filing_date)}</span>
            </div>
            <a
              href={c.source_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-hover px-3 py-1.5 text-[13px] font-medium text-foreground-muted hover:text-foreground"
            >
              View source filing →
            </a>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{c.summary}</p>
        </div>
      ))}
    </div>
  );
}

/** Same card pattern as ConcallsTable above (deliberately, per Task 2's
 * "preserve visual symmetry" requirement) — a chip row + finding text +
 * source link, one card per document-level occurrence. `finding` is
 * model-generated but was produced once at classification time by
 * data-pipeline/risk_flag_backfill.py, never at request time (see
 * core/red_flag_view.py's module docstring) — same posture as concall's
 * own pre-generated `summary`. `chunk_count` (when >1) tells the reader
 * multiple passages in the same filing support this finding, without
 * rendering them as separate rows. */
export function RedFlagTable({ rows }: { rows: MarketActivityRedFlagRow[] }) {
  if (rows.length === 0) return <EmptyState text="No governance red flags identified in filed documents yet." />;
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={`${r.symbol}-${i}`} className="rounded-lg border border-border bg-surface-raised p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <SymbolLink symbol={r.symbol} companyName={r.company_name} />
              <span className="rounded-full bg-neutral-bg px-2 py-0.5 font-semibold uppercase tracking-wide text-foreground-muted">
                {r.category_label}
              </span>
              <span className="text-foreground-faint">
                {r.source_type_label}
                {r.fiscal_year ? ` · ${r.fiscal_year}` : r.filing_date ? ` · ${formatDateIst(r.filing_date)}` : ""}
              </span>
            </div>
            {r.source_pdf_url && (
              <a
                href={r.source_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-hover px-3 py-1.5 text-[13px] font-medium text-foreground-muted hover:text-foreground"
              >
                View source filing →
              </a>
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{r.finding}</p>
        </div>
      ))}
    </div>
  );
}

export function InsiderTable({ rows }: { rows: MarketActivityInsiderRow[] }) {
  if (rows.length === 0) return <EmptyState text="No insider filings recorded." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
          <tr>
            <th className="py-1.5 pr-3">Date</th>
            <th className="py-1.5 pr-3">Symbol</th>
            <th className="py-1.5 pr-3">Insider</th>
            <th className="py-1.5 pr-3">Type</th>
            <th className="py-1.5 pr-3">Qty</th>
            <th className="py-1.5 pr-3">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.filing_id} className="border-t border-border">
              <td className="py-1.5 pr-3">{formatDateIst(t.trade_date)}</td>
              <td className="py-1.5 pr-3">
                <SymbolLink symbol={t.symbol} companyName={t.company_name} />
              </td>
              <td className="py-1.5 pr-3">{t.insider_name || "—"}</td>
              <td className="py-1.5 pr-3">{t.transaction_type}</td>
              <td className="py-1.5 pr-3 tabular-nums">{t.quantity.toLocaleString("en-IN")}</td>
              <td className="py-1.5 pr-3 tabular-nums">₹{t.value_amount.toLocaleString("en-IN")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Renders a generic-fallback cell value defensively: never String()s an
 * object/array directly (that was BUG 6's exact root cause — a nested
 * "meta" object on corporate_events docs rendering as literal
 * "[object Object]"). Arrays render as a comma-joined list (still
 * meaningful, e.g. deal_types_present); plain objects render as "—"
 * since there's no single scalar to show. */
function safeCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return "—";
  return String(value);
}

/** A row's `symbol` is only usable here once it's a resolved NSE symbol.
 * When resolution failed, the API still returns the row with `symbol` set
 * to the raw BSE numeric scrip code (e.g. "524723") — the Corporate
 * Events page is NSE-only, so those rows have nothing valid to link to
 * and are filtered out client-side. The record itself is untouched in
 * Mongo; this is presentation-only. */
function hasResolvedNseSymbol(symbol: string): boolean {
  return !/^\d+$/.test(symbol.trim());
}

/** Plain event name; never the bare enum ("RESULTS"). */
export function eventName(r: { event_label?: string | null; event_type?: string | null }): string {
  if (r.event_label) return r.event_label;
  const t = (r.event_type ?? "").replace(/_/g, " ").toLowerCase();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Corporate event";
}

function ScheduledChip() {
  return (
    <span className="ml-1.5 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
      Scheduled
    </span>
  );
}

export function CorporateEventsTable({
  rows,
  emptyText = "No corporate events recorded.",
}: {
  rows: MarketActivityCorporateEventRow[];
  emptyText?: string;
}) {
  const visibleRows = rows.filter((r) => hasResolvedNseSymbol(r.symbol));
  if (visibleRows.length === 0) return <EmptyState text={emptyText} />;
  // Compact three-column layout (Date / Symbol / Event with the headline
  // underneath) so it fits a 390px phone without sideways scrolling.
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
          <tr>
            <th className="w-24 py-1.5 pr-3 sm:w-28">Date</th>
            <th className="w-24 py-1.5 pr-3 sm:w-28">Symbol</th>
            <th className="py-1.5 pr-3">Event</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((r, i) => (
            <tr key={`${r.symbol}-${r.date}-${i}`} className="border-t border-border">
              <td className="whitespace-nowrap py-1.5 pr-3 align-top">{formatDateIst(r.date)}</td>
              <td className="break-words py-1.5 pr-3 align-top">
                <SymbolLink symbol={r.symbol} companyName={r.company_name} />
              </td>
              <td className="break-words py-1.5 pr-3 align-top">
                <span className="font-medium">{eventName(r)}</span>
                {r.scheduled && <ScheduledChip />}
                {r.headline && r.headline !== eventName(r) && (
                  <div className="mt-0.5 text-xs text-foreground-muted">{safeCell(r.headline)}</div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BulkBlockTable({ rows }: { rows: MarketActivityBulkBlockRow[] }) {
  if (rows.length === 0) return <EmptyState text="No bulk/block deals recorded recently." />;
  // bulk_block_deals real field shape (verified against data-pipeline/
  // nse_bulk_block_deal.py, BUG 7 fix 2026-08-16): a per-symbol-per-day
  // AGGREGATE summary doc — net_direction/net_quantity/buy_quantity/
  // sell_quantity/total_value/deal_types_present/participation_pct/
  // deal_strength — NOT a per-deal dealType/buySell/clientName/quantity/
  // price row (that shape never existed on the stored document, which
  // is why those columns were always blank).
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
          <tr>
            <th className="py-1.5 pr-3">Date</th>
            <th className="py-1.5 pr-3">Symbol</th>
            <th className="py-1.5 pr-3">Type</th>
            <th className="py-1.5 pr-3">Net direction{/* compliance-ignore: exchange-derived net buy/sell direction (aggregate field), not an instruction */}</th>
            <th className="py-1.5 pr-3">Net qty</th>
            <th className="py-1.5 pr-3">Value</th>
            <th className="py-1.5 pr-3">Strength</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.symbol}-${i}`} className="border-t border-border">
              <td className="py-1.5 pr-3">{formatDateIst(r.date)}</td>
              <td className="py-1.5 pr-3">
                <SymbolLink symbol={r.symbol} companyName={r.company_name} />
              </td>
              <td className="py-1.5 pr-3">{r.deal_types_present && r.deal_types_present.length ? r.deal_types_present.join(", ") : "—"}</td>
              <td className="py-1.5 pr-3">{r.net_direction ?? "—"}</td>
              <td className="py-1.5 pr-3 tabular-nums">{r.net_quantity != null ? Number(r.net_quantity).toLocaleString("en-IN") : "—"}</td>
              <td className="py-1.5 pr-3 tabular-nums">{r.total_value != null ? `₹${Number(r.total_value).toLocaleString("en-IN")}` : "—"}</td>
              <td className="py-1.5 pr-3">{r.deal_strength ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TYPE_LABEL: Record<MarketActivityRow["type"], string> = {
  concall: "Concall",
  insider: "Insider trade",
  corporate_event: "Corporate event",
  bulk_block: "Bulk/block deal",
  red_flag: "Red flag",
};

function summaryLine(row: MarketActivityRow): string {
  switch (row.type) {
    case "concall":
      return row.subject === "EARNINGS_CALL_TRANSCRIPT" ? "Concall transcript" : "Investor presentation";
    case "insider":
      return `${row.transaction_type} · ${row.quantity.toLocaleString("en-IN")} shares · ₹${row.value_amount.toLocaleString("en-IN")}`;
    case "bulk_block": {
      const types = row.deal_types_present && row.deal_types_present.length ? row.deal_types_present.join("/") : "Deal";
      return `${types} · ${row.net_direction ?? "—"} · ${row.net_quantity != null ? Number(row.net_quantity).toLocaleString("en-IN") : "—"} shares`;
    }
    case "corporate_event":
      return eventName(row);
    case "red_flag":
      return `${row.category_label} · ${row.source_type_label}`;
  }
}

/** "All" tab — unified chronological feed, every row tagged with its
 * type (locked spec). Columns genuinely differ per category, so this
 * doesn't try to force them into shared columns — one summary line per
 * row instead, same "compact rollup" register as the Home card. */
export function AllActivityTable({ rows }: { rows: MarketActivityRow[] }) {
  if (rows.length === 0) return <EmptyState text="No market activity recorded recently." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
          <tr>
            <th className="py-1.5 pr-3">Date</th>
            <th className="py-1.5 pr-3">Symbol</th>
            <th className="py-1.5 pr-3">Type</th>
            <th className="py-1.5 pr-3">Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.type}-${row.symbol}-${i}`} className="border-t border-border">
              <td className="py-1.5 pr-3">{formatDateIst(row.date)}</td>
              <td className="py-1.5 pr-3">
                <SymbolLink symbol={row.symbol} companyName={row.company_name} />
              </td>
              <td className="py-1.5 pr-3">
                <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  {TYPE_LABEL[row.type]}
                </span>
              </td>
              <td className="py-1.5 pr-3 text-foreground-muted">{summaryLine(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
