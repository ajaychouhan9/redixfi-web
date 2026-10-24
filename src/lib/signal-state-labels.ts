// Labels and tones for measured_signals.signal_states codes (shared by the chips on the stock page and the Quick read card).

// Human-readable labels for measured_signals.signal_states codes (Part 2/3).
// Purely descriptive — no directional framing beyond what the state name
// already carries (e.g. TREND_UP_10D describes a past 10-session move).
export const SIGNAL_STATE_LABELS: Record<string, string> = {
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

export const UP_STATES = new Set(["TREND_UP_10D", "ABOVE_20DMA", "DELIVERY_UP", "FII_BUY_STREAK"]);
export const DOWN_STATES = new Set(["TREND_DOWN_10D", "BELOW_20DMA", "DELIVERY_DOWN", "FII_SELL_STREAK"]);


export type SignalStateTone = "up" | "down" | "amber" | "neutral";

export function signalStateTone(code: string): SignalStateTone {
  return UP_STATES.has(code) ? "up" : DOWN_STATES.has(code) ? "down" : code === "EVENT_RISK" ? "amber" : "neutral";
}
