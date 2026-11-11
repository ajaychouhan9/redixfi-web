"use client";

import { SlowestInputNote } from "@/components/ui/SlowestInputNote";
import { CorporateActionNote } from "@/components/ui/CorporateActionNote";
import { Card } from "@/components/ui/Card";
import { AiLabel } from "@/components/ui/AiLabel";
import { ExplainTerm } from "@/components/ui/ExplainTerm";
import { AskPills } from "@/components/app/signals/AskPills";
import { Week52Range } from "@/components/app/signals/Week52Range";
import { VolatilitySection } from "@/components/app/signals/VolatilitySection";
import { StockPriceHeader } from "@/components/app/signals/StockPriceHeader";
import { notableCombination } from "@/lib/notable-combination";
import { getChecklistRows } from "@/lib/signal-detail-export";
import dynamic from "next/dynamic";
import { PriceGapNote } from "@/components/app/signals/PriceGapNote";
import { QuickRead } from "@/components/app/signals/QuickRead";
import { chartCaption, isTradeForTrade } from "@/lib/stock-clarity";
import { displayName } from "@/lib/company-name";
import { NewsList } from "@/components/app/NewsList";
import { WatchlistButton } from "@/components/app/WatchlistButton";
import { ReportActions } from "@/components/app/report/ReportActions";
import { ExploreHistoryLink } from "@/components/app/history/HistoryLinks";
import { AlertCreateButton } from "@/components/app/alerts/AlertCreateButton";
import { RecordView } from "@/components/app/RecordView";
import { CompareIndicator } from "@/components/app/CompareIndicator";
import { CurrentSymbolSync } from "@/components/app/CurrentSymbolSync";
import { formatDataAsOf, formatPriceAsOf, formatShortDate } from "@/lib/format";
import type { Candle, DeliveryPoint, FundamentalsBlock, SignalConflict, SignalDetail, DataAsOf } from "@/lib/api/types";
import { ExportButton } from "@/components/ui/ExportButton";
import { downloadXlsx } from "@/lib/xlsx";
import { buildSignalDetailSheets } from "@/lib/signal-detail-export";
import { isProEntitled } from "@/lib/entitlements";
import { useAuth } from "@/lib/auth/AuthContext";
import { stockPath } from "@/lib/seo/stock-symbol";

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
/** True when the shown price comes from the delayed live feed (market open, today's bar), so the 52-week marker can use it. */
function isLiveLabel(asOf: { data_as_of: string } | null | undefined): boolean {
  return /^As of \d{2}:\d{2} IST \(delayed\)$/.test(formatPriceAsOf(asOf));
}

const PriceChartLazy = dynamic(() => import("@/components/app/signals/PriceChart").then((m) => m.PriceChart), {
  ssr: false,
  loading: () => <div className="h-[260px] animate-pulse rounded-xl bg-hover" aria-hidden="true" />,
});

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
  const { user } = useAuth();
  const s = detail.signals;
  const exportSheets = buildSignalDetailSheets(detail, candles, delivery30d, fundamentals);
  const exportXlsx = () => downloadXlsx(`redixfi-signal-${detail.symbol.toLowerCase()}.xlsx`, exportSheets);
  const combination = notableCombination({ ...detail.signals, pcr: detail.signals.pcr, pcr_available: detail.signals.pcr_available });
  const readingsDate = detail.date;
  const asOfClose = readingsDate ? `As of ${formatShortDate(String(readingsDate).slice(0, 10))} close` : "";
  // the two checklist items that appear nowhere else on the page (growth and valuation, which need the fundamentals block)
  const checklistExtras = getChecklistRows(detail, fundamentals).filter((r) => r.label === "Growth trend" || r.label === "Valuation vs peers");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <CurrentSymbolSync symbol={detail.symbol} />
      <RecordView symbol={detail.symbol} companyName={detail.company_name} />
      {detail.limited_data && (
        <div className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-foreground-muted">
          <span className="font-medium text-foreground">Feed incomplete.</span>{" "}
          {detail.limited_data_note || "Part of this stock's price or volume feed is missing, so some readings are partial."}
        </div>
      )}
      {detail.partial && !detail.limited_data && !isTradeForTrade(s.delivery_series) && (
        <div className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-foreground-muted">
          <span className="font-medium text-foreground">Partial reading.</span> Some inputs were not
          available for this session; the reading is built from what was measured.
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <StockPriceHeader
            h1
            symbol={detail.symbol}
            name={detail.company_name}
            group={detail.industry || detail.sector}
            price={detail.last_price}
            pct={detail.day_change_pct}
            asOf={detail.price_data_as_of}
          />
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
            <ExportButton onExport={exportXlsx} canExport={isProEntitled(user)} label="Download Excel" enabledTitle="Export as Excel" disabledTitle="Upgrade to export Excel" />
            <WatchlistButton symbol={detail.symbol} />
            <CompareIndicator symbol={detail.symbol} companyName={detail.company_name} />
            <AlertCreateButton symbol={detail.symbol} />
            <ReportActions symbol={detail.symbol} />
            <ExploreHistoryLink symbol={detail.symbol} />
          </div>
        </div>
        {detail.vwap !== null && detail.vwap !== undefined && (
          <p className="mt-1 text-xs text-foreground-muted" data-testid="day-average">
            Day&apos;s average traded price (VWAP) ₹{detail.vwap.toLocaleString("en-IN")}
            {typeof detail.last_price === "number" && detail.vwap > 0 && (
              <> · Price vs day&apos;s average {(((detail.last_price / detail.vwap) - 1) * 100) >= 0 ? "+" : "-"}{Math.abs(((detail.last_price / detail.vwap) - 1) * 100).toFixed(2)}%</>
            )}
          </p>
        )}
        <QuickRead detail={detail} />
        <PriceGapNote pct={detail.day_change_pct} readingsDate={detail.date} />
        <CorporateActionNote info={detail.corporate_action} />
        <Week52Range
          week52={detail.week52}
          lastPrice={detail.last_price}
          livePrice={isLiveLabel(detail.price_data_as_of) ? detail.last_price : null}
          liveLabel={isLiveLabel(detail.price_data_as_of) ? formatPriceAsOf(detail.price_data_as_of) : null}
        />
        <SlowestInputNote input={detail.slowest_input} />
      </div>

      <PriceChartLazy candles={candles} high52={detail.week52?.week52_high} low52={detail.week52?.week52_low} />

      <VolatilitySection symbol={detail.symbol} />

      <Card title="What the data shows">
        {combination && (
          <div className="mb-3 rounded-lg bg-surface px-3 py-2 text-sm" data-testid="notable-combination">
            <p className="text-xs font-medium text-foreground-faint">Notable combination</p>
            <p className="mt-0.5 text-foreground">{combination}</p>
            <p className="mt-1 text-[11px] text-foreground-faint">{asOfClose}</p>
          </div>
        )}
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DataRow label="Trend (10d)" asOf={detail.signal_freshness?.trend_10d_pct}>
            {s.trend_10d_pct === null ? (
              <span className="text-foreground-faint">Not available</span>
            ) : (
              <ExplainTerm metricKey="trend_10d_pct" symbol={detail.symbol} ctx={{ symbol: detail.symbol, trend_10d_pct: s.trend_10d_pct }}>
                {s.trend_10d_pct}% · above 20-DMA {s.above_dma20_sessions} session(s)
              </ExplainTerm>
            )}
          </DataRow>
          <DataRow label="Sector standing" asOf={detail.signal_freshness?.sector_rank}>
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
          <DataRow
            label="Delivery (previous session)"
            asOf={isTradeForTrade(s.delivery_series) ? null : detail.signal_freshness?.delivery_pct}
          >
            {isTradeForTrade(s.delivery_series) ? (
              <span className="text-foreground-faint">Delivery not applicable ({s.delivery_series} series)</span>
            ) : s.delivery_pct === null || s.delivery_avg20 === null ? (
              <span className="text-foreground-faint">Not available</span>
            ) : (
              <ExplainTerm metricKey="delivery_pct" symbol={detail.symbol} ctx={{ symbol: detail.symbol, delivery_pct: s.delivery_pct, delivery_avg20: s.delivery_avg20 }}>
                {s.delivery_pct}% vs {s.delivery_avg20}% avg
              </ExplainTerm>
            )}
          </DataRow>
          <DataRow label="FII flow (5d)" asOf={detail.signal_freshness?.fii_net_buy_days_5}>
            {s.fii_net_buy_days_5 === null ? (
              <span className="text-foreground-faint">Not available</span>
            ) : (
              <ExplainTerm metricKey="fii_flow" symbol={detail.symbol} ctx={{ symbol: detail.symbol, fii_direction: "buy", fii_days: s.fii_net_buy_days_5 }}> {/* compliance-ignore: fii_net_buy_days_5 is literally a "net buying days" counter */}
                net buy {s.fii_net_buy_days_5}/5 days
              </ExplainTerm>
            )}
          </DataRow>
          <DataRow label="PCR" asOf={detail.signal_freshness?.pcr}>
            {s.pcr_available ? (
              <ExplainTerm metricKey="pcr" symbol={detail.symbol} ctx={{ symbol: detail.symbol, pcr: s.pcr }}>
                {s.pcr} · {s.pcr > 1 ? "put-heavy" : "call-heavy"}
              </ExplainTerm>
            ) : (
              <span className="text-foreground-faint">Not available</span>
            )}
          </DataRow>
          <DataRow label="RSI (14)" asOf={detail.signal_freshness?.trend_10d_pct}>
            {s.rsi_14 === null ? (
              <span className="text-foreground-faint">Not available</span>
            ) : (
              <ExplainTerm metricKey="rsi_14" symbol={detail.symbol} ctx={{ symbol: detail.symbol, rsi_14: s.rsi_14 }}>
                {s.rsi_14}
              </ExplainTerm>
            )}
          </DataRow>
          <DataRow label="Promoter pledge" asOf={detail.signal_freshness?.pledge_pct}>
            {s.pledge_pct === null ? (
              <span className="text-foreground-faint">Not available</span>
            ) : (
              <ExplainTerm metricKey="promoter_pledge" symbol={detail.symbol} ctx={{ symbol: detail.symbol, pledge_pct: s.pledge_pct }}>
                {s.pledge_pct}%{s.pledge_trend && <> · {s.pledge_trend.toLowerCase()}</>}
              </ExplainTerm>
            )}
          </DataRow>
          <DataRow label="Insider activity (30d)" asOf={detail.signal_freshness?.insider_net_30d}>
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
          <DataRow label="Volume vs usual (5-day vs 20-day)" asOf={detail.signal_freshness?.volume_ratio_5d}>
            {s.volume_ratio_5d == null ? <span className="text-foreground-faint">Not available</span> : `${s.volume_ratio_5d}x its usual level`}
          </DataRow>
          {checklistExtras.map((r) => (
            <DataRow key={r.label} label={r.label}>
              {r.value}
            </DataRow>
          ))}
          <DataRow label="News in the last 5 days">
            {detail.news_5d ? (
              <a href={detail.news_5d.url ?? undefined} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-2 hover:underline">
                {detail.news_5d.headline}
              </a>
            ) : (
              <span className="text-foreground-faint">No headline naming the company</span>
            )}
          </DataRow>
        </dl>
      </Card>

      <AskPills symbol={detail.symbol} />

      <Card title="Related news">
        <NewsList items={detail.news} />
      </Card>
    </div>
  );
}

function Freshness({ asOf }: { asOf?: DataAsOf | null }) {
  return <p className="mt-1 text-[11px] text-foreground-faint">{formatDataAsOf(asOf)}</p>;
}

function DataRow({ label, children, asOf }: { label: string; children: React.ReactNode; asOf?: DataAsOf | null }) {
  return (
    <div className="text-sm">
      <dt className="text-xs font-medium text-foreground-faint">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
      <Freshness asOf={asOf} />
    </div>
  );
}
