import Link from "next/link";
import type { ResearchDetail as ResearchDetailType, Candle, PeerRow } from "@/lib/api/types";
import { Card } from "@/components/ui/Card";
import { AiLabel } from "@/components/ui/AiLabel";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { Sparkline } from "@/components/ui/Sparkline";
import { GenericRecordTable } from "@/components/ui/GenericRecordTable";
import { NewsList } from "@/components/app/NewsList";
import { RecordView } from "@/components/app/RecordView";
import { FundamentalsPanels } from "@/components/app/research/FundamentalsPanels";
import { ResearchChart } from "@/components/app/research/ResearchChart";
import { AddToComparisonChip } from "@/components/app/signals/AddToComparisonChip";
import { formatShortDate } from "@/lib/format";

/**
 * Task 14 — pure presentational component: every prop here is already
 * resolved server-side by app/(app)/research/[symbol]/page.tsx (SSR +
 * ISR, same pattern as the working app/(app)/signals/[symbol]/page.tsx
 * reference implementation), so this renders directly into the initial
 * HTML response instead of a client-fetched "Loading…" placeholder.
 * The only remaining client-side pieces are genuinely interactive leaves
 * (ResearchChart's range toggle + on-demand intraday fetch,
 * AddToComparisonChip, FundamentalsPanels' Collapsible sections) — none
 * of them gate the INITIAL content the way the old data-fetching version
 * of this component did.
 */
export function ResearchDetail({
  data,
  dailyCandles,
  peers,
  peersError,
}: {
  data: ResearchDetailType;
  dailyCandles: Candle[];
  peers: PeerRow[] | null;
  peersError: boolean;
}) {
  const positionPct = Math.max(0, Math.min(100, data.price.week52_position_pct));

  return (
    <div className="space-y-4">
      <RecordView symbol={data.symbol} companyName={data.company_name} />

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-foreground-muted">
            {data.symbol} · {data.sector}
          </p>
          <AddToComparisonChip symbol={data.symbol} companyName={data.company_name} />
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <span className="text-2xl font-semibold">₹{data.price.last_price.toLocaleString("en-IN")}</span>
          <DeltaValue value={data.price.day_change_pct} kind="pct" />
        </div>
        <div className="mt-2 max-w-xs">
          <div className="h-1.5 w-full rounded-full bg-neutral-bg">
            <div className="h-1.5 rounded-full bg-accent" style={{ width: `${positionPct}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-foreground-faint">
            <span>52wk low ₹{data.price.week52_low}</span>
            <span>52wk high ₹{data.price.week52_high}</span>
          </div>
        </div>
      </div>

      <ErrorBoundary>
        <ResearchChart symbol={data.symbol} dailyCandles={dailyCandles} />
      </ErrorBoundary>

      <ErrorBoundary>
        <FundamentalsPanels symbol={data.symbol} fundamentals={data.fundamentals} peers={peers} peersError={peersError} />
      </ErrorBoundary>

      <Card title="Smart money">
        <div className="space-y-4">
          <ErrorBoundary>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Delivery (30d)</h3>
              {data.delivery_30d.length > 1 ? (
                <div className="text-accent">
                  <Sparkline
                    values={[...data.delivery_30d].sort((a, b) => a.date.localeCompare(b.date)).map((d) => d.delivery_pct)}
                  />
                </div>
              ) : (
                <p className="text-sm text-foreground-muted">Not enough data.</p>
              )}
            </div>
          </ErrorBoundary>

          <ErrorBoundary>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Insider trades</h3>
              {data.insider_trades.length === 0 ? (
                <p className="text-sm text-foreground-muted">No insider filings recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
                      <tr>
                        <th className="py-1.5 pr-3">Date</th>
                        <th className="py-1.5 pr-3">Insider</th>
                        <th className="py-1.5 pr-3">Type</th>
                        <th className="py-1.5 pr-3">Qty</th>
                        <th className="py-1.5 pr-3">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.insider_trades.slice(0, 10).map((t) => (
                        <tr key={t.filing_id} className="border-t border-border">
                          <td className="py-1.5 pr-3">{formatShortDate(t.trade_date)}</td>
                          <td className="py-1.5 pr-3">{t.insider_name || "—"}</td>
                          <td className="py-1.5 pr-3">{t.transaction_type}</td>
                          <td className="py-1.5 pr-3 tabular-nums">{t.quantity.toLocaleString("en-IN")}</td>
                          <td className="py-1.5 pr-3 tabular-nums">₹{t.value_amount.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </ErrorBoundary>

          <ErrorBoundary>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Bulk/block deals</h3>
              <GenericRecordTable rows={data.bulk_block_deals} emptyText="No bulk/block deals recorded recently." />
            </div>
          </ErrorBoundary>

          <ErrorBoundary>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Promoter pledge</h3>
              {data.pledge_history.length === 0 ? (
                <p className="text-sm text-foreground-muted">No pledge data recorded.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {data.pledge_history.slice(0, 4).map((p, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span className="text-foreground-muted">{p.quarter}</span>
                      <span>
                        {p.pledged_pct}% · {p.risk_level}
                        {p.pledge_trend && <> · {p.pledge_trend.toLowerCase()}</>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </ErrorBoundary>

          <ErrorBoundary>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-faint">Options PCR</h3>
              {data.options_pcr_history.length === 0 ? (
                <p className="text-sm text-foreground-muted">Options data not available.</p>
              ) : (
                <>
                  <p className="text-sm">
                    Latest: <span className="font-medium tabular-nums">{data.options_pcr_history[0].pcr}</span>{" "}
                    <span className="text-foreground-faint">({data.options_pcr_history[0].pcr > 1 ? "put-heavy" : "call-heavy"})</span>
                  </p>
                  <div className="mt-1 text-accent">
                    <Sparkline values={[...data.options_pcr_history].reverse().map((p) => p.pcr)} />
                  </div>
                </>
              )}
            </div>
          </ErrorBoundary>
        </div>
      </Card>

      <ErrorBoundary>
        <Card title="Corporate events">
          <GenericRecordTable rows={data.corporate_events} emptyText="No upcoming corporate events recorded." />
        </Card>
      </ErrorBoundary>

      <ErrorBoundary>
        <Card title="News timeline">
          <NewsList items={data.news} />
        </Card>
      </ErrorBoundary>

      <ErrorBoundary>
        <Card title="Signal summary" action={data.signal_summary.narrative && <AiLabel />}>
          {data.signal_summary.composite_score === null ? (
            <p className="text-sm text-foreground-muted">Signal score not yet computed for this stock.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-semibold">{data.signal_summary.composite_score}/100</span>
                {data.signal_summary.delta_1d !== null && <DeltaValue value={data.signal_summary.delta_1d} />}
              </div>
              {data.signal_summary.narrative && <p className="mt-2 text-sm leading-relaxed">{data.signal_summary.narrative}</p>}
              <Link href={`/signals/${data.symbol}`} className="mt-2 inline-block text-sm font-medium text-accent">
                Open full Signal Dashboard page →
              </Link>
            </>
          )}
        </Card>
      </ErrorBoundary>
    </div>
  );
}
