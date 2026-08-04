"use client";

import { Download } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { downloadCsv } from "@/lib/csv";
import type { ResearchDetail as ResearchDetailType, PeerRow } from "@/lib/api/types";

/** Web-exclusive per-stock export (mockup's header "Export" button), same
 * paid-tier gate as the Signals list's CSV export — exports this stock's
 * valuation figures alongside its peer set, the one structured comparison
 * table on this page. Renders nothing for free-tier/logged-out visitors
 * rather than a disabled button (same pattern as other paid-only actions
 * on this page not being shown at all to those users). */
export function ResearchExportButton({ data, peers }: { data: ResearchDetailType; peers: PeerRow[] | null }) {
  const { user } = useAuth();
  if (!user || user.tier === "free") return null;

  function exportCsv() {
    const f = data.fundamentals;
    const rows: Record<string, unknown>[] = [];
    rows.push({
      company: `${data.company_name} (${data.symbol})`,
      pe: f?.valuation.pe_ttm ?? "",
      pb: f?.valuation.pb ?? "",
      net_margin_ttm: f?.valuation.net_margin_ttm ?? "",
      roe_ttm: f?.valuation.roe_ttm ?? "",
      debt_to_equity: f?.valuation.debt_to_equity ?? "",
      dividend_yield_pct: f?.valuation.dividend_yield_pct ?? "",
    });
    for (const p of peers ?? []) {
      rows.push({
        company: p.company_name ?? "",
        pe: p.pe ?? "",
        pb: p.pb ?? "",
        net_margin_ttm: p.net_margin_ttm ?? "",
        roe_ttm: p.roe_ttm ?? "",
        debt_to_equity: p.debt_to_equity ?? "",
        dividend_yield_pct: p.dividend_yield ?? "",
      });
    }
    downloadCsv(`redixfi-research-${data.symbol.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <button
      type="button"
      onClick={exportCsv}
      className="flex items-center gap-1 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground"
    >
      <Download size={12} /> Export
    </button>
  );
}
