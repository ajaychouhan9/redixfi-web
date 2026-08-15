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

export function CorporateEventsTable({ rows }: { rows: MarketActivityCorporateEventRow[] }) {
  if (rows.length === 0) return <EmptyState text="No upcoming corporate events recorded." />;
  // corporate_events' live shape beyond symbol/event_date/event_type is
  // unverified (same reason ResearchDetail.tsx falls back to
  // GenericRecordTable for this collection) — derive any additional
  // columns from whatever's actually present, same escape hatch.
  const knownKeys = new Set(["type", "symbol", "company_name", "date", "event_date", "valid_till"]);
  const extraCols = Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).filter((k) => !knownKeys.has(k)).slice(0, 3);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
          <tr>
            <th className="py-1.5 pr-3">Date</th>
            <th className="py-1.5 pr-3">Symbol</th>
            {extraCols.map((c) => (
              <th key={c} className="py-1.5 pr-3">
                {c.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.symbol}-${i}`} className="border-t border-border">
              <td className="py-1.5 pr-3">{formatDateIst(r.date)}</td>
              <td className="py-1.5 pr-3">
                <SymbolLink symbol={r.symbol} companyName={r.company_name} />
              </td>
              {extraCols.map((c) => (
                <td key={c} className="py-1.5 pr-3">
                  {String(r[c] ?? "")}
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
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
          <tr>
            <th className="py-1.5 pr-3">Date</th>
            <th className="py-1.5 pr-3">Symbol</th>
            <th className="py-1.5 pr-3">Type</th>
            <th className="py-1.5 pr-3">Buy/Sell{/* compliance-ignore: exchange-reported deal side (bulk/block filing field), not an instruction */}</th>
            <th className="py-1.5 pr-3">Client</th>
            <th className="py-1.5 pr-3">Qty</th>
            <th className="py-1.5 pr-3">Price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.symbol}-${i}`} className="border-t border-border">
              <td className="py-1.5 pr-3">{formatDateIst(r.date)}</td>
              <td className="py-1.5 pr-3">
                <SymbolLink symbol={r.symbol} companyName={r.company_name} />
              </td>
              <td className="py-1.5 pr-3">{String(r.dealType ?? "")}</td>
              <td className="py-1.5 pr-3">{String(r.buySell ?? "")}</td>
              <td className="py-1.5 pr-3">{String(r.clientName ?? "")}</td>
              <td className="py-1.5 pr-3 tabular-nums">{r.quantity != null ? Number(r.quantity).toLocaleString("en-IN") : "—"}</td>
              <td className="py-1.5 pr-3 tabular-nums">{r.price != null ? `₹${Number(r.price).toLocaleString("en-IN")}` : "—"}</td>
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
    case "bulk_block":
      return `${String(row.dealType ?? "")} ${String(row.buySell ?? "")} · ${row.quantity != null ? Number(row.quantity).toLocaleString("en-IN") : "—"} shares`;
    case "corporate_event":
      return String(row.event_type ?? "Corporate event");
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
