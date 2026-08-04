"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Check } from "lucide-react";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { SignalStateChip } from "@/components/ui/Chip";
import { LockedInline } from "@/components/ui/Locked";
import {
  COMPARISON_QUEUE_MAX,
  addToComparisonQueue,
  getComparisonQueue,
  onComparisonQueueChange,
  removeFromComparisonQueue,
} from "@/lib/comparison-queue";
import type { SignalRow } from "@/lib/api/types";

export interface VisibleColumns {
  sector: boolean;
  marketCap: boolean;
  delivery: boolean;
  chips: boolean;
  eventRisk: boolean;
}

export function SignalTableRow({ row, columns }: { row: SignalRow; columns: VisibleColumns }) {
  const locked = row.locked;
  const [queued, setQueued] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const sync = () => {
      const q = getComparisonQueue();
      setQueued(q.some((e) => e.symbol === row.symbol));
      setFull(q.length >= COMPARISON_QUEUE_MAX);
    };
    sync();
    return onComparisonQueueChange(sync);
  }, [row.symbol]);

  function toggleCompare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (queued) removeFromComparisonQueue(row.symbol);
    else addToComparisonQueue({ symbol: row.symbol, company_name: row.company_name });
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-hover">
      <td className="whitespace-nowrap px-3 py-2.5">
        <Link href={`/signals/${row.symbol}`} className="font-mono font-semibold hover:text-accent">
          {row.symbol}
        </Link>
        <div className="max-w-[16rem] truncate text-[11px] text-foreground-faint">{row.company_name}</div>
      </td>
      {columns.sector && <td className="hidden px-3 py-2.5 text-xs text-foreground-muted md:table-cell">{row.sector}</td>}
      {columns.marketCap && (
        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-foreground-muted">
          {row.market_cap === null ? "—" : `₹${row.market_cap.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`}
        </td>
      )}
      <td className="px-3 py-2.5">
        {locked || row.composite_score === null ? (
          <LockedInline title="Unlock all 750 measured scores">
            <span className="font-mono font-semibold">--</span>
          </LockedInline>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-semibold">{row.composite_score}</span>
            {row.delta_1d !== null && <DeltaValue value={row.delta_1d} className="text-[11px]" />}
          </div>
        )}
      </td>
      {columns.delivery && (
        <td className="hidden px-3 py-2.5 font-mono text-xs tabular-nums sm:table-cell">
          {locked || row.delivery_pct === null ? (
            <LockedInline>
              <span>--%</span>
            </LockedInline>
          ) : (
            <>
              {row.delivery_pct}% <span className="text-foreground-faint">avg {row.delivery_avg20}%</span>
            </>
          )}
        </td>
      )}
      {columns.chips && (
        <td className="hidden px-3 py-2.5 lg:table-cell">
          {!locked && (
            <div className="flex flex-wrap gap-1">
              {row.signal_states.slice(0, 2).map((s) => (
                <SignalStateChip key={s} code={s} />
              ))}
            </div>
          )}
        </td>
      )}
      {columns.eventRisk && (
        <td className="px-3 py-2.5 text-center">{row.event_risk ? <span title="Event risk">⚠️</span> : ""}</td>
      )}
      <td className="px-3 py-2.5 text-right">
        <button
          onClick={toggleCompare}
          disabled={!queued && full}
          className="ml-auto flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          style={
            queued
              ? { background: "var(--hover)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }
              : { background: "transparent", color: "var(--foreground-faint)", border: "1px solid var(--border)" }
          }
          title={!queued && full ? `Comparison is full (max ${COMPARISON_QUEUE_MAX} stocks)` : undefined}
        >
          {queued ? <Check size={11} /> : <Plus size={11} />}
          {queued ? "Added" : "Compare"}
        </button>
      </td>
    </tr>
  );
}
