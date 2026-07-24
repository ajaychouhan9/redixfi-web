import Link from "next/link";
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

/** Ranked symmetrically — both the strongest AND weakest sector are always
 * shown, matching the master-context symmetry rule (a movers-style display
 * must never show only the up side). */
export function SectorSummaryCard({ data }: { data: SectorSummary }) {
  return (
    <Card title="Sector standing today">
      <p className="text-sm leading-relaxed">{data.summary}</p>
      {data.ranked.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {data.ranked.map((r) => (
            <li key={r.sector} className="flex items-center justify-between py-1.5 text-sm">
              <span>{r.sector}</span>
              <span className="flex items-center gap-2">
                <DeltaValue value={r.avg_delta} className="w-14" />
                <span className="text-xs text-foreground-faint">{r.count} stocks</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
