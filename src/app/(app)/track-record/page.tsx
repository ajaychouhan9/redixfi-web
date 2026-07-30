import type { Metadata } from "next";
import Link from "next/link";
import { getTrackRecord } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { ExplainTerm } from "@/components/ui/ExplainTerm";
import { formatShortDate } from "@/lib/format";
import type { TrackRecordBucket, TrackRecordSnapshot } from "@/lib/api/types";

// Task 15 — SSR, same pattern Task 14 established (async server component +
// generateMetadata + ISR). This page IS the methodology-transparency fix
// flagged by the external review, and per the task doc's own compliance
// guardrails it's the most legally sensitive page in the product — every
// number here carries its own sample size (N=) and date range inline,
// nothing is phrased as a forward statement, and every percentage is
// relative to the stock's own sector, never an absolute return.
export const revalidate = 21600; // 6h — matches the backend's own TRACK_RECORD_CACHE_TTL

export const metadata: Metadata = {
  title: "Track Record",
  description:
    "How RedixFi's composite signal score has performed historically, measured relative to each stock's own sector — sample size and date range shown with every figure. Not investment advice.",
};

const COMPONENTS: { key: string; label: string; weight: number; metricKey: string }[] = [
  { key: "trend", label: "Trend (10-day price position)", weight: 20, metricKey: "trend_10d_pct" },
  { key: "sector", label: "Sector standing", weight: 15, metricKey: "sector_rank" },
  { key: "delivery", label: "Delivery vs 20-day average", weight: 15, metricKey: "delivery_pct" },
  { key: "volume", label: "Volume participation", weight: 10, metricKey: "volume_ratio" },
  { key: "rsi", label: "RSI (14)", weight: 10, metricKey: "rsi_14" },
  { key: "pcr", label: "Options positioning (PCR)", weight: 10, metricKey: "pcr" },
  { key: "pledge", label: "Promoter pledge level and trend", weight: 10, metricKey: "promoter_pledge" },
  { key: "fii", label: "FII flow backdrop", weight: 10, metricKey: "fii_flow" },
];

async function loadTrackRecord(): Promise<TrackRecordSnapshot | null> {
  try {
    return (await getTrackRecord({ revalidate: 21600 })).data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

function fmtPct(v: number | null, digits = 1): string {
  if (v === null) return "Not available";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}%`;
}

function BucketRow({ bucket, dateRange }: { bucket: TrackRecordBucket; dateRange: { from: string; to: string } | null }) {
  if (bucket.n === 0) {
    return (
      <tr className="border-t border-border">
        <td className="px-3 py-2 font-medium">{bucket.band}</td>
        <td className="px-3 py-2 text-foreground-faint" colSpan={3}>
          Not enough completed observations yet in this score range.
        </td>
      </tr>
    );
  }
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 font-medium">{bucket.band}</td>
      <td className="px-3 py-2">
        {fmtPct(bucket.pct_beat_sector_median)}
        <span className="ml-1 text-xs text-foreground-faint">
          (N={bucket.n}{dateRange ? `, ${formatShortDate(dateRange.from)}–${formatShortDate(dateRange.to)}` : ""})
        </span>
      </td>
      <td className="px-3 py-2">{fmtPct(bucket.avg_relative_return_pct, 2)}</td>
      <td className="px-3 py-2">
        {bucket.low_sample && <span className="text-amber">Small sample — read with caution</span>}
      </td>
    </tr>
  );
}

export default async function TrackRecordPage() {
  const snapshot = await loadTrackRecord();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Track Record</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          A measured, historical look at how the composite signal score has related to each stock&apos;s subsequent
          price move, relative to its own sector — never an absolute return, never a forward statement.
        </p>
      </div>

      <Card>
        <p className="text-sm leading-relaxed">
          &ldquo;Past patterns are not a guarantee of future results. RedixFi is not SEBI-registered as a Research
          Analyst and this is not investment advice.&rdquo;
        </p>
      </Card>

      <Card title="Score-band study">
        {!snapshot ? (
          <p className="text-sm text-foreground-muted">
            This study has not been published yet — check back once the weekly track-record build has run.
          </p>
        ) : snapshot.total_observations === 0 ? (
          <div className="space-y-2 text-sm text-foreground-muted">
            <p>
              Not enough history has accumulated yet for a complete study. Each observation needs{" "}
              {snapshot.window_sessions} trading sessions to elapse before its outcome can be measured.
            </p>
            {snapshot.earliest_measured_date && (
              <p>
                Composite score history on file since {formatShortDate(snapshot.earliest_measured_date)}
                {snapshot.latest_measured_date && snapshot.latest_measured_date !== snapshot.earliest_measured_date
                  ? ` through ${formatShortDate(snapshot.latest_measured_date)}`
                  : ""}
                . This page updates weekly as more sessions complete.
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-foreground-muted">
              For each session where the composite score sat in a given range, this measures whether the stock&apos;s
              price move over the following {snapshot.window_sessions} trading sessions beat its own sector&apos;s
              median move over the same window — N={snapshot.total_observations} total observation
              {snapshot.total_observations === 1 ? "" : "s"}
              {snapshot.date_range ? `, ${formatShortDate(snapshot.date_range.from)}–${formatShortDate(snapshot.date_range.to)}` : ""}.
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-surface text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
                  <tr>
                    <th className="px-3 py-2">Score range</th>
                    <th className="px-3 py-2">Beat sector median</th>
                    <th className="px-3 py-2">Avg relative return</th>
                    <th className="px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.buckets.map((b) => (
                    <BucketRow key={b.band} bucket={b} dateRange={snapshot.date_range} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card title="Methodology — how the composite score is built">
        <p className="mb-3 text-sm text-foreground-muted">
          The composite score (0–100) is a weighted measurement of 8 factors, each computed from data already
          shown elsewhere on the site. Tap any factor for how it&apos;s calculated.
        </p>
        <ul className="divide-y divide-border text-sm">
          {COMPONENTS.map((c) => (
            <li key={c.key} className="flex items-center justify-between py-2">
              <ExplainTerm metricKey={c.metricKey} ctx={{}}>
                {c.label}
              </ExplainTerm>
              <span className="text-foreground-faint">{c.weight}%</span>
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-center text-xs text-foreground-faint">
        <Link href="/more/disclaimer" className="underline">
          Full disclaimer
        </Link>
      </p>
    </div>
  );
}
