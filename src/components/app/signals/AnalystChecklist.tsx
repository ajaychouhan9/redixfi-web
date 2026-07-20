import { Card } from "@/components/ui/Card";
import type { SignalDetail } from "@/lib/api/types";

interface ChecklistRow {
  label: string;
  answer: string;
}

/**
 * Renders the trader's mental checklist as factual, equal-weight answers.
 * No aggregate verdict row, no summary arrow — each row stands alone
 * (spec Part 3, "analysis enablement" core product identity).
 */
export function AnalystChecklist({ detail }: { detail: SignalDetail }) {
  const s = detail.signals;
  const states = new Set(detail.signal_states);

  const rows: ChecklistRow[] = [
    {
      label: "Trend",
      answer: states.has("TREND_UP_10D")
        ? `Price rose ${s.trend_10d_pct}% over the last 10 sessions.`
        : states.has("TREND_DOWN_10D")
          ? `Price fell ${Math.abs(s.trend_10d_pct)}% over the last 10 sessions.`
          : `Price was little changed over the last 10 sessions (${s.trend_10d_pct}%).`,
    },
    {
      label: "Volume confirmation",
      answer: states.has("VOLUME_ELEVATED")
        ? `Volume ran ${s.volume_ratio_5d}x the 5-day average — elevated participation.`
        : states.has("VOLUME_MUTED")
          ? `Volume ran ${s.volume_ratio_5d}x the 5-day average — muted participation.`
          : `Volume was near its 5-day average (${s.volume_ratio_5d}x).`,
    },
    {
      label: "Delivery quality",
      answer: states.has("DELIVERY_UP")
        ? `Delivery rose to ${s.delivery_pct}% vs a ${s.delivery_avg20}% 20-day average.`
        : states.has("DELIVERY_DOWN")
          ? `Delivery fell to ${s.delivery_pct}% vs a ${s.delivery_avg20}% 20-day average.`
          : `Delivery held near its average (${s.delivery_pct}% vs ${s.delivery_avg20}%).`,
    },
    {
      label: "Sector standing",
      answer: `Ranks #${s.sector_rank} of ${s.sector_count} stocks measured in ${detail.sector} today.`,
    },
    {
      label: "Event risk",
      answer: s.event_risk_5d
        ? `An AI-classified news event matched this stock in the last 5 days (${s.event_categories.join(", ") || "uncategorized"}).`
        : "No AI-classified news event matched this stock in the last 5 days.",
    },
  ];

  return (
    <Card title="Analyst checklist">
      <dl className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[9rem_1fr] gap-3 text-sm">
            <dt className="font-medium text-foreground-muted">{r.label}</dt>
            <dd>{r.answer}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
