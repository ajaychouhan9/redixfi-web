import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSignalDetail, getChart, getResearch } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { AiLabel } from "@/components/ui/AiLabel";
import { SignalStateChip } from "@/components/ui/Chip";
import { ExplainTerm } from "@/components/ui/ExplainTerm";
import { AnalystChecklist } from "@/components/app/signals/AnalystChecklist";
import { CandleChart } from "@/components/app/CandleChart";
import { NewsList } from "@/components/app/NewsList";
import { WatchlistButton } from "@/components/app/WatchlistButton";
import { RecordView } from "@/components/app/RecordView";
import { formatShortDate } from "@/lib/format";
import type { SignalConflict } from "@/lib/api/types";

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  return {
    title: `${symbol.toUpperCase()} Signal Score`,
    description: `Measured composite signal score, trend, delivery, sector standing and options positioning for ${symbol.toUpperCase()} — factual, not a prediction.`,
  };
}

export default async function SignalDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;

  let detail;
  try {
    detail = (await getSignalDetail(symbol)).data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const [chartR, deliveryR] = await Promise.allSettled([
    getChart(symbol, { interval: "1d" }),
    getResearch(symbol),
  ]);
  const candles = chartR.status === "fulfilled" ? chartR.value.data.candles : [];
  const delivery30d = deliveryR.status === "fulfilled" ? deliveryR.value.data.delivery_30d : undefined;

  const s = detail.signals;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <RecordView symbol={detail.symbol} companyName={detail.company_name} />

      <div>
        <p className="text-sm text-foreground-muted">
          {detail.symbol} · {detail.sector}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <ExplainTerm metricKey="composite_score" ctx={{ score: detail.composite_score, symbol: detail.symbol }}>
            <span className="text-3xl font-semibold">{detail.composite_score}/100</span>
          </ExplainTerm>
          <ExplainTerm metricKey="delta_1d" ctx={{ delta: detail.delta_1d }}>
            <DeltaValue value={detail.delta_1d} />
          </ExplainTerm>
          <span className="text-xs text-foreground-faint">5d: <DeltaValue value={detail.delta_5d} /></span>
        </div>
        <p className="mt-1 text-xs text-foreground-faint">A measured summary of observed signals. Not a prediction.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {detail.signal_states.map((st) => (
            <SignalStateChip key={st} code={st} />
          ))}
        </div>
        <div className="mt-3">
          <WatchlistButton symbol={detail.symbol} />
        </div>
      </div>

      <Card title="AI Summary" action={<AiLabel />}>
        <p className="text-sm leading-relaxed">{detail.narrative}</p>
      </Card>

      {detail.conflicts.length > 0 && (
        <Card title="Tension in the data" action={<AiLabel />}>
          <ul className="space-y-2">
            {detail.conflicts.map((c: SignalConflict, i: number) => (
              <li key={i} className="rounded-lg bg-amber-bg px-3 py-2 text-sm text-amber">
                ⚡ {c.text ?? JSON.stringify(c)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="What the data shows">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DataRow label="Trend (10d)">
            <ExplainTerm metricKey="trend_10d" ctx={{ symbol: detail.symbol, pct: s.trend_10d_pct, dmaSessions: s.above_dma20_sessions }}>
              {s.trend_10d_pct}% · above 20-DMA {s.above_dma20_sessions} session(s)
            </ExplainTerm>
          </DataRow>
          <DataRow label="Sector standing">
            <ExplainTerm metricKey="sector_rank" ctx={{ symbol: detail.symbol, rank: s.sector_rank, count: s.sector_count, sector: detail.sector }}>
              #{s.sector_rank} of {s.sector_count} in {detail.sector}
            </ExplainTerm>
          </DataRow>
          <DataRow label="Delivery">
            <ExplainTerm metricKey="delivery_pct" ctx={{ symbol: detail.symbol, pct: s.delivery_pct, avg: s.delivery_avg20 }}>
              {s.delivery_pct}% vs {s.delivery_avg20}% avg
            </ExplainTerm>
          </DataRow>
          <DataRow label="FII flow (5d)">
            <ExplainTerm metricKey="fii_flow" ctx={{ direction: "buy", days: s.fii_net_buy_days_5 }}> {/* compliance-ignore: fii_net_buy_days_5 is literally a "net buying days" counter */}
              net buy {s.fii_net_buy_days_5}/5 days
            </ExplainTerm>
          </DataRow>
          <DataRow label="PCR">
            {s.pcr_available ? (
              <ExplainTerm metricKey="pcr" ctx={{ pcr: s.pcr, band: s.pcr > 1 ? "put-heavy" : "call-heavy" }}>
                {s.pcr} · {s.pcr > 1 ? "put-heavy" : "call-heavy"}
              </ExplainTerm>
            ) : (
              <span className="text-foreground-faint">Not available</span>
            )}
          </DataRow>
          <DataRow label="RSI (14)">
            <ExplainTerm metricKey="rsi" ctx={{ rsi: s.rsi_14, zone: s.rsi_14 >= 70 ? "overbought" : s.rsi_14 <= 30 ? "oversold" : "neutral" }}>
              {s.rsi_14}
            </ExplainTerm>
          </DataRow>
          <DataRow label="Promoter pledge">
            <ExplainTerm metricKey="pledge" ctx={{ pct: s.pledge_pct, trend: s.pledge_trend }}>
              {s.pledge_pct}% · {s.pledge_trend}
            </ExplainTerm>
          </DataRow>
          <DataRow label="Insider activity (30d)">
            <ExplainTerm metricKey="insider" ctx={{ value: s.insider_net_30d }}>
              {s.insider_net_30d}
            </ExplainTerm>
          </DataRow>
          <DataRow label="Event risk (5d)">
            <ExplainTerm metricKey="event_risk" ctx={{ symbol: detail.symbol, hasRisk: String(s.event_risk_5d) }}>
              {s.event_risk_5d ? `Yes — ${s.event_categories.join(", ")}` : "None"}
            </ExplainTerm>
          </DataRow>
        </dl>
      </Card>

      <AnalystChecklist detail={detail} />

      <Card title="Signal Change Log">
        {detail.change_log.length === 0 ? (
          <p className="text-sm text-foreground-muted">No signal changes logged yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {detail.change_log.map((c, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="text-foreground-muted">{formatShortDate(c.date)}</span>
                <DeltaValue value={c.delta} className="w-14" />
                <span className="flex-1 px-2">{c.note}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Chart (3M daily)">
        <CandleChart candles={candles} delivery={delivery30d} />
      </Card>

      <Card title="Related news">
        <NewsList items={detail.news} />
      </Card>
    </div>
  );
}

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-sm">
      <dt className="text-xs font-medium text-foreground-faint">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
