"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { downloadCsv } from "@/lib/csv";
import { downloadXlsx, type XlsxSheet } from "@/lib/xlsx";
import { isProEntitled } from "@/lib/entitlements";
import { ExportButton } from "@/components/ui/ExportButton";
import type { ResearchDetail as ResearchDetailType, PeerRow } from "@/lib/api/types";

/** Web-exclusive per-stock export (mockup's header "Export" button), same
 * Pro-only gate as the Signals list's CSV export (multi-tier restructure,
 * 2026-08-08 — was any-paid-tier; "founding" still resolves to Pro-
 * equivalent, matching core/plan_limits.py::resolve_tier() server-side)
 * — renders nothing for free/Basic/logged-out visitors rather than a
 * disabled button (same pattern as other Pro-only actions on this page
 * not being shown at all to those users).
 *
 * Widened 2026-08-08 (audit finding: this button was real and already
 * worked end-to-end, but only exported valuation figures — narrower than
 * "full fundamentals/research data"). Now exports identity + valuation +
 * balance-sheet + cashflow + shareholding + upcoming-events highlights
 * for the subject stock, alongside the same peer set as before. All data
 * used here is already loaded client-side as this component's own props
 * (SSR'd by the page) — no separate fetch, so unlike the Signals list
 * export this one was never at risk of the recurring auth-token bug.
 * Quarterly/annual/shareholding time series are kept in their own
 * multi-row worksheets and included as sectioned rows in the CSV. */
export function ResearchExportButton({ data, peers }: { data: ResearchDetailType; peers: PeerRow[] | null }) {
  const { user } = useAuth();
  if (!isProEntitled(user)) return null;

  function buildExport() {
    const f = data.fundamentals;
    const overview: Record<string, unknown> = {
      company: `${data.company_name} (${data.symbol})`,
      sector: data.sector,
      industry: f?.identity.industry ?? "",
      market_cap: f?.identity.market_cap ?? "",
      price: data.price.last_price,
      day_change_pct: data.price.day_change_pct,
      composite_score: data.signal_summary.composite_score ?? "",
      score_change_1d: data.signal_summary.delta_1d ?? "",
      pe: f?.valuation.pe_ttm ?? "",
      pb: f?.valuation.pb ?? "",
      net_margin_ttm: f?.valuation.net_margin_ttm ?? "",
      roe_ttm: f?.valuation.roe_ttm ?? "",
      debt_to_equity: f?.valuation.debt_to_equity ?? "",
      dividend_yield_pct: f?.valuation.dividend_yield_pct ?? "",
      book_value_per_share: f?.balance.book_value_per_share ?? "",
      current_ratio: f?.balance.current_ratio ?? "",
      revenue_cagr_3y_pct: f?.annual.revenue_cagr_3y_pct ?? "",
      pat_cagr_3y_pct: f?.annual.pat_cagr_3y_pct ?? "",
      ocf_latest: f?.cashflow.ocf_latest ?? "",
      fcf_latest: f?.cashflow.fcf_latest ?? "",
      promoter_pct: f?.shareholding.promoter_pct ?? "",
      promoter_change_qoq: f?.shareholding.promoter_change_qoq ?? "",
      fii_pct: f?.shareholding.fii_pct ?? "",
      fii_change_qoq: f?.shareholding.fii_change_qoq ?? "",
      mf_pct: f?.shareholding.mf_pct ?? "",
      mf_change_qoq: f?.shareholding.mf_change_qoq ?? "",
      next_results_date: f?.events.next_results_date ?? "",
    };
    const peersRows: Record<string, unknown>[] = [];
    for (const p of peers ?? []) {
      peersRows.push({
        company: p.company_name ?? "",
        sector: "",
        industry: "",
        market_cap: p.market_cap ?? "",
        price: "",
        day_change_pct: p.percent_change ?? "",
        composite_score: "",
        score_change_1d: "",
        pe: p.pe ?? "",
        pb: p.pb ?? "",
        net_margin_ttm: p.net_margin_ttm ?? "",
        roe_ttm: p.roe_ttm ?? "",
        debt_to_equity: p.debt_to_equity ?? "",
        dividend_yield_pct: p.dividend_yield ?? "",
        book_value_per_share: "",
        current_ratio: "",
        revenue_cagr_3y_pct: "",
        pat_cagr_3y_pct: "",
        ocf_latest: "",
        fcf_latest: "",
        promoter_pct: "",
        promoter_change_qoq: "",
        fii_pct: "",
        fii_change_qoq: "",
        mf_pct: "",
        mf_change_qoq: "",
        next_results_date: "",
      });
    }
    const oneRow = (value: object | null | undefined): Record<string, unknown>[] => value ? [value as Record<string, unknown>] : [];
    const listRows = (value: unknown) => Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
    const without = (value: object | null | undefined, keys: string[]) => {
      if (!value) return [];
      const excluded = new Set(keys);
      return [Object.fromEntries(Object.entries(value).filter(([key]) => !excluded.has(key)))];
    };
    const quarterlySummary = without(f?.quarterly, ["series_8q"]);
    const annualSummary = without(f?.annual, ["series_5y"]);
    const ownershipSummary = without(f?.shareholding, ["series_4q"]);
    const eventsSummary = without(f?.events, ["recent_dividends", "recent_bonus", "recent_splits"]);
    const sheets: XlsxSheet[] = [
      { name: "Overview", rows: [overview] },
      { name: "Peers", rows: peersRows },
      { name: "Valuation", rows: oneRow(f?.valuation) },
      { name: "Growth", rows: [...quarterlySummary, ...annualSummary] },
      { name: "Quarterly", rows: quarterlySummary },
      { name: "Quarterly Series", rows: listRows(f?.quarterly?.series_8q) },
      { name: "Annual", rows: annualSummary },
      { name: "Annual Series", rows: listRows(f?.annual?.series_5y) },
      { name: "Balance", rows: oneRow(f?.balance) },
      { name: "Cashflow", rows: oneRow(f?.cashflow) },
      { name: "Ownership", rows: ownershipSummary },
      { name: "Ownership Series", rows: listRows(f?.shareholding?.series_4q) },
      { name: "Events Summary", rows: eventsSummary },
      { name: "Dividends", rows: listRows(f?.events?.recent_dividends) },
      { name: "Bonus", rows: listRows(f?.events?.recent_bonus) },
      { name: "Splits", rows: listRows(f?.events?.recent_splits) },
      { name: "Delivery", rows: data.delivery_30d.map((row) => ({ ...row })) },
      { name: "Events", rows: listRows(data.corporate_events) },
      { name: "Insider Trades", rows: data.insider_trades.map((row) => ({ ...row })) },
      { name: "Bulk Block", rows: listRows(data.bulk_block_deals) },
      { name: "Pledge History", rows: data.pledge_history.map((row) => ({ ...row })) },
      { name: "Options PCR", rows: data.options_pcr_history.map((row) => ({ ...row })) },
      { name: "News", rows: data.news.map((row) => ({ ...row, entities: JSON.stringify(row.entities), matched_symbols: row.matched_symbols?.join(", ") ?? "" })) },
      { name: "Concalls", rows: data.concall_transcripts.map((row) => ({ ...row })) },
      { name: "Annual Report", rows: data.annual_report_summary ? [{ ...data.annual_report_summary, bullets: data.annual_report_summary.bullets.join("\n") }] : [] },
      { name: "Signal Summary", rows: [{ symbol: data.symbol, ...data.signal_summary }] },
      { name: "Sources", rows: [
        ...data.concall_transcripts.map((row) => ({ section: "Concall", filing_date: row.filing_date, source_url: row.source_pdf_url })),
        ...(data.annual_report_summary ? [{ section: "Annual Report", filing_date: data.annual_report_summary.filing_date, source_url: data.annual_report_summary.source_pdf_url }] : []),
        ...data.news.map((row) => ({ section: "News", published_at: row.published_at, source_url: row.url, source: row.source })),
      ] },
    ];
    const sectionRows: Record<string, unknown>[] = sheets.flatMap((sheet) => sheet.rows.map((row) => ({ section: sheet.name, ...row })));
    const csvKeys = Array.from(new Set(sectionRows.flatMap((row) => Object.keys(row))));
    const csvRows = sectionRows.map((row) => Object.fromEntries(csvKeys.map((key) => [key, row[key] ?? ""])));
    return { csvRows, sheets };
  }

  function exportCsv() {
    downloadCsv(`redixfi-research-${data.symbol.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, buildExport().csvRows);
  }

  function exportXlsx() {
    downloadXlsx(`redixfi-research-${data.symbol.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xlsx`, buildExport().sheets);
  }

  return (
    <ExportButton
      onExport={exportCsv}
      onCsv={exportCsv}
      onXlsx={exportXlsx}
      canExport
      label="Download"
      enabledTitle="Export full fundamentals/research data as CSV"
      className="flex items-center gap-1 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground"
    />
  );
}
