import type { Candle, DeliveryPoint, FundamentalsBlock, SignalDetail } from "./api/types";
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

export function getWhyDidThisChangeRows(detail: SignalDetail): DetailTextRow[] {
  const explanation = detail.change_explanation;
  const rows: DetailTextRow[] = [{ label: "Summary", value: explanation.descriptive }];
  rows.push(
    ...detail.component_changes.map((change) => ({
      label: COMPONENT_LABEL[change.signal] ?? change.signal,
      value: `${ARROW[change.direction] ?? "•"} ${change.note}`,
    }))
  );
  rows.push({
    label: explanation.cause ? "Matched news event" : "Context",
    value: explanation.cause
      ? `A matched news event on this date: ${explanation.cause.headline} (${explanation.cause.category.replace(/_/g, " ")}, ${explanation.cause.severity} severity)`
      : explanation.note ?? "Not available",
  });
  return rows;
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
    { label: "Event risk (5d)", value: s.event_risk_5d ? `Yes — ${s.event_categories.join(", ")}` : "None" },
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
    {
      label: "Event risk",
      value: s.event_risk_5d
        ? `An AI-classified news event matched this stock in the last 5 days (${s.event_categories.join(", ") || "uncategorized"}).`
        : "No AI-classified news event matched this stock in the last 5 days.",
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
  return rows;
}

export function buildSignalSummaryRows(detail: SignalDetail, fundamentals?: FundamentalsBlock | null): XlsxSummaryRow[] {
  const rows: XlsxSummaryRow[] = [];
  const section = (label: string) => rows.push({ kind: "section", cells: [label, "", "", ""] }, { kind: "blank" });
  const table = (headers: string[]) => rows.push({ kind: "header", cells: headers });
  const items = (values: DetailTextRow[]) => values.forEach((row) => rows.push({ kind: "item", cells: [row.label, row.value] }));
  const scoreMovement = detail.delta_1d == null
    ? "Composite score movement: Not available."
    : `Composite score moved from ${detail.composite_score - detail.delta_1d} to ${detail.composite_score} today (${detail.delta_1d > 0 ? "+" : ""}${detail.delta_1d}).`;

  rows.push(
    { kind: "title", cells: ["RedixFi — Market. Simplified."] , merge: [0, 3] },
    { kind: "subtitle", cells: [`${detail.symbol} — Signal Summary`], merge: [0, 3] },
    { kind: "metadata", cells: ["Date", detail.date, "Composite Score", detail.composite_score] },
    { kind: "metadata", cells: ["Industry / Sector", `${detail.industry ?? "Not available"} / ${detail.sector}`, "Score Change", detail.delta_1d] },
    { kind: "blank" },
  );

  section("AI SUMMARY");
  rows.push({ kind: "narrative", cells: ["Summary", detail.narrative], merge: [1, 3] }, { kind: "blank" });

  section("WHY DID THIS CHANGE?");
  table(["Factor", "Change", "Explanation"]);
  rows.push({ kind: "item", cells: ["Composite score", detail.delta_1d == null ? "Not available" : `${detail.delta_1d > 0 ? "+" : ""}${detail.delta_1d}`, scoreMovement] });
  if (detail.component_changes.length) {
    rows.push(...detail.component_changes.map((change) => ({ kind: "item" as const, cells: [COMPONENT_LABEL[change.signal] ?? change.signal, change.direction, change.note] })));
  } else {
    rows.push({ kind: "item", cells: ["Factors", "Not available", "No component-level change was returned."] });
  }
  rows.push({ kind: "narrative", cells: ["Context", detail.change_explanation.cause ? `A matched news event on this date: ${detail.change_explanation.cause.headline} (${detail.change_explanation.cause.category.replace(/_/g, " ")}, ${detail.change_explanation.cause.severity} severity)` : detail.change_explanation.note ?? "Not available"], merge: [1, 3] }, { kind: "blank" });

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
    composite_score: detail.composite_score,
    score_change_1d: detail.delta_1d,
    score_change_5d: detail.delta_5d,
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
    event_risk_5d: s.event_risk_5d,
    event_categories: s.event_categories.join(", "),
  };
  const rows: Record<string, unknown>[] = [{ record_type: "signal", ...base }];
  rows.push(...detail.component_changes.map((change) => ({ record_type: "component_change", symbol: detail.symbol, company_name: detail.company_name, component_signal: change.signal, component_direction: change.direction, component_note: change.note })));
  rows.push(...detail.change_log.map((change) => ({ record_type: "change_log", symbol: detail.symbol, company_name: detail.company_name, change_date: change.date, change_delta: change.delta, changed_signal: change.changed_signal, change_note: change.note, change_state: change.state, change_flip: change.flip, change_created_at: change.created_at })));
  rows.push(...candles.map((candle) => ({ record_type: "candle", symbol: detail.symbol, company_name: detail.company_name, candle_timestamp: candle.timestamp, open: candle.open, high: candle.high, low: candle.low, close: candle.close, volume: candle.volume })));
  rows.push(...delivery30d.map((point) => ({ record_type: "delivery_history", symbol: detail.symbol, company_name: detail.company_name, delivery_date: point.date, delivery_pct_history: point.delivery_pct })));
  rows.push(...detail.news.map((item) => ({ record_type: "news", symbol: detail.symbol, company_name: detail.company_name, news_uuid: item.uuid, news_category: item.category, news_headline: item.headline, news_description: item.description, news_published_at: item.published_at, news_source: item.source, news_url: item.url, news_scope: item.scope ?? "", news_severity: item.severity, news_impact: item.impact, news_high_priority: item.high_priority, news_entities: item.entities, news_matched_symbols: item.matched_symbols ?? [] })));
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
    composite_score: detail.composite_score ?? "",
    score_change_1d: detail.delta_1d ?? "",
    score_change_5d: detail.delta_5d ?? "",
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
    event_risk_5d: detail.signals.event_risk_5d,
    event_categories: detail.signals.event_categories.join(", "),
    narrative: detail.narrative,
  }];
  const newsRows = detail.news.map((item) => ({ ...item, entities: JSON.stringify(item.entities), matched_symbols: item.matched_symbols?.join(", ") ?? "" }));
  return [
    { name: "Signal Summary", rows: [], summaryRows: buildSignalSummaryRows(detail, fundamentals) },
    { name: "Signal", rows: exportRows },
    { name: "Change Log", rows: detail.change_log.map((row) => ({ ...row })) },
    { name: "Candles", rows: candles.map((row) => ({ ...row })) },
    { name: "Delivery", rows: (delivery30d ?? []).map((row) => ({ ...row })) },
    { name: "News", rows: newsRows },
  ];
}
