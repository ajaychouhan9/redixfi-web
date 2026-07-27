"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  COMPARISON_QUEUE_MAX,
  addToComparisonQueue,
  getComparisonQueue,
  onComparisonQueueChange,
} from "@/lib/comparison-queue";

/** Stock-detail-page chip — Task 13's "add to comparison" surface. Queues
 * the symbol client-side (localStorage); the actual comparison always runs
 * through the same natural-language compare intent the chat box uses (see
 * SmartScreenerBox's queue tray), never a separate code path. */
export function AddToComparisonChip({ symbol, companyName }: { symbol: string; companyName: string | null }) {
  const [queued, setQueued] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const sync = () => {
      const q = getComparisonQueue();
      setQueued(q.some((e) => e.symbol === symbol));
      setFull(q.length >= COMPARISON_QUEUE_MAX);
    };
    sync();
    return onComparisonQueueChange(sync);
  }, [symbol]);

  if (queued) {
    return (
      <Link
        href="/signals"
        className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
      >
        ✓ Added to comparison — view →
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={full}
      onClick={() => addToComparisonQueue({ symbol, company_name: companyName })}
      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground-muted hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
      title={full ? `Comparison is full (max ${COMPARISON_QUEUE_MAX} stocks)` : "Compare with..."}
    >
      + Compare with…
    </button>
  );
}
