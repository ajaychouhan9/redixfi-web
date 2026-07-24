import type { ChangeExplanation, ComponentChange } from "@/lib/api/types";

const ARROW: Record<string, string> = { up: "⬆", down: "⬇", flat: "➡" };

const COMPONENT_LABEL: Record<string, string> = {
  trend: "Price trend",
  volume: "Volume participation",
  delivery: "Delivery participation",
  rsi: "Momentum (RSI)",
  sector: "Sector standing",
  pcr: "Options positioning (PCR)",
  pledge: "Promoter pledge",
  insider: "Insider activity",
  fii: "FII flow context",
};

/**
 * Surface 2 (Task 12) — "Why did this change?" breakdown. The DATA
 * (component_changes) ships from Task 10's evening builder; this component
 * only renders it, plus the causal-question-rule explanation from
 * core/causal.py: a descriptive answer is always shown, and a cause is
 * named ONLY when the API actually found a matched classified news event —
 * otherwise the honest "several explanations are possible" note is shown
 * plainly, never invented.
 */
export function WhyDidThisChange({
  componentChanges,
  explanation,
}: {
  componentChanges: ComponentChange[];
  explanation: ChangeExplanation;
}) {
  return (
    <div className="space-y-2 text-sm">
      <p>{explanation.descriptive}</p>
      {componentChanges.length > 0 && (
        <ul className="space-y-1">
          {componentChanges.map((c, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-4 shrink-0 text-center">{ARROW[c.direction] ?? "•"}</span>
              <span>
                {COMPONENT_LABEL[c.signal] ?? c.signal}: {c.note}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-border pt-2 text-foreground-muted">
        {explanation.cause ? (
          <p>
            A matched news event on this date: <span className="font-medium text-foreground">{explanation.cause.headline}</span>{" "}
            <span className="text-xs text-foreground-faint">
              ({explanation.cause.category.replace(/_/g, " ")}, {explanation.cause.severity} severity)
            </span>
          </p>
        ) : (
          <p className="italic">{explanation.note}</p>
        )}
      </div>
    </div>
  );
}
