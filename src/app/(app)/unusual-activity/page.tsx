import { staticMeta } from "@/lib/seo/page-meta";
import type { Metadata } from "next";
import { getAnomalies } from "@/lib/api/endpoints";
import { AnomalyCard } from "@/components/app/AnomalyCard";
import { formatObservationDate } from "@/lib/format";

/**
 * Full-list destination for Home's compact "Unusual activity today" tiles.
 * Same getAnomalies() fetch Home already makes, same AnomalyCard component
 * (full mode, i.e. compact={false}) — so this can never drift out of sync
 * with what Home summarizes. size:200 (vs Home's 50) for a materially
 * deeper — not literally "everything ever flagged" — view; the anomaly
 * scan is already a disclosed-criteria subset of the day's universe, not
 * an unbounded feed.
 */
// The page makes no request of its own; a refresh window keeps the cached copy from outliving a deploy (a fully static page is sent with a one-year cache lifetime).
export const revalidate = 300;

export const metadata: Metadata = staticMeta("/unusual-activity");

export default async function UnusualActivityPage() {
  // Same allSettled-style resilience as the Home page's own fetch of this
  // endpoint — a transient API failure shows AnomalyCard's existing "not
  // available yet" state instead of crashing the whole page.
  const result = await getAnomalies({ size: 200 }, { revalidate: 300 }).catch(() => null);
  // Sep 2026 fix: same real scan date AnomalyCard itself now shows in its
  // title — this page's own heading must match it, not imply "today"
  // when the scan may be from a prior completed session.
  const observedOn = formatObservationDate(result?.page_info.scan?.date);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{observedOn ? `Unusual activity · ${observedOn}` : "Unusual activity"}</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Every stock scanned against the same disclosed statistical thresholds — up and down alike, never curated.
        </p>
      </div>
      <AnomalyCard results={result?.data ?? []} scan={result?.page_info.scan ?? null} />
    </div>
  );
}
