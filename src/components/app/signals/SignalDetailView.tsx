import { Card } from "@/components/ui/Card";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { AiLabel } from "@/components/ui/AiLabel";
import { SignalStateChip } from "@/components/ui/Chip";
import { ExplainTerm } from "@/components/ui/ExplainTerm";
import { AnalystChecklist } from "@/components/app/signals/AnalystChecklist";
import { WhyDidThisChange } from "@/components/app/signals/WhyDidThisChange";
import { InsightChips } from "@/components/app/education/InsightChips";
import { CandleChart } from "@/components/app/CandleChart";
import { NewsList } from "@/components/app/NewsList";
import { WatchlistButton } from "@/components/app/WatchlistButton";
import { RecordView } from "@/components/app/RecordView";
import { CompareIndicator } from "@/components/app/CompareIndicator";
import { CurrentSymbolSync } from "@/components/app/CurrentSymbolSync";
import { formatShortDate } from "@/lib/format";
import Link from "next/link";
import type { Candle, DeliveryPoint, FundamentalsBlock, SignalConflict, SignalDetail } from "@/lib/api/types";

/**
 * Bug 2 fix — extracted out of app/(app)/signals/[symbol]/page.tsx (same
 * "server fetches, presentational component just renders props" split
 * Task 14 established for Research) so the SAME unlocked-content markup
 * can be rendered from BOTH the server page's default (anonymous) SSR
 * render AND SignalUnlockGate's client-side correction for a real
 * logged-in paid user — see that file for why a correction is needed at
 * all (Server Components can't read the browser's localStorage-held
 * auth token, so the SSR fetch is always anonymous).
 */
export function SignalDetailView({
  detail,
  candles,
  delivery30d,
  fundamentals,
}: {
  detail: SignalDetail;
  candles: Candle[];
  delivery30d?: DeliveryPoint[];
  fundamentals?: FundamentalsBlock | null;
}) {
  const s = detail.signals;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <CurrentSymbolSync symbol={detail.symbol} />
      <RecordView symbol={detail.symbol} companyName={detail.company_name} />

      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-foreground-muted">
              {detail.symbol} · {detail.sector}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <ExplainTerm metricKey="composite_score" symbol={detail.symbol} ctx={{ composite_score: detail.composite_score, symbol: detail.symbol }}>
                <span className="text-3xl font-semibold">{detail.composite_score}/100</span>
              </ExplainTerm>
              <ExplainTerm metricKey="delta_1d" symbol={detail.symbol} ctx={{ delta_1d: detail.delta_1d, symbol: detail.symbol }}>
                <DeltaValue value={detail.delta_1d} />
              </ExplainTerm>
              <span className="text-xs text-foreground-faint">5d: <DeltaValue value={detail.delta_5d} /></span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <WatchlistButton symbol={detail.symbol} />
            <CompareIndicator symbol={detail.symbol} companyName={detail.company_name} />
          </div>
        </div>
        <p className="mt-1 text-xs text-foreground-faint">A measured summary of observed signals. Not a prediction.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {detail.signal_states.map((st) => (
            <SignalStateChip key={st} code={st} />
          ))}
        </div>
        {(detail.insight_chips ?? []).length > 0 && (
          <div className="mt-3">
            <InsightChips chips={detail.insight_chips} symbol={detail.symbol} />
          </div>
        )}
      </div>

      <Card title="AI Summary" action={<AiLabel />}>
        <p className="text-sm leading-relaxed">{detail.narrative}</p>
      </Card>

      {detail.change_explanation && (
        <Card title="Why did this change?">
          <WhyDidThisChange componentChanges={detail.component_changes ?? []} explanation={detail.change_explanation} />
        </Card>
      )}

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
            {s.trend_10d_pct === null ? (
              <span className="text-foreground-faint">Not available</span>
            ) : (
              <ExplainTerm metricKey="trend_10d_pct" symbol={detail.symbol} ctx={{ symbol: detail.symbol, trend_10d_pct: s.trend_10d_pct }}>
                {s.trend_10d_pct}% · above 20-DMA {s.above_dma20_sessions} session(s)
              </ExplainTerm>
            )}
          </DataRow>
          <DataRow label="Sector standing">
            {s.sector_rank === null || s.sector_count === null ? (
              <span className="text-foreground-faint">
                {detail.industry ? "Not enough peers to rank" : "No industry classification on file yet"}
              </span>
            ) : (
              <ExplainTerm metricKey="sector_rank" symbol={detail.symbol} ctx={{ symbol: detail.symbol, sector_rank: s.sector_rank, sector_count: s.sector_count, sector_name: detail.industry ?? "" }}>
                #{s.sector_rank} of {s.sector_count} in {detail.industry}
              </ExplainTerm>
            )}
          </DataRow>
          <DataRow label="Delivery">
            {s.delivery_pct === null || s.delivery_avg20 === null ? (
              <span className="text-foreground-faint">Not available</span>
            ) : (
              <ExplainTerm metricKey="delivery_pct" symbol={detail.symbol} ctx={{ symbol: detail.symbol, delivery_pct: s.delivery_pct, delivery_avg20: s.delivery_avg20 }}>
                {s.delivery_pct}% vs {s.delivery_avg20}% avg
              </ExplainTerm>
            )}
          </DataRow>
          <DataRow label="FII flow (5d)">
            {s.fii_net_buy_days_5 === null ? (
              <span className="text-foreground-faint">Not available</span>
            ) : (
              <ExplainTerm metricKey="fii_flow" symbol={detail.symbol} ctx={{ symbol: detail.symbol, fii_direction: "buy", fii_days: s.fii_net_buy_days_5 }}> {/* compliance-ignore: fii_net_buy_days_5 is literally a "net buying days" counter */}
                net buy {s.fii_net_buy_days_5}/5 days
              </ExplainTerm>
            )}
          </DataRow>
          <DataRow label="PCR">
            {s.pcr_available ? (
              <ExplainTerm metricKey="pcr" symbol={detail.symbol} ctx={{ symbol: detail.symbol, pcr: s.pcr }}>
                {s.pcr} · {s.pcr > 1 ? "put-heavy" : "call-heavy"}
              </ExplainTerm>
            ) : (
              <span className="text-foreground-faint">Not available</span>
            )}
          </DataRow>
          <DataRow label="RSI (14)">
            {s.rsi_14 === null ? (
              <span className="text-foreground-faint">Not available</span>
            ) : (
              <ExplainTerm metricKey="rsi_14" symbol={detail.symbol} ctx={{ symbol: detail.symbol, rsi_14: s.rsi_14 }}>
                {s.rsi_14}
              </ExplainTerm>
            )}
          </DataRow>
          <DataRow label="Promoter pledge">
            {s.pledge_pct === null ? (
              <span className="text-foreground-faint">Not available</span>
            ) : (
              <ExplainTerm metricKey="promoter_pledge" symbol={detail.symbol} ctx={{ symbol: detail.symbol, pledge_pct: s.pledge_pct }}>
                {s.pledge_pct}%{s.pledge_trend && <> · {s.pledge_trend.toLowerCase()}</>}
              </ExplainTerm>
            )}
          </DataRow>
          <DataRow label="Insider activity (30d)">
            <ExplainTerm
              metricKey="insider_activity"
              symbol={detail.symbol}
              ctx={{
                symbol: detail.symbol,
                insider_summary: s.insider_net_30d > 0 ? `net buying of ₹${s.insider_net_30d}` : s.insider_net_30d < 0 ? `net selling of ₹${Math.abs(s.insider_net_30d)}` : "no net activity",
              }}
            >
              {s.insider_net_30d}
            </ExplainTerm>
          </DataRow>
          <DataRow label="Event risk (5d)">
            <ExplainTerm metricKey="event_risk" symbol={detail.symbol} ctx={{ symbol: detail.symbol, event_risk_state: s.event_risk_5d ? "an event was flagged" : "no event flagged" }}>
              {s.event_risk_5d ? `Yes — ${s.event_categories.join(", ")}` : "None"}
            </ExplainTerm>
          </DataRow>
        </dl>
      </Card>

      <AnalystChecklist detail={detail} fundamentals={fundamentals} />

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
        <Link href={`/track-record/${detail.symbol}`} className="mt-3 inline-block text-sm font-medium text-accent">
          See full signal history →
        </Link>
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
