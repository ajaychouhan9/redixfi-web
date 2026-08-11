"use client";

import Link from "next/link";
import { useState } from "react";
import { Layers } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DeltaValue } from "@/components/ui/DeltaValue";
import type { SectorSummary, SectorSummaryRow, WatchlistSummary } from "@/lib/api/types";

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

const STRONG_CAP = 4;
const WEAK_CAP = 3;

function SectorRow({ row }: { row: SectorSummaryRow }) {
  return (
    <div className="flex items-center justify-between px-5 py-2">
      <span className="text-sm">{row.sector}</span>
      <span className="flex items-center gap-3">
        <span className="font-mono text-[11px] text-foreground-faint">{row.count} stocks</span>
        <DeltaValue value={row.avg_delta} className="w-16 justify-end" />
      </span>
    </div>
  );
}

/** Ranked symmetrically — both the strongest AND weakest sectors are always
 * shown, matching the master-context symmetry rule (a movers-style display
 * must never show only the up side). BUG FIX (2026-08-11): the previous
 * version's `slice(0, SECTOR_CAP)` on `data.ranked` (which
 * core/summary_cards.py sorts strongest-to-weakest) only ever rendered the
 * strongest end — despite this same docstring already claiming symmetry —
 * the weakest sector was never actually shown by default. Now genuinely
 * splits into a compact STRONGEST | WEAKEST two-column view (top ~4 /
 * bottom ~3, shrinking either side so they never overlap when the sector
 * count is small); "View all sectors →" expands to the full ranked list. */
export function SectorSummaryCard({ data }: { data: SectorSummary }) {
  const [expanded, setExpanded] = useState(false);
  const total = data.ranked.length;
  const weakCap = Math.min(WEAK_CAP, Math.floor(total / 2));
  const strongCap = Math.min(STRONG_CAP, total - weakCap);
  const strongest = data.ranked.slice(0, strongCap);
  const weakest = data.ranked.slice(total - weakCap).reverse();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
      <div className="flex items-center gap-2 px-5 py-4">
        <Layers size={14} className="text-accent" />
        <div>
          <h3 className="text-sm font-semibold">Sector standing today</h3>
          <p className="text-[11px] text-foreground-faint">{data.summary}</p>
        </div>
      </div>

      {!expanded && total > 0 && (
        <div className="grid grid-cols-1 border-t border-border sm:grid-cols-2">
          <div className="divide-y divide-border border-b border-border sm:border-b-0 sm:border-r">
            <p className="px-5 pt-2.5 pb-1 font-mono text-[10px] uppercase tracking-wide text-foreground-faint">Strongest</p>
            {strongest.map((r) => (
              <SectorRow key={r.sector} row={r} />
            ))}
          </div>
          <div className="divide-y divide-border">
            <p className="px-5 pt-2.5 pb-1 font-mono text-[10px] uppercase tracking-wide text-foreground-faint">Weakest</p>
            {weakest.length > 0 ? (
              weakest.map((r) => <SectorRow key={r.sector} row={r} />)
            ) : (
              <p className="px-5 pb-2.5 text-xs text-foreground-faint">No distinct weakest sector today.</p>
            )}
          </div>
        </div>
      )}

      {expanded && (
        <div className="divide-y divide-border border-t border-border">
          {data.ranked.map((r) => (
            <SectorRow key={r.sector} row={r} />
          ))}
        </div>
      )}

      {total > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="block w-full border-t border-border py-2.5 text-center text-xs font-medium text-accent"
        >
          {expanded ? "Show less ↑" : "View all sectors →"}
        </button>
      )}
    </div>
  );
}
