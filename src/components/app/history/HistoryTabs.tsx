"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { HistoryExplorer } from "@/components/app/history/HistoryExplorer";
import { StockwiseHistory } from "@/components/app/history/StockwiseHistory";
import { POOLED_TAB, SW_TAB } from "@/lib/history-copy";

type Tab = "stock" | "across";

/** Stock-wise is the main view; the pooled view stays as the second tab. A link with a stock opens the stock-wise view. */
export function HistoryTabs() {
  const sp = useSearchParams();
  const [tab, setTab] = useState<Tab>(sp.get("tab") === "across" ? "across" : "stock");
  const tabs: { id: Tab; label: string }[] = [
    { id: "stock", label: SW_TAB },
    { id: "across", label: POOLED_TAB },
  ];
  return (
    <div className="space-y-4" data-testid="history-tabs">
      <div className="inline-flex rounded-lg border border-border p-0.5" role="tablist" aria-label="History view">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`history-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`history-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === t.id ? "bg-accent text-accent-foreground" : "text-foreground-muted"}`}
            data-testid={`history-tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "stock" ? (
        <div role="tabpanel" id="history-panel-stock" aria-labelledby="history-tab-stock">
          <StockwiseHistory initialSymbol={sp.get("symbol") ?? undefined} />
        </div>
      ) : (
        <div role="tabpanel" id="history-panel-across" aria-labelledby="history-tab-across">
          <HistoryExplorer />
        </div>
      )}
    </div>
  );
}
