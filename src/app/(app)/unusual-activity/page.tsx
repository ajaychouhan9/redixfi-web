import type { Metadata } from "next";
import { getAnomalies } from "@/lib/api/endpoints";
import { AnomalyCard } from "@/components/app/AnomalyCard";

/**
 * Full-list destination for Home's compact "Unusual activity today" tiles.
 * Same getAnomalies() fetch Home already makes, same AnomalyCard component
 * (full mode, i.e. compact={false}) — so this can never drift out of sync
 * with what Home summarizes. size:200 (vs Home's 50) for a materially
 * deeper — not literally "everything ever flagged" — view; the anomaly
 * scan is already a disclosed-criteria subset of the day's universe, not
 * an unbounded feed.
 */
export const metadata: Metadata = {
  title: "Unusual Activity",
  description: "Every stock that met a disclosed statistical threshold today — volume, options positioning, or a concentrated insider-filing window. Not a recommendation.",
};

export default async function UnusualActivityPage() {
  // Same allSettled-style resilience as the Home page's own fetch of this
  // endpoint — a transient API failure shows AnomalyCard's existing "not
  // available yet" state instead of crashing the whole page.
  const result = await getAnomalies({ size: 200 }).catch(() => null);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Unusual activity today</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Every stock scanned against the same disclosed statistical thresholds — up and down alike, never curated.
        </p>
      </div>
      <AnomalyCard results={result?.data ?? []} scan={result?.page_info.scan ?? null} />
    </div>
  );
}
