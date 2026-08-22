import Link from "next/link";
import type {
  MarketActivityConcallRow,
  MarketActivityInsiderRow,
  MarketActivityCorporateEventRow,
  MarketActivityBulkBlockRow,
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

export function CorporateEventsTable({ rows }: { rows: MarketActivityCorporateEventRow[] }) {
  const visibleRows = rows.filter((r) => hasResolvedNseSymbol(r.symbol));
  if (visibleRows.length === 0) return <EmptyState text="No upcoming corporate events recorded." />;
  // corporate_events' real field shape (verified against data-pipeline/
  // corprate_event.py's CorporateEvent dataclass, BUG 6 fix 2026-08-16):
  // event_type/headline are reliable, known columns — shown explicitly
  // instead of guessed generic ones. `meta` (a nested object) and any
  // other non-scalar field are explicitly excluded from the generic
  // fallback columns below, and safeCell() guards every cell as
  // defense-in-depth against any other object-valued field this
  // collection's live shape might still surprise us with.
  const knownKeys = new Set([
    "type", "symbol", "company_name", "date", "event_date", "valid_till",
    "event_type", "headline", "meta", "source_symbol",
  ]);
  const extraCols = Array.from(new Set(visibleRows.flatMap((r) => Object.keys(r))))
    .filter((k) => !knownKeys.has(k))
    .filter((k) => visibleRows.every((r) => typeof r[k] !== "object" || r[k] === null))
    .slice(0, 2);
  return (
    <div className="overflow-x-auto">
      {/* table-fixed + explicit widths on every column except Headline stop
       * long values (e.g. event_type "MANAGEMENT_CHANGE") from stealing
       * space from — or visually overlapping — neighboring columns. Every
       * fixed-width column also gets break-words so a long single "word"
       * (no spaces, e.g. underscored enum values) wraps inside its own
       * cell instead of overflowing into the next one. Headline is the
       * only column left unsized, so table-fixed hands it 100% of
       * whatever width remains. */}
      <table className="w-full min-w-[720px] table-fixed text-sm">
        <thead className="text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
          <tr>
            <th className="w-24 py-1.5 pr-3 sm:w-28">Date</th>
            <th className="w-24 py-1.5 pr-3 sm:w-28">Symbol</th>
            <th className="w-32 py-1.5 pr-3 sm:w-36">Event type</th>
            <th className="py-1.5 pr-3">Headline</th>
            {extraCols.map((c) => (
              <th key={c} className="w-28 py-1.5 pr-3 sm:w-32">
                {c.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((r, i) => (
            <tr key={`${r.symbol}-${i}`} className="border-t border-border">
              <td className="whitespace-nowrap py-1.5 pr-3 align-top">{formatDateIst(r.date)}</td>
              <td className="break-words py-1.5 pr-3 align-top">
                <SymbolLink symbol={r.symbol} companyName={r.company_name} />
              </td>
              <td className="break-words py-1.5 pr-3 align-top">{safeCell(r.event_type)}</td>
              <td className="break-words py-1.5 pr-3 align-top text-foreground-muted">{safeCell(r.headline ?? r.summary)}</td>
              {extraCols.map((c) => (
                <td key={c} className="break-words py-1.5 pr-3 align-top">
                  {safeCell(r[c])}
                </td>
              ))}
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
      return safeCell(row.event_type) !== "—" ? String(row.event_type) : "Corporate event";
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
      <table className="w-full min-w-[560px] text-sm">
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
