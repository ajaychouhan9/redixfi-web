import clsx from "clsx";
import { formatDelta, formatPct } from "@/lib/format";

/**
 * Renders a signed past-tense delta (score points or %) with symmetric
 * up/down styling — equal visual weight both directions, per the
 * compliance "Symmetry" rule. Never used for anything forward-looking.
 */
export function DeltaValue({
  value,
  kind = "points",
  className,
}: {
  value: number | null | undefined;
  kind?: "points" | "pct";
  className?: string;
}) {
  // No comparable value (e.g. across a split): a dash, not a number.
  if (value === null || value === undefined) {
    return <span className={clsx("inline-flex items-center text-foreground-faint", className)}>—</span>;
  }
  const tone = value > 0 ? "text-up" : value < 0 ? "text-down" : "text-neutral";
  const arrow = value > 0 ? "▲" : value < 0 ? "▼" : "–";
  const text = kind === "pct" ? formatPct(value) : formatDelta(value);
  return (
    <span className={clsx("inline-flex items-center gap-1 font-medium tabular-nums", tone, className)}>
      <span aria-hidden>{arrow}</span>
      {text}
    </span>
  );
}
