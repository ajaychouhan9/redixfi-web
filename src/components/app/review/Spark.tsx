import { Sparkline } from "@/components/ui/Sparkline";

/** A small line of the last few values, with a text alternative. The tone is set by the caller (price changes: up / down colour; Stock Condition: neutral). */
export function Spark({ values, label, tone = "neutral", width = 64 }: { values: number[]; label: string; tone?: "up" | "down" | "neutral"; width?: number }) {
  if (values.length < 2) return <span className="text-foreground-muted">-</span>;
  const colour = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-foreground-muted";
  return (
    <span role="img" aria-label={`${label}: ${values.map((v) => Math.round(v * 100) / 100).join(", ")}`} className={`inline-block ${colour}`} style={{ width }}>
      <Sparkline values={values} height={22} />
    </span>
  );
}
