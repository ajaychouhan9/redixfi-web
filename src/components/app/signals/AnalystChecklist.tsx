import { Card } from "@/components/ui/Card";
import type { FundamentalsBlock, SignalDetail } from "@/lib/api/types";
import { getChecklistRows } from "@/lib/signal-detail-export";

/**
 * Renders the trader's mental checklist as factual, equal-weight answers.
 * No aggregate verdict row, no summary arrow — each row stands alone
 * (spec Part 3, "analysis enablement" core product identity).
 */
export function AnalystChecklist({ detail, fundamentals }: { detail: SignalDetail; fundamentals?: FundamentalsBlock | null }) {
  const rows = getChecklistRows(detail, fundamentals);

  return (
    <Card title="Analyst checklist">
      <dl className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[9rem_1fr] gap-3 text-sm">
            <dt className="font-medium text-foreground-muted">{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
