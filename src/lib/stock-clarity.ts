// Presentation helpers for the stock pages (Signals and Research). Pure functions: everything is computed at
// read time from values already on the page; nothing here is stored, scored or fetched.

/** "Quick read": which parts of the one-line summary can be shown. */
export interface QuickReadInput {
  composite_score: number | null | undefined;
  delta_1d: number | null | undefined;
  delta_5d: number | null | undefined;
  delivery_pct: number | null | undefined;
  delivery_avg20: number | null | undefined;
  /** "BE" means trade-for-trade: delivery is not applicable. */
  delivery_series: string | null | undefined;
  volume_ratio_5d: number | null | undefined;
  vol_rank: number | null | undefined;
  ranked_of: number | null | undefined;
  /** Series of the stock in the volatility document (EQ, BE, BZ). */
  series: string | null | undefined;
  /** Corporate-action note status, when the page carries one. */
  corporate_action_status: string | null | undefined;
  limited_data: boolean | null | undefined;
}

const HELD_STATUSES = new Set(["unconfirmed", "review"]);

/** A stock held while a corporate action is checked (unconfirmed / under review): the whole Quick read card is hidden
 *  (line, flag chips and link); only the corporate-action note is shown. */
export function isHeldStatus(status: string | null | undefined): boolean {
  return !!status && HELD_STATUSES.has(status);
}

/** BE and BZ are trade-for-trade series: delivery is close to 100% by construction and is not applicable. */
export function isTradeForTrade(series: string | null | undefined): boolean {
  return series === "BE" || series === "BZ";
}
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function signed(v: number): string {
  return `${v > 0 ? "+" : v < 0 ? "-" : ""}${Math.abs(v)}`;
}

/** Rank restated as a share: "more volatile than X% of ranked stocks", X = round((N - rank) / N * 100). */
export function moreVolatileThanPct(rank: number, rankedOf: number): number {
  return Math.round(((rankedOf - rank) / rankedOf) * 100);
}

/** Whether the Quick read is allowed for this stock at all (held, limited-data, BE/BZ stocks and a missing score omit it). */
export function quickReadAllowed(i: QuickReadInput): boolean {
  if (!num(i.composite_score)) return false;
  if (i.limited_data) return false;
  if (isHeldStatus(i.corporate_action_status)) return false;
  if (isTradeForTrade(i.delivery_series) || isTradeForTrade(i.series)) return false;
  return true;
}

/** The parts of the Quick read that can be shown, in order. A change that is blank (including one blanked by the
 *  stale-baseline guard) is left out of the score part, never shown as 0. Empty when fewer than 3 parts exist. */
export function quickReadParts(i: QuickReadInput): string[] {
  if (!quickReadAllowed(i)) return [];
  const parts: string[] = [];

  const changes: string[] = [];
  if (num(i.delta_1d)) changes.push(`${signed(i.delta_1d)} today`);
  if (num(i.delta_5d)) changes.push(`${signed(i.delta_5d)} over 5 sessions`);
  parts.push(`Score ${i.composite_score}${changes.length ? ` (${changes.join(", ")})` : ""}`);

  if (num(i.delivery_pct) && num(i.delivery_avg20)) {
    parts.push(`Delivery ${i.delivery_pct}% vs ${i.delivery_avg20}% 20-day avg`);
  }
  if (num(i.volume_ratio_5d)) {
    parts.push(`Volume ${i.volume_ratio_5d}x usual`);
  }
  if (num(i.vol_rank) && num(i.ranked_of) && i.ranked_of > 0) {
    parts.push(`Volatility rank ${i.vol_rank.toLocaleString("en-IN")} of ${i.ranked_of.toLocaleString("en-IN")} (1 = most volatile)`);
  }
  return parts.length >= 3 ? parts : [];
}

/** One chip in the Quick read card. */
export interface QuickReadChip {
  key: string;
  text: string;
  tone: "up" | "down" | "amber" | "neutral";
}

export interface QuickReadChipInput {
  signal_states: string[] | null | undefined;
  /** The computed-fact chips from the API (entry-point chips are never used). */
  insight_chips: { type: string; metric: string; text: string }[] | null | undefined;
  delivery_pct: number | null | undefined;
  delivery_avg20: number | null | undefined;
  volume_ratio_5d: number | null | undefined;
  delivery_series: string | null | undefined;
  series: string | null | undefined;
}

export const MAX_QUICK_READ_CHIPS = 6;
/** Fixed order in which topics are kept when there are more than six. */
export const CHIP_TOPIC_ORDER = ["trend", "dma", "delivery", "volume", "rsi", "fii", "pcr", "sector", "delta", "event"] as const;

const STATE_TOPIC: [RegExp, string][] = [
  [/^TREND_/, "trend"], [/_20DMA$/, "dma"], [/^DELIVERY_/, "delivery"], [/^VOLUME_/, "volume"], [/^RSI_/, "rsi"],
  [/^FII_/, "fii"], [/^PCR_/, "pcr"], [/^EVENT_RISK$/, "event"],
];
const METRIC_TOPIC: Record<string, string> = {
  delivery_pct: "delivery", volume_ratio: "volume", rsi_14: "rsi", sector_rank: "sector", delta_1d: "delta", pcr: "pcr",
};

/** The flag chips for the Quick read card: the state chips and the computed-fact chips together, one per topic (the
 *  shorter wording wins when two say the same thing), in a fixed priority order, at most six. A delivery chip is left
 *  out for BE/BZ stocks, and a delivery or volume chip that would contradict the Quick read numbers is left out. */
export function quickReadChips(i: QuickReadChipInput, labelOf: (code: string) => string, toneOf: (code: string) => QuickReadChip["tone"]): QuickReadChip[] {
  const tft = isTradeForTrade(i.delivery_series) || isTradeForTrade(i.series);
  const cands: (QuickReadChip & { topic: string })[] = [];
  for (const code of i.signal_states ?? []) {
    const topic = STATE_TOPIC.find(([re]) => re.test(code))?.[1];
    if (topic) cands.push({ key: code, text: labelOf(code), tone: toneOf(code), topic });
  }
  for (const c of i.insight_chips ?? []) {
    const topic = METRIC_TOPIC[c.metric];
    if (c.type === "computed_fact" && topic) cands.push({ key: `fact-${c.metric}`, text: c.text, tone: "neutral", topic });
  }
  const contradicts = (c: { key: string; topic: string }) => {
    if (c.topic === "delivery") {
      if (tft) return true;
      if (num(i.delivery_pct) && num(i.delivery_avg20)) {
        if (c.key === "DELIVERY_UP" && i.delivery_pct < i.delivery_avg20) return true;
        if (c.key === "DELIVERY_DOWN" && i.delivery_pct > i.delivery_avg20) return true;
      }
    }
    if (c.topic === "volume" && num(i.volume_ratio_5d)) {
      if (c.key === "VOLUME_ELEVATED" && i.volume_ratio_5d < 1) return true;
      if (c.key === "VOLUME_MUTED" && i.volume_ratio_5d > 1) return true;
    }
    return false;
  };
  const best = new Map<string, QuickReadChip & { topic: string }>();
  for (const c of cands) {
    if (contradicts(c)) continue;
    const cur = best.get(c.topic);
    if (!cur || c.text.length < cur.text.length) best.set(c.topic, c);
  }
  return CHIP_TOPIC_ORDER.flatMap((t) => (best.has(t) ? [best.get(t)!] : []))
    .slice(0, MAX_QUICK_READ_CHIPS)
    .map(({ key, text, tone, topic }) => ({
      key,
      text,
      // a shorter computed-fact wording keeps the colour of the state chip it replaces
      tone: key.startsWith("fact-") ? (cands.find((c) => c.topic === topic && !c.key.startsWith("fact-") && !contradicts(c))?.tone ?? tone) : tone,
    }));
}

/** Rupees as a readable value: crore for large amounts, lakh and plain rupees for small ones. */
export function formatRupeesCompact(value: number | null | undefined): string {
  if (!num(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const v = Math.abs(value);
  if (v >= 1e7) {
    const cr = v / 1e7;
    const text = cr >= 100 ? Math.round(cr).toLocaleString("en-IN") : cr.toLocaleString("en-IN", { maximumFractionDigits: 2 });
    return `${sign}₹${text} Cr`;
  }
  if (v >= 1e5) {
    return `${sign}₹${(v / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 2 })} lakh`;
  }
  return `${sign}₹${Math.round(v).toLocaleString("en-IN")}`;
}

/** Splits rows into the last 12 months and older ones (nothing is dropped). A row with no readable date stays in
 *  the recent list so it is never hidden. */
export function splitLast12Months<T>(rows: T[], dateOf: (row: T) => string | null | undefined, now: Date = new Date()): { recent: T[]; older: T[] } {
  const cut = new Date(now);
  cut.setFullYear(cut.getFullYear() - 1);
  const recent: T[] = [];
  const older: T[] = [];
  for (const row of rows) {
    const raw = dateOf(row);
    const t = raw ? new Date(raw).getTime() : NaN;
    (Number.isNaN(t) || t >= cut.getTime() ? recent : older).push(row);
  }
  return { recent, older };
}
