import { formatPrice52, resolve52Week } from "@/lib/week52";
import type { Candle, DeliveryPoint, FundamentalsBlock, SignalDetail } from "./api/types";
import { formatYmd } from "./format";
import type { XlsxSheet, XlsxSummaryRow } from "./xlsx";

const COMPONENT_LABEL: Record<string, string> = {
  trend: "Price trend",
  volume: "Volume participation",
  delivery: "Delivery participation",
  rsi: "Momentum (RSI)",
  sector: "Sector standing",
  pcr: "Options positioning (PCR)",
  pledge: "Promoter pledge",
  insider: "Insider activity",
  fii: "FII flow context",
};

const ARROW: Record<string, string> = { up: "⬆", down: "⬇", flat: "➡" };

export interface DetailTextRow {
  label: string;
  value: string;
}


export function getWhatDataShowsRows(detail: SignalDetail): DetailTextRow[] {
  const s = detail.signals;
  return [
    {
      label: "Trend (10d)",
      value: s.trend_10d_pct == null ? "Not available" : `${s.trend_10d_pct}% · above 20-DMA ${s.above_dma20_sessions ?? "Not available"} session(s)`,
    },
    {
      label: "Sector standing",
      value:
        s.sector_rank == null || s.sector_count == null
          ? detail.industry
            ? "Not enough peers to rank"
            : "No industry classification on file yet"
          : `#${s.sector_rank} of ${s.sector_count} in ${detail.industry}`,
    },
    {
      label: "Delivery",
      value: s.delivery_pct == null || s.delivery_avg20 == null ? "Not available" : `${s.delivery_pct}% vs ${s.delivery_avg20}% avg`,
    },
    { label: "FII flow (5d)", value: s.fii_net_buy_days_5 == null ? "Not available" : `net buy ${s.fii_net_buy_days_5}/5 days` },
    { label: "PCR", value: s.pcr_available && s.pcr != null ? `${s.pcr} · ${s.pcr > 1 ? "put-heavy" : "call-heavy"}` : "Not available" },
    { label: "RSI (14)", value: s.rsi_14 == null ? "Not available" : String(s.rsi_14) },
    { label: "Promoter pledge", value: s.pledge_pct == null ? "Not available" : `${s.pledge_pct}%${s.pledge_trend ? ` · ${s.pledge_trend.toLowerCase()}` : ""}` },
    { label: "Insider activity (30d)", value: s.insider_net_30d == null ? "Not available" : String(s.insider_net_30d) },
    { label: "News in the last 5 days", value: detail.news_5d ? detail.news_5d.headline : "No headline naming the company" },
  ];
}

export function getChecklistRows(detail: SignalDetail, fundamentals?: FundamentalsBlock | null): DetailTextRow[] {
  const s = detail.signals;
  const states = new Set(detail.signal_states);
  const rows: DetailTextRow[] = [
    {
      label: "Trend",
      value:
        s.trend_10d_pct == null
          ? "Not enough price history to measure a 10-session trend yet."
          : states.has("TREND_UP_10D")
            ? `Price rose ${s.trend_10d_pct}% over the last 10 sessions.`
            : states.has("TREND_DOWN_10D")
              ? `Price fell ${Math.abs(s.trend_10d_pct)}% over the last 10 sessions.`
              : `Price was little changed over the last 10 sessions (${s.trend_10d_pct}%).`,
    },
    {
      label: "Volume confirmation",
      value:
        s.volume_ratio_5d == null
          ? "Not enough volume history to measure participation yet."
          : states.has("VOLUME_ELEVATED")
            ? `Volume ran ${s.volume_ratio_5d}x the 5-day average — elevated participation.`
            : states.has("VOLUME_MUTED")
              ? `Volume ran ${s.volume_ratio_5d}x the 5-day average — muted participation.`
              : `Volume was near its 5-day average (${s.volume_ratio_5d}x).`,
    },
    {
      label: "Delivery quality",
      value:
        s.delivery_pct == null || s.delivery_avg20 == null
          ? "Delivery data not available for this stock."
          : states.has("DELIVERY_UP")
            ? `Delivery rose to ${s.delivery_pct}% vs a ${s.delivery_avg20}% 20-day average.`
            : states.has("DELIVERY_DOWN")
              ? `Delivery fell to ${s.delivery_pct}% vs a ${s.delivery_avg20}% 20-day average.`
              : `Delivery held near its average (${s.delivery_pct}% vs ${s.delivery_avg20}%).`,
    },
    {
      label: "Sector standing",
      value:
        s.sector_rank == null || s.sector_count == null
          ? detail.industry
            ? `Fewer than 5 measured peers in ${detail.industry} — not enough to rank.`
            : "No industry classification on file yet for this stock — not enough to rank."
          : `Ranks #${s.sector_rank} of ${s.sector_count} stocks measured in ${detail.industry} today.`,
    },
  ];
  if (fundamentals?.coverage.has_quarterly) {
    const q = fundamentals.quarterly;
    rows.push({
      label: "Growth trend",
      value:
        q.revenue_yoy_pct == null
          ? "Not enough filed quarters to measure a growth trend yet."
          : q.revenue_accel_quarters >= 2
            ? `Revenue grew ${q.revenue_yoy_pct}% YoY last quarter — the ${q.revenue_accel_quarters}th straight quarter of accelerating YoY growth.`
            : `Revenue grew ${q.revenue_yoy_pct}% YoY last quarter (no multi-quarter acceleration streak on file).`,
    });
  }
  if (fundamentals) {
    const v = fundamentals.valuation;
    rows.push({
      label: "Valuation vs peers",
      value:
        v.pe_ttm == null || v.sector_pe == null
          ? "P/E or sector P/E not available for this stock yet."
          : `Trailing P/E of ${v.pe_ttm} sits ${v.pe_vs_sector ?? "in line with"} the sector average of ${v.sector_pe}.`,
    });
  }
  const fb = fundamentals?.fallback_source;
  const fbDate = fb?.growth_as_of ?? fb?.valuation_as_of;
  if (fb && fbDate) {
    rows.push({ label: "Fundamentals source", value: `Source: Yahoo Finance, as of ${formatYmd(fbDate) || fbDate}` });
  }
  return rows;
}

export function buildSignalSummaryRows(detail: SignalDetail, fundamentals?: FundamentalsBlock | null): XlsxSummaryRow[] {
  const rows: XlsxSummaryRow[] = [];
  const section = (label: string) => rows.push({ kind: "section", cells: [label, "", "", ""] }, { kind: "blank" });
  const table = (headers: string[]) => rows.push({ kind: "header", cells: headers });
  const items = (values: DetailTextRow[]) => values.forEach((row) => rows.push({ kind: "item", cells: [row.label, row.value] }));
  const week52 = detail.week52;
  const r52 = week52 ? resolve52Week(week52.week52_high, week52.week52_low, week52.last_close) : null;
  section("52-week range");
  items(week52?.week52_high != null
    ? [
        { label: "52-week low", value: week52.week52_low != null ? `₹${formatPrice52(r52?.low ?? week52.week52_low)}` : "Not available from data source" },
        { label: "52-week high", value: `₹${formatPrice52(r52?.high ?? week52.week52_high)}` },
        { label: "Distance from high", value: r52 ? `${r52.belowHighPct.toFixed(1)}% below` : week52.pct_below_52w_high != null ? `${week52.pct_below_52w_high.toFixed(1)}% below` : "Not available from data source" },
        { label: "As of", value: week52.as_of ?? "Not available from data source" },
      ]
    : [{ label: "52-week range", value: week52?.reason ?? "Price history incomplete" }]);

  rows.push(
    { kind: "title", cells: ["RedixFi — Market. Simplified."] , merge: [0, 3] },
    { kind: "subtitle", cells: [`${detail.symbol} — Delivery, volume and price data`], merge: [0, 3] },
    { kind: "metadata", cells: ["Date", detail.date, "Industry / Sector", `${detail.industry ?? "Not available"} / ${detail.sector}`] },
    { kind: "blank" },
  );

  if (detail.corporate_action?.note) {
    rows.push({ kind: "narrative", cells: ["Note", detail.corporate_action.note], merge: [1, 3] }, { kind: "blank" });
  }

  section("TENSION IN THE DATA");
  rows.push({ kind: "narrative", cells: ["Observation", detail.conflicts.length ? detail.conflicts.map((conflict) => conflict.text ?? JSON.stringify(conflict)).join("\n") : "No material tension identified in the current measured signals."], merge: [1, 3] }, { kind: "blank" });

  section("WHAT THE DATA SHOWS");
  table(["Metric", "Value"]);
  items(getWhatDataShowsRows(detail));
  rows.push({ kind: "blank" });

  section("ANALYST CHECKLIST");
  table(["Check", "Observation"]);
  items(getChecklistRows(detail, fundamentals));
  return rows;
}

export function buildSignalDetailCsvRows(detail: SignalDetail, candles: Candle[], delivery30d: DeliveryPoint[] = []): Record<string, unknown>[] {
  const s = detail.signals;
  const base = {
    symbol: detail.symbol,
    company_name: detail.company_name,
    date: detail.date,
    sector: detail.sector,
    industry: detail.industry ?? "",
    price: detail.last_price ?? "",
    day_change_pct: detail.day_change_pct ?? "",
    vwap: detail.vwap ?? "",
    signal_states: detail.signal_states.join(", "),
    trend_10d_pct: s.trend_10d_pct,
    volume_ratio_5d: s.volume_ratio_5d,
    volume_state: detail.signal_states.find((state) => state.startsWith("VOLUME_")) ?? "",
    delivery_pct: s.delivery_pct,
    delivery_avg20: s.delivery_avg20,
    sector_rank: s.sector_rank,
    sector_universe_count: s.sector_count,
    fii_net_buy_days_5: s.fii_net_buy_days_5,
    pcr: s.pcr_available ? s.pcr : "",
    rsi_14: s.rsi_14,
    pledge_pct: s.pledge_pct,
    pledge_trend: s.pledge_trend,
    insider_net_30d: s.insider_net_30d,
  };
  const rows: Record<string, unknown>[] = [{ record_type: "signal", ...base }];
  rows.push(...candles.map((candle) => ({ record_type: "candle", symbol: detail.symbol, company_name: detail.company_name, candle_timestamp: candle.timestamp, open: candle.open, high: candle.high, low: candle.low, close: candle.close, volume: candle.volume })));
  rows.push(...delivery30d.map((point) => ({ record_type: "delivery_history", symbol: detail.symbol, company_name: detail.company_name, delivery_date: point.date, delivery_pct_history: point.delivery_pct })));
  rows.push(...detail.news.map((item) => ({ record_type: "news", symbol: detail.symbol, company_name: detail.company_name, news_uuid: item.uuid, news_category: item.category, news_headline: item.headline, news_description: item.description, news_published_at: item.published_at, news_source: item.source, news_url: item.url, news_scope: item.scope ?? "", news_entities: item.entities, news_matched_symbols: item.matched_symbols ?? [] })));
  return rows;
}

export function buildSignalDetailSheets(detail: SignalDetail, candles: Candle[], delivery30d?: DeliveryPoint[], fundamentals?: FundamentalsBlock | null): XlsxSheet[] {
  const exportRows = [{
    symbol: detail.symbol,
    company_name: detail.company_name,
    sector: detail.sector,
    industry: detail.industry ?? "",
    price: detail.last_price ?? "",
    day_change_pct: detail.day_change_pct ?? "",
    signal_states: detail.signal_states.join(", "),
    trend_10d_pct: detail.signals.trend_10d_pct ?? "",
    sector_rank: detail.signals.sector_rank ?? "",
    sector_count: detail.signals.sector_count ?? "",
    delivery_pct: detail.signals.delivery_pct ?? "",
    delivery_avg20: detail.signals.delivery_avg20 ?? "",
    fii_net_buy_days_5: detail.signals.fii_net_buy_days_5 ?? "",
    pcr: detail.signals.pcr_available ? detail.signals.pcr : "",
    rsi_14: detail.signals.rsi_14 ?? "",
    pledge_pct: detail.signals.pledge_pct ?? "",
    insider_net_30d: detail.signals.insider_net_30d,
    week52_high: detail.week52?.week52_high ?? "",
    week52_low: detail.week52?.week52_low ?? "",
    pct_below_52w_high: detail.week52?.pct_below_52w_high ?? "",
    week52_as_of: detail.week52?.as_of ?? "",
    week52_reason: detail.week52?.reason ?? "",
  }];
  const newsRows = detail.news.map(({ severity: _s, impact: _i, high_priority: _h, ...item }: any) => ({ ...item, entities: JSON.stringify(item.entities), matched_symbols: item.matched_symbols?.join(", ") ?? "" }));
  return [
    { name: "Summary", rows: [], summaryRows: buildSignalSummaryRows(detail, fundamentals) },
    { name: "Signal", rows: exportRows },
    { name: "Candles", rows: candles.map((row) => ({ ...row })) },
    { name: "Delivery", rows: (delivery30d ?? []).map((row) => ({ ...row })) },
    { name: "News", rows: newsRows },
  ];
}
