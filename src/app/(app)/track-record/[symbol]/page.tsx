import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrackRecordSymbol } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { formatShortDate } from "@/lib/format";
import type { SignalCrossing, TrackRecordSymbolHistory } from "@/lib/api/types";

// Task 15 bullet 2 — the "Inspectable signal history" per-stock deliverable.
// Same SSR + ISR pattern Task 14 established. Every crossing distinguishes
// "observed" from "pending" outcomes — a recent crossing renders as
// genuinely pending, never a placeholder implying a result that hasn't
// happened yet (task doc's own explicit compliance requirement).
export const revalidate = 21600; // 6h — matches the backend's own TRACK_RECORD_CACHE_TTL

async function loadHistory(symbol: string): Promise<TrackRecordSymbolHistory | null> {
  try {
    return (await getTrackRecordSymbol(symbol, { revalidate: 21600 })).data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  const data = await loadHistory(symbol.toUpperCase());
  if (!data) return { title: `${symbol.toUpperCase()} not found` };
  return {
    title: `${data.symbol} Signal History`,
    description: `Full measured signal-crossing and score-change history for ${data.company_name ?? data.symbol} (${data.symbol}) — factual, not investment advice.`,
  };
}

function CrossingRow({ c }: { c: SignalCrossing }) {
  return (
    <li className="flex flex-col gap-1 border-t border-border py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span>
        Composite score crossed {c.crossing_side} {c.threshold} on {formatShortDate(c.crossing_date)}
      </span>
      {c.outcome_status === "pending" ? (
        <span className="text-xs text-foreground-faint">
          Outcome pending — needs {c.window_sessions} trading sessions to elapse
        </span>
      ) : (
        <span className="text-xs">
          Over the following {c.window_sessions} sessions, relative to its sector&apos;s median move:{" "}
          <span className={c.beat_sector_median ? "text-up" : "text-down"}>
            {c.relative_return_pct !== null && c.relative_return_pct > 0 ? "+" : ""}
            {c.relative_return_pct}% ({c.beat_sector_median ? "outperformed" : "did not outperform"})
          </span>
        </span>
      )}
    </li>
  );
}

export default async function TrackRecordSymbolPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  const data = await loadHistory(sym);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <p className="text-sm text-foreground-muted">
          {data.symbol} · {data.sector_index ?? "—"}
        </p>
        <h1 className="text-xl font-semibold">{data.company_name ?? data.symbol} — Signal History</h1>
        <Link href={`/signals/${data.symbol}`} className="mt-1 inline-block text-sm font-medium text-accent">
          ← Back to {data.symbol}&apos;s Signal Dashboard page
        </Link>
      </div>

      <Card>
        <p className="text-sm leading-relaxed">
          &ldquo;Past patterns are not a guarantee of future results. RedixFi is not SEBI-registered as a Research
          Analyst and this is not investment advice.&rdquo;
        </p>
      </Card>

      <Card title="Composite-score threshold crossings">
        {data.crossings.length === 0 ? (
          <p className="text-sm text-foreground-muted">No threshold crossings recorded yet for {data.symbol}.</p>
        ) : (
          <ul>
            {data.crossings.map((c, i) => (
              <CrossingRow key={i} c={c} />
            ))}
          </ul>
        )}
      </Card>

      <Card title="Full signal change history">
        {data.change_log.length === 0 ? (
          <p className="text-sm text-foreground-muted">No signal changes logged yet for {data.symbol}.</p>
        ) : (
          <div className="max-h-[32rem] overflow-y-auto">
            <ul className="divide-y divide-border">
              {data.change_log.map((c, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-foreground-muted">{formatShortDate(c.date)}</span>
                  <DeltaValue value={c.delta} className="w-14" />
                  <span className="flex-1 px-2">{c.note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <p className="text-center text-xs text-foreground-faint">
        <Link href="/track-record" className="underline">
          Site-wide track record
        </Link>
        {" · "}
        <Link href="/more/disclaimer" className="underline">
          Full disclaimer
        </Link>
      </p>
    </div>
  );
}
