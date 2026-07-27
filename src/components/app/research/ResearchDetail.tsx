"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";
import type { ResearchDetail as ResearchDetailType, Candle } from "@/lib/api/types";
import { Card } from "@/components/ui/Card";
import { AiLabel } from "@/components/ui/AiLabel";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { Sparkline } from "@/components/ui/Sparkline";
import { GenericRecordTable } from "@/components/ui/GenericRecordTable";
import { NewsList } from "@/components/app/NewsList";
import { CandleChart } from "@/components/app/CandleChart";
import { RecordView } from "@/components/app/RecordView";
import { FundamentalsPanels } from "@/components/app/research/FundamentalsPanels";
import { AddToComparisonChip } from "@/components/app/signals/AddToComparisonChip";
import { formatShortDate } from "@/lib/format";

// The live API only serves interval=1d or interval=15m (verified — 1w/1mo/1y
// all 422). "1D" therefore means today's 15m intraday candles; W/M/Y are
// client-side slices of the same ~269-session daily series (no from/to
// round-trip needed since the API already returns that much by default).
const INTERVALS = ["1D", "1W", "1M", "1Y"] as const;
const DAILY_SLICE: Record<Exclude<(typeof INTERVALS)[number], "1D">, number> = {
  "1W": 5,
  "1M": 22,
  "1Y": 269,
};

export function ResearchDetail({ symbol }: { symbol: string }) {
  const { getToken } = useAuth();
  const [data, setData] = useState<ResearchDetailType | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<(typeof INTERVALS)[number]>("1M");
  const [dailyCandles, setDailyCandles] = useState<Candle[]>([]);
  const [intradayCandles, setIntradayCandles] = useState<Candle[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const env = await apiGet<ResearchDetailType>(`/research/${encodeURIComponent(symbol)}`, token ? { token } : undefined);
        if (!cancelled) setData(env.data);
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError) setError({ status: e.status, message: e.message });
          else setError({ status: 0, message: "Something went wrong." });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol, getToken]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    apiGet<{ candles: Candle[] }>(`/charts/${encodeURIComponent(symbol)}`, { params: { interval: "1d" } })
      .then((env) => !cancelled && setDailyCandles(env.data.candles))
      .catch(() => !cancelled && setDailyCandles([]));
    return () => {
      cancelled = true;
    };
  }, [symbol, data]);

  useEffect(() => {
    if (range !== "1D" || !data) return;
    let cancelled = false;
    apiGet<{ candles: Candle[] }>(`/charts/${encodeURIComponent(symbol)}`, { params: { interval: "15m" } })
      .then((env) => !cancelled && setIntradayCandles(env.data.candles))
      .catch(() => !cancelled && setIntradayCandles([]));
    return () => {
      cancelled = true;
    };
  }, [symbol, range, data]);

  const visibleCandles = range === "1D" ? intradayCandles : dailyCandles.slice(-DAILY_SLICE[range]);

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;

  if (error?.status === 429) {
    return (
      <Card>
        <p className="text-sm">You&apos;ve used your free-tier research lookups for today.</p>
        <Link href="/pricing" className="mt-2 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
          Upgrade for unlimited research
        </Link>
      </Card>
    );
  }
  if (error?.status === 404) {
    return <p className="text-sm text-foreground-muted">No research data found for {symbol}.</p>;
  }
  if (error) {
    return <p className="text-sm text-down">{error.message}</p>;
  }
  if (!data) return null;

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
        <Card
          title="Chart"
          action={
            <div className="flex gap-1 text-xs">
              {INTERVALS.map((i) => (
                <button
                  key={i}
                  onClick={() => setRange(i)}
                  className={`rounded px-2 py-1 ${range === i ? "bg-accent text-accent-foreground" : "text-foreground-muted"}`}
                >
                  {i}
                </button>
              ))}
            </div>
          }
        >
          <CandleChart candles={visibleCandles} />
        </Card>
      </ErrorBoundary>

      <ErrorBoundary>
        <FundamentalsPanels symbol={data.symbol} fundamentals={data.fundamentals} />
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
