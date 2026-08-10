import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { AnomalyFlagDoc, AnomalyScanMeta, AnomalyType, AnomalyDirection } from "@/lib/api/types";

/**
 * Task 16 Part C — full-universe, disclosed-criteria anomaly scan.
 * Symmetric BY CONSTRUCTION: results are grouped by direction and every
 * direction bucket present is rendered, never just the "up" side — same
 * "unusual-up and unusual-down equally" rule the master-context symmetry
 * check applies to movers. Default order here is symbol name-ascending
 * within each bucket (the API's own default sort), never re-ranked.
 *
 * Category tiles: the API's AnomalyType is exactly 3 values — volume_extreme,
 * pcr_shift, insider_cluster (src/lib/api/types.ts) — there is no fourth
 * "price action" category anywhere in the anomaly data model. A 4-tile
 * "Volume/Options/Insider/Price Action" layout was assumed in the task brief
 * but isn't backed by real data, so this renders 3 tiles only rather than
 * inventing a category with a permanently-zero count.
 */

const DIRECTION_LABEL: Record<string, string> = {
  up: "Up",
  down: "Down",
  flat: "Flat",
  put_heavy: "More put-heavy",
  call_heavy: "More call-heavy",
  buying: "Net buying",
  selling: "Net selling",
};

const CATEGORY_META: { type: AnomalyType; label: string; directions: AnomalyDirection[] }[] = [
  { type: "volume_extreme", label: "Volume Breakout", directions: ["up", "down", "flat"] },
  { type: "pcr_shift", label: "Options Activity", directions: ["put_heavy", "call_heavy"] },
  { type: "insider_cluster", label: "Insider Activity", directions: ["buying", "selling"] },
];

function AnomalyGroup({ label, rows }: { label: string; rows: AnomalyFlagDoc[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="flex-1 min-w-[140px]">
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground-faint">
        {label} ({rows.length})
      </h4>
      <ul className="space-y-1.5">
        {rows.slice(0, 5).map((r) => (
          <li key={r.symbol}>
            <Link href={`/signals/${r.symbol}`} className="block text-sm hover:text-accent">
              <span className="font-medium">{r.symbol}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryTile({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="min-w-[240px] flex-1 rounded-lg border border-border bg-surface-raised p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-faint">
        {label} <span className="text-foreground">({count} {count === 1 ? "stock" : "stocks"})</span>
      </h3>
      <div className="flex flex-wrap gap-4">{children}</div>
    </div>
  );
}

export function AnomalyCard({ results, scan }: { results: AnomalyFlagDoc[]; scan: AnomalyScanMeta | null }) {
  if (!scan) {
    return (
      <Card title="Unusual activity today">
        <p className="text-sm text-foreground-muted">No anomaly scan available yet.</p>
      </Card>
    );
  }

  // Bucket by (type, direction) for the symbol lists shown inside each tile.
  const buckets = new Map<string, AnomalyFlagDoc[]>();
  // Distinct stock count per category, regardless of direction, for the tile header.
  const categoryStocks = new Map<AnomalyType, Set<string>>();
  for (const doc of results) {
    for (const a of doc.anomalies) {
      const key = `${a.type}:${a.anomaly_direction}`;
      if (!buckets.has(key)) buckets.set(key, []);
      const arr = buckets.get(key)!;
      if (!arr.find((d) => d.symbol === doc.symbol)) arr.push(doc);

      if (!categoryStocks.has(a.type)) categoryStocks.set(a.type, new Set());
      categoryStocks.get(a.type)!.add(doc.symbol);
    }
  }

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Activity size={14} className="text-accent" /> Unusual activity today
        </span>
      }
      action={
        <Link href="/signals" className="flex items-center gap-0.5 text-xs font-medium text-accent">
          Screen <ArrowRight size={12} />
        </Link>
      }
    >
      <p className="mb-3 text-xs text-foreground-faint">
        {scan.flagged_symbol_count} of {scan.universe_count} tracked stocks met a disclosed statistical threshold
        today (volume ≥ {scan.thresholds.volume_ratio_anomaly_min}x its own 20-day norm, options positioning ≥{" "}
        {scan.thresholds.pcr_z_anomaly_min} standard deviations from its own norm, or a concentrated insider-filing
        window) — every stock is scanned against the same rule, up and down alike.
      </p>
      <div className="flex flex-wrap gap-3">
        {CATEGORY_META.map(({ type, label, directions }) => (
          <CategoryTile key={type} label={label} count={categoryStocks.get(type)?.size ?? 0}>
            {directions.map((direction) => (
              <AnomalyGroup
                key={`${type}:${direction}`}
                label={DIRECTION_LABEL[direction] ?? direction}
                rows={buckets.get(`${type}:${direction}`) ?? []}
              />
            ))}
          </CategoryTile>
        ))}
        {results.length === 0 && <p className="text-sm text-foreground-faint">Nothing crossed the threshold today.</p>}
      </div>
    </Card>
  );
}
