import type {
  AnnualReportSummary,
  ConcallTranscript,
  GenericRecord,
  NewsItem,
  PeerRow,
  ResearchDetail,
} from "./api/types";
import type { XlsxSheet, XlsxSummaryRow } from "./xlsx";

const missing = (value: unknown): string | number => value === null || value === undefined || value === "" ? "Not available" : value as string | number;

function numberText(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? "Not available" : value.toLocaleString("en-IN", { maximumFractionDigits: digits });
}

function percentText(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined ? "Not available" : `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function currencyText(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? "Not available" : `₹${value.toLocaleString("en-IN", { maximumFractionDigits: digits })}`;
}

function dateText(value: string | null | undefined): string {
  return value || "Not available";
}

function latestByDate<T>(rows: T[], getDate: (row: T) => string | null | undefined): T | null {
  return rows.reduce<T | null>((latest, row) => {
    if (!latest) return row;
    return (getDate(row) ?? "") > (getDate(latest) ?? "") ? row : latest;
  }, null);
}

function cleanNewsRow(row: NewsItem): Record<string, unknown> {
  return {
    Date: row.published_at,
    Headline: row.headline,
    Description: row.description,
    Source: row.source,
    "Article URL": row.url,
    Category: row.category,
    Severity: row.severity,
  };
}

function cleanConcallRow(row: ConcallTranscript): Record<string, unknown> {
  return {
    "Filing date": row.filing_date,
    "Document type": row.subject === "EARNINGS_CALL_TRANSCRIPT" ? "Concall transcript" : "Investor presentation",
    Tone: row.tone_label,
    "Tone note": row.tone_note,
    Summary: row.summary,
    "Source filing": row.source_pdf_url,
  };
}

function cleanAnnualReportRow(row: AnnualReportSummary): Record<string, unknown> {
  return {
    "Fiscal year": row.fiscal_year,
    "Filing date": row.filing_date,
    "Page count": row.page_count,
    Summary: row.summary,
    Observations: row.bullets.join("\n"),
    "Key takeaway": row.key_takeaway,
    "Source filing": row.source_pdf_url,
    "Compliance note": row.compliance_note,
  };
}

function cleanGenericEvent(row: GenericRecord): Record<string, unknown> {
  return {
    Date: row.event_date ?? row.date ?? "",
    Type: row.event_type ?? row.event_subtype ?? "",
    Headline: row.headline ?? "",
    Summary: row.summary ?? "",
    Source: row.source ?? "",
    URL: row.source_url ?? row.url ?? "",
  };
}

function cleanBulkBlockRow(row: GenericRecord): Record<string, unknown> {
  const dealTypes = row.deal_types_present;
  return {
    Date: row.date ?? row.event_date ?? "",
    Symbol: row.symbol ?? row.canonicalSymbol ?? "",
    "Deal types": Array.isArray(dealTypes) ? dealTypes.join(", ") : dealTypes ?? "",
    "Net direction": row.net_direction ?? row.direction ?? "",
    "Net quantity": row.net_quantity ?? row.quantity ?? "",
    "Total value": row.total_value ?? row.value ?? row.value_amount ?? "",
    "Participation %": row.participation_pct ?? "",
    "Deal strength": row.deal_strength ?? "",
  };
}

function buildSummaryRows(data: ResearchDetail, peers: PeerRow[] | null): XlsxSummaryRow[] {
  const f = data.fundamentals;
  const q = f?.quarterly;
  const a = f?.annual;
  const v = f?.valuation;
  const b = f?.balance;
  const c = f?.cashflow;
  const h = f?.shareholding;
  const e = f?.events;
  const latestDelivery = latestByDate(data.delivery_30d, (row) => row.date);
  const latestInsider = latestByDate(data.insider_trades, (row) => row.trade_date);
  const latestPledge = latestByDate(data.pledge_history, (row) => row.as_of_date || row.quarter);
  const latestPcr = data.options_pcr_history[0] ?? null;
  const latestEvent = latestByDate(data.corporate_events, (row) => String(row.event_date ?? row.date ?? ""));
  const rows: XlsxSummaryRow[] = [
    { kind: "subtitle", cells: [`${data.symbol} — Research Summary`], merge: [0, 3] as [number, number] },
    { kind: "metadata", cells: ["Symbol", data.symbol, "Company", data.company_name] },
    { kind: "metadata", cells: ["Sector / Industry", `${data.sector || "Not available"} / ${f?.identity.industry ?? "Not available"}`, "Data as of", dateText(f?.as_of)] },
    { kind: "metadata", cells: ["Price", currencyText(data.price.last_price), "Day change", percentText(data.price.day_change_pct)] },
    { kind: "metadata", cells: ["52-week low", currencyText(data.price.week52_low), "52-week high", currencyText(data.price.week52_high)] },
    { kind: "metadata", cells: ["Signal score", data.signal_summary.composite_score === null ? "Not available" : `${data.signal_summary.composite_score}/100`, "Score change", missing(data.signal_summary.delta_1d)] },
    { kind: "blank" },
    { kind: "section", cells: ["GROWTH SNAPSHOT"], merge: [0, 3] as [number, number] },
    { kind: "item", cells: ["Revenue — latest quarter", currencyText(q?.revenue)] },
    { kind: "item", cells: ["Revenue YoY", percentText(q?.revenue_yoy_pct)] },
    { kind: "item", cells: ["PAT YoY", percentText(q?.pat_yoy_pct)] },
    { kind: "item", cells: ["Operating margin", percentText(q?.opm_pct)] },
    { kind: "item", cells: ["Revenue CAGR 3Y", percentText(a?.revenue_cagr_3y_pct)] },
    { kind: "item", cells: ["PAT CAGR 3Y", percentText(a?.pat_cagr_3y_pct)] },
    { kind: "blank" },
    { kind: "section", cells: ["VALUATION & PEER POSITION"], merge: [0, 3] as [number, number] },
    { kind: "item", cells: ["P/E (TTM)", numberText(v?.pe_ttm, 1)] },
    { kind: "item", cells: ["Sector P/E", numberText(v?.sector_pe, 1)] },
    { kind: "item", cells: ["Dividend yield", percentText(v?.dividend_yield_pct)] },
    { kind: "item", cells: ["P/B", numberText(v?.pb)] },
    { kind: "item", cells: ["ROE", percentText(v?.roe_ttm)] },
    { kind: "item", cells: ["Debt/Equity", numberText(v?.debt_to_equity)] },
    { kind: "header", cells: ["Company", "P/E · P/B", "Net margin · ROE", "D/E · Div. Yield"] },
    ...(peers ?? []).map((p) => ({ kind: "item" as const, cells: [p.company_name ?? "Not available", `${numberText(p.pe, 1)} · ${numberText(p.pb)}`, `${percentText(p.net_margin_ttm)} · ${percentText(p.roe_ttm)}`, `${numberText(p.debt_to_equity)} · ${percentText(p.dividend_yield)}`] })),
    { kind: "blank" },
    { kind: "section", cells: ["OWNERSHIP SNAPSHOT"], merge: [0, 3] as [number, number] },
    { kind: "header", cells: ["Holder", "Current", "QoQ change", "Trend"] },
    { kind: "item", cells: ["Promoter", percentText(h?.promoter_pct, 2), h?.promoter_change_qoq === null || h?.promoter_change_qoq === undefined ? "Not available" : `${h.promoter_change_qoq.toFixed(2)}pp`, h?.promoter_streak ?? "Not available"] },
    { kind: "item", cells: ["FII", percentText(h?.fii_pct, 2), h?.fii_change_qoq === null || h?.fii_change_qoq === undefined ? "Not available" : `${h.fii_change_qoq.toFixed(2)}pp`, h?.fii_streak ?? "Not available"] },
    { kind: "item", cells: ["MF", percentText(h?.mf_pct, 2), h?.mf_change_qoq === null || h?.mf_change_qoq === undefined ? "Not available" : `${h.mf_change_qoq.toFixed(2)}pp`, h?.mf_streak ?? "Not available"] },
    { kind: "blank" },
    { kind: "section", cells: ["FINANCIAL POSITION"], merge: [0, 3] as [number, number] },
    { kind: "header", cells: ["Balance sheet metric", "Value"] },
    { kind: "item", cells: ["Debt-to-equity", numberText(b?.debt_to_equity)] },
    { kind: "item", cells: ["Book value/share", currencyText(b?.book_value_per_share)] },
    { kind: "item", cells: ["Current ratio", numberText(b?.current_ratio)] },
    { kind: "item", cells: ["Shares outstanding (Cr)", numberText(b?.shares_outstanding)] },
    { kind: "header", cells: ["Cash-flow metric", "Value"] },
    { kind: "item", cells: ["Operating cash flow", currencyText(c?.ocf_latest)] },
    { kind: "item", cells: ["Capital expenditure", currencyText(c?.capex_latest)] },
    { kind: "item", cells: ["Free cash flow", currencyText(c?.fcf_latest)] },
    { kind: "item", cells: ["FCF-positive years / last 5", c?.fcf_positive_years_5 ?? "Not available"] },
    { kind: "blank" },
    { kind: "section", cells: ["SMART MONEY & ACTIVITY"], merge: [0, 3] as [number, number] },
    { kind: "item", cells: ["Latest delivery", latestDelivery ? percentText(latestDelivery.delivery_pct, 2) : "Not available"] },
    { kind: "item", cells: ["Latest insider trade", latestInsider ? `${latestInsider.transaction_type} · ${latestInsider.insider_name || "Not available"} · ${latestInsider.quantity.toLocaleString("en-IN")} shares` : "None recently"] },
    { kind: "item", cells: ["Promoter pledge", latestPledge ? `${percentText(latestPledge.pledged_pct, 2)} · ${latestPledge.risk_level} · ${latestPledge.pledge_trend ?? "stable"}` : "Not available"] },
    { kind: "item", cells: ["Options PCR", latestPcr ? `${numberText(latestPcr.pcr, 2)} · ${latestPcr.pcr > 1 ? "put-heavy" : "call-heavy"}` : "Not available"] },
    { kind: "item", cells: ["Bulk/block activity", data.bulk_block_deals.length ? `${data.bulk_block_deals.length} recent record(s)` : "None recently"] },
    { kind: "blank" },
    { kind: "section", cells: ["EVENTS & DIVIDENDS"], merge: [0, 3] as [number, number] },
    { kind: "item", cells: ["Results date", dateText(e?.next_results_date)] },
    { kind: "item", cells: ["Latest/upcoming event", latestEvent ? `${latestEvent.event_type ?? "Event"} · ${dateText(String(latestEvent.event_date ?? latestEvent.date ?? ""))}` : "None available"] },
    ...(e?.recent_dividends ?? []).slice(0, 3).map((d) => ({ kind: "item" as const, cells: ["Dividend", `${dateText(d.record_date)} · ${currencyText(d.value)} · ${percentText(d.percentage, 2)}`] })),
    { kind: "blank" },
    { kind: "section", cells: ["NEWS TIMELINE"], merge: [0, 3] as [number, number] },
    { kind: "header", cells: ["Date", "Severity", "Source", "Headline"] },
    ...data.news.slice(0, 10).map((n) => ({ kind: "item" as const, cells: [n.published_at, n.severity, n.source, n.headline] })),
    { kind: "blank" },
    { kind: "section", cells: ["CONCALLS & INVESTOR PRESENTATIONS"], merge: [0, 3] as [number, number] },
    ...data.concall_transcripts.slice(0, 3).flatMap((c) => [
      { kind: "item" as const, cells: ["Document", c.subject === "EARNINGS_CALL_TRANSCRIPT" ? "Concall transcript" : "Investor presentation", "Filing date", c.filing_date] },
      { kind: "narrative" as const, cells: ["Tone / takeaway", `${c.tone_label}: ${c.tone_note}\n${c.summary}\nSource: ${c.source_pdf_url}`], merge: [1, 3] as [number, number] },
    ]),
    { kind: "blank" },
    { kind: "section", cells: ["AI SUMMARY OF ANNUAL REPORT"], merge: [0, 3] as [number, number] },
    ...(data.annual_report_summary ? [
      { kind: "item" as const, cells: ["Fiscal year", data.annual_report_summary.fiscal_year, "Filing date", data.annual_report_summary.filing_date] },
      { kind: "narrative" as const, cells: ["Summary", `${data.annual_report_summary.summary}\n\n${data.annual_report_summary.bullets.join("\n")}\n\nKey takeaway: ${data.annual_report_summary.key_takeaway}\nSource: ${data.annual_report_summary.source_pdf_url}\n${data.annual_report_summary.compliance_note}`], merge: [1, 3] as [number, number] },
    ] : [{ kind: "item" as const, cells: ["Annual report", "Not available"] }]),
    { kind: "blank" },
    { kind: "section", cells: ["SIGNAL SUMMARY"], merge: [0, 3] as [number, number] },
    { kind: "item", cells: ["Composite score", data.signal_summary.composite_score === null ? "Not available" : `${data.signal_summary.composite_score}/100`] },
    { kind: "item", cells: ["Score change", missing(data.signal_summary.delta_1d)] },
    { kind: "narrative", cells: ["Narrative", data.signal_summary.narrative ?? "Not available"], merge: [1, 3] as [number, number] },
  ];
  return rows;
}

function detailRows(data: ResearchDetail, peers: PeerRow[] | null): XlsxSheet[] {
  const f = data.fundamentals;
  const q = f?.quarterly;
  const a = f?.annual;
  const b = f?.balance;
  const c = f?.cashflow;
  const v = f?.valuation;
  const h = f?.shareholding;
  const e = f?.events;
  const metrics = (entries: [string, unknown][]) => entries.map(([Metric, Value]) => ({ Metric, Value: missing(Value) }));
  const peerRows = (peers ?? []).map((p) => ({ Company: p.company_name ?? "Not available", "P/E": p.pe, "P/B": p.pb, "Net Margin": p.net_margin_ttm, ROE: p.roe_ttm, "D/E": p.debt_to_equity, "Div. Yield": p.dividend_yield }));
  return [
    { name: "Overview", rows: [{ Symbol: data.symbol, Company: data.company_name, Sector: data.sector, Industry: f?.identity.industry ?? "", Price: data.price.last_price, "Day change": data.price.day_change_pct, "52-week low": data.price.week52_low, "52-week high": data.price.week52_high, "Signal score": data.signal_summary.composite_score ?? "", "Score change": data.signal_summary.delta_1d ?? "", "Data as of": f?.as_of ?? "" }] },
    { name: "Peers", rows: peerRows },
    { name: "Valuation", rows: metrics([["P/E (TTM)", v?.pe_ttm], ["P/B", v?.pb], ["Net margin", v?.net_margin_ttm], ["ROE", v?.roe_ttm], ["Debt/Equity", v?.debt_to_equity], ["Sector P/E", v?.sector_pe], ["Dividend yield", v?.dividend_yield_pct]]) },
    { name: "Growth", rows: metrics([["Revenue — latest quarter", q?.revenue], ["Revenue YoY", q?.revenue_yoy_pct], ["PAT YoY", q?.pat_yoy_pct], ["Operating margin", q?.opm_pct], ["Revenue CAGR 3Y", a?.revenue_cagr_3y_pct], ["PAT CAGR 3Y", a?.pat_cagr_3y_pct]]) },
    { name: "Quarterly", rows: q?.series_8q.map((row) => ({ Quarter: row.quarter_end, Revenue: row.revenue, PAT: row.pat, "Operating margin": row.opm_pct, EPS: row.eps })) ?? [] },
    { name: "Quarterly Series", rows: q?.series_8q.map((row) => ({ Quarter: row.quarter_end, Revenue: row.revenue, PAT: row.pat, "Operating margin": row.opm_pct, EPS: row.eps })) ?? [] },
    { name: "Annual", rows: metrics([["Revenue CAGR 3Y", a?.revenue_cagr_3y_pct], ["PAT CAGR 3Y", a?.pat_cagr_3y_pct]]) },
    { name: "Annual Series", rows: a?.series_5y.map((row) => ({ "Fiscal year": row.fiscal_year, Revenue: row.revenue, PAT: row.pat, "Operating margin": row.opm_pct, EPS: row.eps })) ?? [] },
    { name: "Balance", rows: metrics([["Debt-to-equity", b?.debt_to_equity], ["Book value/share", b?.book_value_per_share], ["Current ratio", b?.current_ratio], ["Shares outstanding (Cr)", b?.shares_outstanding]]) },
    { name: "Cashflow", rows: metrics([["Operating cash flow", c?.ocf_latest], ["Capital expenditure", c?.capex_latest], ["Free cash flow", c?.fcf_latest], ["FCF-positive years / last 5", c?.fcf_positive_years_5]]) },
    { name: "Ownership", rows: metrics([["Promoter", h?.promoter_pct], ["Promoter QoQ change", h?.promoter_change_qoq], ["FII", h?.fii_pct], ["FII QoQ change", h?.fii_change_qoq], ["MF", h?.mf_pct], ["MF QoQ change", h?.mf_change_qoq]]) },
    { name: "Ownership Series", rows: h?.series_4q.map((row) => ({ Date: row.date, Promoter: row.promoter, FII: row.fii, MF: row.mf, Other: row.other })) ?? [] },
    { name: "Events Summary", rows: metrics([["Results date", e?.next_results_date], ["Recent dividends", e?.recent_dividends.length], ["Recent bonus issues", e?.recent_bonus.length], ["Recent splits", e?.recent_splits.length]]) },
    { name: "Dividends", rows: e?.recent_dividends.map((row) => ({ "Record date": row.record_date, Value: row.value, Percentage: row.percentage })) ?? [] },
    { name: "Bonus", rows: e?.recent_bonus.map((row) => ({ "Record date": row.record_date, Remarks: row.remarks })) ?? [] },
    { name: "Splits", rows: e?.recent_splits.map((row) => ({ "Record date": row.record_date, Remarks: row.remarks })) ?? [] },
    { name: "Delivery", rows: data.delivery_30d.map((row) => ({ Date: row.date, "Delivery %": row.delivery_pct })) },
    { name: "Events", rows: data.corporate_events.map(cleanGenericEvent) },
    { name: "Insider Trades", rows: data.insider_trades.map((row) => ({ Date: row.trade_date, Insider: row.insider_name, Type: row.transaction_type, Quantity: row.quantity, Value: row.value_amount, Relation: row.relation })) },
    { name: "Bulk Block", rows: data.bulk_block_deals.map(cleanBulkBlockRow) },
    { name: "Pledge History", rows: data.pledge_history.map((row) => ({ Quarter: row.quarter, Date: row.as_of_date, "Pledged %": row.pledged_pct, Risk: row.risk_level, "Pledge change": row.pledge_change ?? "", Trend: row.pledge_trend ?? "" })) },
    { name: "Options PCR", rows: data.options_pcr_history.map((row) => ({ Timestamp: row.timestamp, Expiry: row.expiry, PCR: row.pcr, "PCR volume": row.pcr_vol, "Last price": row.last_price, "Max pain": row.max_pain, "CE resistance": row.ce_resistance, "PE support": row.pe_support, "CE OI change": row.ce_oi_change, "PE OI change": row.pe_oi_change })) },
    { name: "News", rows: data.news.map(cleanNewsRow) },
    { name: "Concalls", rows: data.concall_transcripts.map(cleanConcallRow) },
    { name: "Annual Report", rows: data.annual_report_summary ? [cleanAnnualReportRow(data.annual_report_summary)] : [] },
    { name: "Signal Summary", rows: [{ Metric: "Composite score", Value: data.signal_summary.composite_score ?? "Not available" }, { Metric: "Score change", Value: data.signal_summary.delta_1d ?? "Not available" }, { Metric: "Narrative", Value: data.signal_summary.narrative ?? "Not available" }] },
    { name: "Sources", rows: [
      ...data.concall_transcripts.map((row) => ({ Section: "Concall", Date: row.filing_date, Source: row.source_pdf_url })),
      ...(data.annual_report_summary ? [{ Section: "Annual Report", Date: data.annual_report_summary.filing_date, Source: data.annual_report_summary.source_pdf_url }] : []),
      ...data.news.map((row) => ({ Section: "News", Date: row.published_at, Source: row.url, Publisher: row.source })),
    ] },
  ];
}

export function buildResearchSheets(data: ResearchDetail, peers: PeerRow[] | null): XlsxSheet[] {
  return [
    { name: "Research Summary", rows: [], summaryRows: buildSummaryRows(data, peers) },
    ...detailRows(data, peers),
  ];
}
