import clsx from "clsx";

const TONE_CLASSES = {
  neutral: "bg-neutral-bg text-neutral",
  up: "bg-up-bg text-up",
  down: "bg-down-bg text-down",
  amber: "bg-amber-bg text-amber",
  accent: "bg-accent/10 text-accent",
} as const;

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONE_CLASSES;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// Human-readable labels for measured_signals.signal_states codes (Part 2/3).
// Purely descriptive — no directional framing beyond what the state name
// already carries (e.g. TREND_UP_10D describes a past 10-session move).
const SIGNAL_STATE_LABELS: Record<string, string> = {
  TREND_UP_10D: "Trend up (10d)",
  TREND_DOWN_10D: "Trend down (10d)",
  ABOVE_20DMA: "Above 20-DMA",
  BELOW_20DMA: "Below 20-DMA",
  DELIVERY_UP: "Delivery up",
  DELIVERY_DOWN: "Delivery down",
  VOLUME_ELEVATED: "Volume elevated",
  VOLUME_MUTED: "Volume muted",
  RSI_OVERBOUGHT_ZONE: "RSI overbought zone",
  RSI_OVERSOLD_ZONE: "RSI oversold zone",
  FII_SELL_STREAK: "FII sell streak",
  FII_BUY_STREAK: "FII buy streak",
  PCR_CALL_HEAVY: "PCR call-heavy",
  PCR_PUT_HEAVY: "PCR put-heavy",
  EVENT_RISK: "Event risk",
};

export function signalStateLabel(code: string): string {
  return SIGNAL_STATE_LABELS[code] ?? code.replace(/_/g, " ").toLowerCase();
}

const UP_STATES = new Set(["TREND_UP_10D", "ABOVE_20DMA", "DELIVERY_UP", "FII_BUY_STREAK"]);
const DOWN_STATES = new Set(["TREND_DOWN_10D", "BELOW_20DMA", "DELIVERY_DOWN", "FII_SELL_STREAK"]);

export function SignalStateChip({ code }: { code: string }) {
  const tone = UP_STATES.has(code) ? "up" : DOWN_STATES.has(code) ? "down" : code === "EVENT_RISK" ? "amber" : "neutral";
  return <Chip tone={tone}>{signalStateLabel(code)}</Chip>;
}
