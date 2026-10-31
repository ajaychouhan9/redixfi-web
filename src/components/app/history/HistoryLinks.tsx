"use client";

import Link from "next/link";
import { ChevronRight, History } from "lucide-react";

import { useHistoryEnabled } from "@/lib/history-flag";

/** The More menu row. Hidden with the feature flag. */
export function HistoryMoreRow() {
  const on = useHistoryEnabled();
  if (!on) return null;
  return (
    <li>
      <Link href="/rewind" className="flex items-center justify-between gap-3 py-3 text-sm font-medium hover:text-accent">
        <span className="flex items-center gap-3">
          <History size={16} className="text-accent" />
          Market Rewind
        </span>
        <ChevronRight size={15} className="text-foreground-faint" />
      </Link>
    </li>
  );
}

/** A small link on a stock page that opens the Market Rewind with the stock chosen. Hidden with the feature flag. */
export function ExploreHistoryLink({ symbol }: { symbol: string }) {
  const on = useHistoryEnabled();
  if (!on) return null;
  return (
    <Link
      href={`/rewind?symbol=${encodeURIComponent(symbol)}`}
      className="flex items-center gap-1 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground"
      data-testid="explore-history"
    >
      <History size={12} /> Open in Market Rewind
    </Link>
  );
}
