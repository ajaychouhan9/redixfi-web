"use client";

import Link from "next/link";
import { useState } from "react";
import { Layers, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DeltaValue } from "@/components/ui/DeltaValue";
import type { SectorSummary, WatchlistSummary } from "@/lib/api/types";

/**
 * Surface 3 (Task 12) — summary cards, extending the B11/B12 narrative
 * pattern to watchlist/sector scopes. The text these render is generated
 * server-side by core/summary_cards.py: fixed code templates, never a
 * live model request, guarded against action-urging wording ("requires
 * attention" is banned) before it ever reaches this component.
 */
export function WatchlistSummaryCard({ data }: { data: WatchlistSummary }) {
  const hasSymbols = data.strengthened.length + data.weakened.length + data.unchanged.length + data.unscored.length > 0;
  return (
    <Card title="Your watchlist today">
      <p className="text-sm leading-relaxed">{data.summary}</p>
      {hasSymbols && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SymbolGroup label="Strengthened" symbols={data.strengthened} tone="up" />
          <SymbolGroup label="Weakened" symbols={data.weakened} tone="down" />
          <SymbolGroup label="Held steady" symbols={data.unchanged} tone="neutral" />
        </div>
      )}
    </Card>
  );
}

function SymbolGroup({ label, symbols, tone }: { label: string; symbols: string[]; tone: "up" | "down" | "neutral" }) {
  if (symbols.length === 0) return null;
  const color = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-foreground-muted";
  return (
    <div>
      <p className={`text-xs font-medium ${color}`}>{label} ({symbols.length})</p>
      <ul className="mt-1 space-y-0.5">
        {symbols.map((s) => (
          <li key={s}>
            <Link href={`/signals/${s}`} className="text-sm hover:text-accent">
              {s}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SECTOR_CAP = 4;

/** Ranked symmetrically — both the strongest AND weakest sector are always
 * shown, matching the master-context symmetry rule (a movers-style display
 * must never show only the up side). Capped to 4 by default, expandable —
 * same pattern as the approved Signals mockup. */
export function SectorSummaryCard({ data }: { data: SectorSummary }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? data.ranked : data.ranked.slice(0, SECTOR_CAP);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
      <div className="flex items-center gap-2 px-5 py-4">
        <Layers size={14} className="text-accent" />
        <div>
          <h3 className="text-sm font-semibold">Sector standing today</h3>
          <p className="text-[11px] text-foreground-faint">{data.summary}</p>
        </div>
      </div>
      {visible.length > 0 && (
        <div className="divide-y divide-border border-t border-border">
          {visible.map((r) => (
            <div key={r.sector} className="flex items-center justify-between px-5 py-2.5">
              <span className="text-sm">{r.sector}</span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-foreground-faint">{r.count} stocks</span>
                <DeltaValue value={r.avg_delta} className="w-16 justify-end" />
              </span>
            </div>
          ))}
        </div>
      )}
      {data.ranked.length > SECTOR_CAP && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1 border-t border-border py-2.5 text-xs font-medium text-accent"
        >
          {expanded ? (
            <>
              Show less <ChevronUp size={13} />
            </>
          ) : (
            <>
              View all {data.ranked.length} sectors <ChevronDown size={13} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
