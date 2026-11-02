"use client";

import { ExplainTerm } from "@/components/ui/ExplainTerm";
import { ScoreAsOf } from "@/components/app/signals/ScoreAsOf";
import { READING_EXPLAINER, READING_NAME, conditionChangeText } from "@/lib/reading-copy";
import type { SignalDetail } from "@/lib/api/types";

/** The Stock Condition as a small card lower on the stock page (it is no longer in the header), labelled with the date of its close. */
export function StockConditionCard({ detail }: { detail: SignalDetail }) {
  const asOf = detail.signal_freshness?.composite_score?.data_as_of;
  return (
    <section className="rounded-xl border border-border bg-surface-raised px-4 py-3 shadow-sm" data-testid="stock-condition-card">
      <h3 className="text-sm font-semibold text-foreground">{READING_NAME}</h3>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <ExplainTerm metricKey="composite_score" symbol={detail.symbol} ctx={{ composite_score: detail.composite_score, symbol: detail.symbol }}>
          <span className="text-2xl font-semibold text-foreground" data-testid="stock-condition-value">
            {detail.composite_score} out of 100
          </span>
        </ExplainTerm>
        {conditionChangeText(detail.delta_1d) && (
          <ExplainTerm metricKey="delta_1d" symbol={detail.symbol} ctx={{ delta_1d: detail.delta_1d ?? "—", symbol: detail.symbol }}>
            <span className="text-sm text-foreground-muted">({conditionChangeText(detail.delta_1d)})</span>
          </ExplainTerm>
        )}
        {conditionChangeText(detail.delta_5d) && (
          <span className="text-xs text-foreground-faint">5d: {conditionChangeText(detail.delta_5d)?.replace(" vs previous session", "")}</span>
        )}
      </div>
      <p className="mt-1 text-xs text-foreground-muted" data-testid="reading-explainer">{READING_EXPLAINER}</p>
      <ScoreAsOf scoreDate={asOf} />
    </section>
  );
}
