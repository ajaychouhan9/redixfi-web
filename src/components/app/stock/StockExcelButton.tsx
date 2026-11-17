"use client";

import { ExportButton } from "@/components/ui/ExportButton";
import { getChart, getResearch, getSignalDetail } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthContext";
import { isProEntitled } from "@/lib/entitlements";

/**
 * "Download Excel" for one stock (Pro and trial). The sheets are built only when the button is tapped: the three reads it needs are made
 * then, with the visitor's own token, so the cached stock page carries none of that data and the page itself makes no extra request.
 */
export function StockExcelButton({ symbol }: { symbol: string }) {
  const { user, getToken } = useAuth();
  async function exportXlsx() {
    const token = await getToken();
    const [detail, chart, research] = await Promise.all([
      getSignalDetail(symbol, 6, { token }),
      getChart(symbol, { interval: "1d" }, { token }),
      getResearch(symbol, { token }),
    ]);
    const [{ buildSignalDetailSheets }, { downloadXlsx }] = await Promise.all([import("@/lib/signal-detail-export"), import("@/lib/xlsx")]);
    const sheets = buildSignalDetailSheets(detail.data, chart.data.candles, research.data.delivery_30d, research.data.fundamentals);
    downloadXlsx(`redixfi-${symbol.toLowerCase()}.xlsx`, sheets);
  }
  return <ExportButton onExport={exportXlsx} canExport={isProEntitled(user)} label="Download Excel" enabledTitle="Export as Excel" disabledTitle="Upgrade to export Excel" />;
}
