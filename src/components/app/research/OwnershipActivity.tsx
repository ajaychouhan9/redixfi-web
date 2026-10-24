"use client";

/**
 * Insider trades and bulk/block deals, shown with the ownership panel ("Who owns it, and did that change?").
 * The last 12 months are shown; older records sit behind "Show older" so none is lost. Money is shown as a
 * readable crore value (small amounts in lakh or plain rupees). Measured filings only.
 */

import { useMemo, useState } from "react";

import { GenericRecordTable } from "@/components/ui/GenericRecordTable";
import { formatDateIst } from "@/lib/format";
import { formatRupeesCompact, splitLast12Months } from "@/lib/stock-clarity";
import type { GenericRecord, InsiderTrade } from "@/lib/api/types";

function InsiderTable({ rows }: { rows: InsiderTrade[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
          <tr>
            <th className="py-1.5 pr-3">Date</th>
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
              <td className="py-1.5 pr-3">{t.insider_name || "—"}</td>
              <td className="py-1.5 pr-3">{t.transaction_type}</td>
              <td className="py-1.5 pr-3 tabular-nums">{t.quantity.toLocaleString("en-IN")}</td>
              <td className="py-1.5 pr-3 tabular-nums">{formatRupeesCompact(t.value_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShowOlder({ count, children }: { count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="text-xs font-medium text-accent">
        {open ? "Hide older" : `Show older (${count})`}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function OwnershipActivity({ insiderTrades, bulkDeals }: { insiderTrades: InsiderTrade[]; bulkDeals: GenericRecord[] }) {
  const ins = useMemo(() => splitLast12Months(insiderTrades, (t) => t.trade_date), [insiderTrades]);
  const bulk = useMemo(() => splitLast12Months(bulkDeals, (d) => (d.date as string | undefined) ?? null), [bulkDeals]);
  return (
    <div className="mt-4 space-y-4 border-t border-border pt-3">
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Insider trades</h3>
        {ins.recent.length === 0 ? (
          <p className="text-sm text-foreground-muted">No insider trades in the last 12 months.</p>
        ) : (
          <InsiderTable rows={ins.recent} />
        )}
        <ShowOlder count={ins.older.length}>
          <InsiderTable rows={ins.older} />
        </ShowOlder>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Bulk/block deals</h3>
        <GenericRecordTable rows={bulk.recent} emptyText="No bulk/block deals in the last 12 months." />
        <ShowOlder count={bulk.older.length}>
          <GenericRecordTable rows={bulk.older} emptyText="" />
        </ShowOlder>
      </div>
    </div>
  );
}
