"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { downloadXlsx } from "@/lib/xlsx";
import { buildResearchSheets } from "@/lib/research-export";
import { isProEntitled } from "@/lib/entitlements";
import { ExportButton } from "@/components/ui/ExportButton";
import type { ResearchDetail as ResearchDetailType, PeerRow } from "@/lib/api/types";

/** Pro-only Excel export for the stock Research page. */
export function ResearchExportButton({ data, peers }: { data: ResearchDetailType; peers: PeerRow[] | null }) {
  const { user } = useAuth();
  if (!isProEntitled(user)) return null;

  function exportXlsx() {
    downloadXlsx(
      `redixfi-research-${data.symbol.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      buildResearchSheets(data, peers)
    );
  }

  return (
    <ExportButton
      onExport={exportXlsx}
      canExport
      label="Download Excel"
      enabledTitle="Export as Excel"
      className="flex items-center gap-1 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground"
    />
  );
}
