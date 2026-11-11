/**
 * Per-stock Market Rewind page (12 Nov 2026): history only. How many times a stated condition happened in the past, when, and what the
 * stock's closes did over the next sessions, as counts and dates. No probability, rate, score or forecast wording; a condition with fewer
 * than REWIND_MIN_CASES past cases shows "Too few past cases" instead of a result.
 */
import { REWIND_MIN_CASES, quarterDate } from "@/lib/seo/stock-facts";

export { REWIND_MIN_CASES };

/** A stock needs about a year of its own sessions before its Rewind page is indexed. */
export const REWIND_MIN_SESSIONS = 250;

export interface RewindCondition {
  key: string;
  label: string;
  move: number;
  direction: "up" | "down";
}

export const REWIND_CONDITIONS: RewindCondition[] = [
  { key: "up3", label: "Closed 3% or more higher in one session", move: 3, direction: "up" },
  { key: "up5", label: "Closed 5% or more higher in one session", move: 5, direction: "up" },
  { key: "down3", label: "Closed 3% or more lower in one session", move: 3, direction: "down" },
  { key: "down5", label: "Closed 5% or more lower in one session", move: 5, direction: "down" },
];

interface RawSession {
  offset: number;
  status: string;
  change_pct?: number | null;
}
export interface RawDay {
  date: string;
  move_pct: number;
  sessions: RawSession[];
}
export interface RawStock {
  symbol: string;
  company_name?: string;
  sessions: number;
  first_session: string | null;
  partial_period?: boolean;
  count: number;
  listed: number;
  days: RawDay[];
}

export interface CaseRow {
  date: string;
  movePct: number;
  nextPct: number | null;
  fiveDayPct: number | null;
}

export interface ConditionResult {
  condition: RewindCondition;
  count: number;
  /** Cases the table and the outcome counts are based on (the newest, up to the API's list cap). */
  listed: number;
  tooFew: boolean;
  nextHigher: number;
  nextLower: number;
  nextFlat: number;
  nextKnown: number;
  fiveHigher: number;
  fiveLower: number;
  fiveFlat: number;
  fiveKnown: number;
  rows: CaseRow[];
}

/** Compounded change over sessions +1..+5 of one case, only when all five are stored. */
export function fiveSessionChange(sessions: RawSession[]): number | null {
  let level = 1;
  for (let o = 1; o <= 5; o += 1) {
    const s = sessions.find((x) => x.offset === o);
    if (!s || s.status !== "ok" || typeof s.change_pct !== "number") return null;
    level *= 1 + s.change_pct / 100;
  }
  return Math.round((level - 1) * 10000) / 100;
}

export function nextSessionChange(sessions: RawSession[]): number | null {
  const s = sessions.find((x) => x.offset === 1);
  return s && s.status === "ok" && typeof s.change_pct === "number" ? s.change_pct : null;
}

export function summarise(condition: RewindCondition, stock: RawStock | null): ConditionResult {
  const days = (stock?.days ?? []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const rows: CaseRow[] = days.map((d) => ({ date: d.date, movePct: d.move_pct, nextPct: nextSessionChange(d.sessions), fiveDayPct: fiveSessionChange(d.sessions) }));
  const split = (vals: (number | null)[]) => {
    const known = vals.filter((v): v is number => v !== null);
    return { known: known.length, higher: known.filter((v) => v > 0).length, lower: known.filter((v) => v < 0).length, flat: known.filter((v) => v === 0).length };
  };
  const n = split(rows.map((r) => r.nextPct));
  const f = split(rows.map((r) => r.fiveDayPct));
  const count = stock?.count ?? 0;
  return {
    condition,
    count,
    listed: rows.length,
    tooFew: count < REWIND_MIN_CASES,
    nextHigher: n.higher,
    nextLower: n.lower,
    nextFlat: n.flat,
    nextKnown: n.known,
    fiveHigher: f.higher,
    fiveLower: f.lower,
    fiveFlat: f.flat,
    fiveKnown: f.known,
    rows,
  };
}

/** The period line every result carries: how many sessions and from when to when. */
export function periodLine(stock: RawStock, asOf: string): string {
  return `${stock.sessions.toLocaleString("en-IN")} sessions from ${quarterDate(stock.first_session)} to ${quarterDate(asOf)}`;
}

/** Wording of one result. Never states a rate or a likelihood: counts out of counts, with the period. */
export function resultSentence(r: ConditionResult): string {
  if (r.tooFew) return "Too few past cases";
  const next = r.nextKnown ? `On the next session the close was higher in ${r.nextHigher} of ${r.nextKnown} cases and lower in ${r.nextLower}${r.nextFlat ? ` (unchanged in ${r.nextFlat})` : ""}.` : "";
  const five = r.fiveKnown ? ` Five sessions later the close was higher than on the day in ${r.fiveHigher} of ${r.fiveKnown} cases and lower in ${r.fiveLower}.` : "";
  const capped = r.listed < r.count ? ` The outcome counts cover the ${r.listed} most recent of the ${r.count} cases.` : "";
  return `${next}${five}${capped}`.trim();
}

/** The page is indexable only when the stock has enough sessions of its own history. */
export function hasEnoughHistory(stock: RawStock | null): boolean {
  return !!stock && stock.sessions >= REWIND_MIN_SESSIONS;
}
