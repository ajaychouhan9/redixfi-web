/** Weekly review pages (12 Nov 2026): one indexable page per stored week, in neutral words. Measured market data only. */
import type { SevenDayReview } from "@/lib/api/types";
import { formatDateIst } from "@/lib/format";

export const WEEKLY_PATH = "/weekly";
export const weekPath = (asOf: string) => `/weekly/${asOf}`;
export const isWeekDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

const n = (v: number) => v.toLocaleString("en-IN");
const dec = (v: number, d = 2) => v.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
const dateText = (ymd: string) => formatDateIst(`${ymd}T00:00:00Z`);
const range = (r: SevenDayReview) => r.window!.label.replace(/^Last \d+ sessions: /, "");

export function weekTitle(r: SevenDayReview): string {
  return `Market data for ${range(r)}: indices, stocks and events | RedixFi`;
}

export function weekH1(r: SevenDayReview): string {
  return `Weekly market review: ${range(r)}`;
}

function indexSentence(name: string, b: { start: number; end: number; pct: number | null } | null | undefined): string | null {
  if (!b || b.pct === null) return null;
  if (b.pct === 0) return `${name} was unchanged at ${dec(b.end)}.`;
  return `${name} ${b.pct > 0 ? "rose" : "fell"} ${Math.abs(b.pct).toFixed(2)}% from ${dec(b.start)} to ${dec(b.end)}.`;
}

/** Plain sentences describing the week. Every number comes from the stored review; the wording does not rate or predict. */
export function weekSentences(r: SevenDayReview): string[] {
  const out: string[] = [];
  const m = r.market;
  if (m) {
    for (const s of [indexSentence("The Nifty 50", m.nifty), indexSentence("The Bank Nifty", m.banknifty), indexSentence("India VIX", m.vix)]) if (s) out.push(s);
    if (m.breadth?.n) out.push(`Of ${n(m.breadth.n)} liquid stocks, ${n(m.breadth.advancing)} closed the window higher, ${n(m.breadth.declining)} lower and ${n(m.breadth.unchanged)} unchanged.`);
    if (m.industries?.total) out.push(`${n(m.industries.higher)} of ${n(m.industries.total)} industries had an average price change above zero.`);
    if (m.flows) {
      const f = m.flows;
      const flow = (label: string, v: number | null) => (v === null ? null : `${label} ${v >= 0 ? "net inflow" : "net outflow"} of ₹${n(Math.round(Math.abs(v)))} crore`);
      const parts = [flow("foreign institutions:", f.fii_net), flow("domestic institutions:", f.dii_net)].filter(Boolean);
      if (parts.length) out.push(`Reported institutional flows over ${f.sessions} sessions: ${parts.join("; ")}${f.complete ? "" : " (the exchange data for some sessions was not complete)"}.`);
    }
  }
  const e = r.events;
  if (e) {
    out.push(
      `Announcements in the window: results from ${n(e.results.stocks)} companies, board meetings for ${n(e.board_meetings.stocks)}, ${n(e.deals.deals)} bulk or block deals in ${n(e.deals.stocks)} stocks and ${n(e.insider.disclosures)} insider trade disclosures for ${n(e.insider.stocks)} stocks.`,
    );
  }
  return out;
}

export function weekDescription(r: SevenDayReview): string {
  const first = weekSentences(r).slice(0, 2).join(" ");
  return `${r.window!.label}, as of ${dateText(r.as_of!)} close. ${first} Measured market data only.`.slice(0, 300);
}

export function weekLastmod(r: SevenDayReview): string {
  return (r.built_at ?? r.as_of ?? "").slice(0, 10);
}
