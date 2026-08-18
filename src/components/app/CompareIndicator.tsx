"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitCompare, X, ChevronRight } from "lucide-react";
import {
  COMPARISON_QUEUE_MAX,
  type ComparisonQueueEntry,
  addToComparisonQueue,
  getComparisonQueue,
  onComparisonQueueChange,
  removeFromComparisonQueue,
} from "@/lib/comparison-queue";

/**
 * "Compare (N)" header control for stock detail pages (Signal + Research
 * mockups both specify the identical dropdown). Reads/writes the SAME
 * comparison-queue.ts localStorage queue the Signals page tray
 * (SmartScreenerBox) already uses — there is exactly one queue, so adding
 * here shows up there and vice versa. Replaces the earlier, simpler
 * AddToComparisonChip (a single "+ Compare with…" pill with no preview).
 */
export function CompareIndicator({ symbol, companyName }: { symbol: string; companyName: string | null }) {
  const [queue, setQueue] = useState<ComparisonQueueEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setQueue(getComparisonQueue());
    sync();
    return onComparisonQueueChange(sync);
  }, []);

  const queued = queue.some((e) => e.symbol === symbol);
  const full = queue.length >= COMPARISON_QUEUE_MAX;

  function toggle() {
    if (!queued && !full) addToComparisonQueue({ symbol, company_name: companyName });
    setOpen((o) => !o);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        title={full && !queued ? `Comparison is full (max ${COMPARISON_QUEUE_MAX} stocks)` : "Compare with…"}
        className={
          queue.length > 0
            ? "flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent"
            : "flex items-center gap-1.5 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs font-medium text-foreground-muted"
        }
      >
        <GitCompare size={12} /> Compare{queue.length > 0 ? ` (${queue.length})` : ""}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <span className="text-xs font-semibold">
              Comparing {queue.length}/{COMPARISON_QUEUE_MAX}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 px-4 py-3">
            {queue.length === 0 && <span className="text-[12px] text-foreground-faint">No stocks added yet</span>}
            {queue.map((e) => (
              <span key={e.symbol} className="flex items-center gap-1 rounded-full bg-hover px-2 py-1 font-mono text-[12px]">
                {e.symbol}
                <button type="button" aria-label={`Remove ${e.symbol} from comparison`} onClick={() => removeFromComparisonQueue(e.symbol)}>
                  <X size={10} className="opacity-60 hover:opacity-100" />
                </button>
              </span>
            ))}
          </div>
          <div className="border-t border-border px-4 py-3">
            <Link href="/signals" className="flex items-center gap-1 text-xs font-medium text-accent" onClick={() => setOpen(false)}>
              Open full comparison on Signals <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
