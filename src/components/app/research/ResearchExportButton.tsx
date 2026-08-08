"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { downloadCsv } from "@/lib/csv";
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
 * Quarterly/annual TIME SERIES (series_8q/series_5y/series_4q) are
 * deliberately left out of this flat, one-row-per-company CSV — they're
 * naturally multi-row per company and would need a different export
 * shape; a reasonable scope boundary, not a silent omission. */
export function ResearchExportButton({ data, peers }: { data: ResearchDetailType; peers: PeerRow[] | null }) {
  const { user } = useAuth();
  if (!user || (user.tier !== "pro" && user.tier !== "founding")) return null;

  function exportCsv() {
    const f = data.fundamentals;
    const rows: Record<string, unknown>[] = [];
    rows.push({
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
    });
    for (const p of peers ?? []) {
      rows.push({
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
    downloadCsv(`redixfi-research-${data.symbol.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <ExportButton
      onExport={exportCsv}
      canExport
      label="Export"
      enabledTitle="Export full fundamentals/research data as CSV"
      className="flex items-center gap-1 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground"
    />
  );
}
