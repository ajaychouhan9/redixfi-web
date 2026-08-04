import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { AnomalyFlagDoc, AnomalyScanMeta } from "@/lib/api/types";

/**
 * Task 16 Part C — full-universe, disclosed-criteria anomaly scan.
 * Symmetric BY CONSTRUCTION: results are grouped by direction and every
 * direction bucket present is rendered, never just the "up" side — same
 * "unusual-up and unusual-down equally" rule the master-context symmetry
 * check applies to movers. Default order here is symbol name-ascending
 * within each bucket (the API's own default sort), never re-ranked.
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

function AnomalyGroup({ label, rows }: { label: string; rows: AnomalyFlagDoc[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="flex-1 min-w-[140px]">
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground-faint">
        {label} ({rows.length})
      </h3>
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

export function AnomalyCard({ results, scan }: { results: AnomalyFlagDoc[]; scan: AnomalyScanMeta | null }) {
  if (!scan) {
    return (
      <Card title="Unusual activity today">
        <p className="text-sm text-foreground-muted">No anomaly scan available yet.</p>
      </Card>
    );
  }

  // Bucket by (type, direction) so up/down/other groups are shown side by
  // side, mirroring TopSignalChangesCard's gainers/decliners layout —
  // never one direction alone.
  const buckets = new Map<string, AnomalyFlagDoc[]>();
  for (const doc of results) {
    for (const a of doc.anomalies) {
      const key = `${a.type}:${a.anomaly_direction}`;
      if (!buckets.has(key)) buckets.set(key, []);
      const arr = buckets.get(key)!;
      if (!arr.find((d) => d.symbol === doc.symbol)) arr.push(doc);
    }
  }

  const groupOrder = ["volume_extreme:up", "volume_extreme:down", "pcr_shift:put_heavy", "pcr_shift:call_heavy", "insider_cluster:buying", "insider_cluster:selling", "volume_extreme:flat"];

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
      <div className="flex flex-wrap gap-4">
        {groupOrder.map((key) => {
          const [type, direction] = key.split(":");
          const rows = buckets.get(key) ?? [];
          if (rows.length === 0) return null;
          const typeLabel = type === "volume_extreme" ? "Volume" : type === "pcr_shift" ? "Options positioning" : "Insider filings";
          return <AnomalyGroup key={key} label={`${typeLabel} — ${DIRECTION_LABEL[direction] ?? direction}`} rows={rows} />;
        })}
        {results.length === 0 && <p className="text-sm text-foreground-faint">Nothing crossed the threshold today.</p>}
      </div>
    </Card>
  );
}
