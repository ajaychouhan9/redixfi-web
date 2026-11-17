/**
 * "Simple view" checklist for the public stock page (17 Nov 2026). Seven plain questions, each answered by a fixed template from data
 * the page ALREADY loads (GET /research/<symbol>): nothing is fetched for it and nothing is guessed. A line whose figures are not in
 * the payload answers null, and the page shows "Data not available yet". No score, no verdict, no judgement words: a rise and a
 * fall are written the same way. Pure functions, tested by scripts/test-simple-view.ts.
 */
import { personCategory, sideLabel } from "@/lib/insider-display";
import { resolve52Week } from "@/lib/week52";

export interface ChecklistSource {
  label: string;
  href: string;
}

export interface ChecklistLine {
  key: "profit" | "growth" | "debt" | "promoters" | "insiders" | "watch" | "price";
  question: string;
  /** Null when the data the template needs is not in the payload. */
  answer: string | null;
  why: string;
  /** The tab (or the Overview anchor) that holds the matching detail: "annual-report", "insiders", "points-to-watch" or "range". */
  detailsId: string;
  sources?: ChecklistSource[];
}

// Loose input shapes: only the fields the templates read, all optional, so a partial payload or an older API never throws.
export interface ChecklistInput {
  price?: { last_price?: number | null; week52_high?: number | null; week52_low?: number | null; corporate_action?: { status?: string } | null } | null;
  corporate_action?: { status?: string } | null;
  fundamentals?: {
    annual?: { series_5y?: { fiscal_year?: string | null; revenue?: number | null; pat?: number | null }[] | null } | null;
    balance?: { debt_to_equity?: number | null } | null;
    valuation?: { debt_to_equity?: number | null } | null;
    shareholding?: { latest_date?: string | null; promoter_pct?: number | null; series_4q?: { date?: string; promoter?: number | null }[] | null } | null;
  } | null;
  pledge_history?: { as_of_date?: string; quarter?: string; pledged_pct?: number | null }[] | null;
  insider_trades?: { trade_date?: string | null; transaction_type?: string | null; value_amount?: number | null; person_category?: string | null; relation?: string | null; raw_data?: Record<string, unknown> | null }[] | null;
  red_flags?: {
    coverage?: { total_chunks?: number } | null;
    categories?: {
      category_label?: string;
      occurrence_count?: number;
      occurrences?: { category_label?: string; source_type_label?: string; fiscal_year?: string | null; filing_date?: string | null; source_pdf_url?: string | null }[];
    }[] | null;
  } | null;
}

const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const crore = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })} crore`;
const rupees = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const pct1 = (n: number) => `${n.toFixed(1)}%`;
const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(0)}%`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(ymd: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd ?? "");
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

function daysBetween(a: string, b: string): number | null {
  const ta = Date.parse(a.slice(0, 10)), tb = Date.parse(b.slice(0, 10));
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null;
  return Math.round((ta - tb) / 86_400_000);
}

/** Change from `from` to `to` in percent; null when the base is zero or negative (a percentage would mislead). */
export function pctChange(from: number, to: number): number | null {
  if (!fin(from) || !fin(to) || from <= 0) return null;
  return ((to - from) / from) * 100;
}

export function profitLine(input: ChecklistInput): string | null {
  const pts = (input.fundamentals?.annual?.series_5y ?? []).filter((p) => fin(p.pat));
  if (pts.length === 0) return null;
  const made = pts.filter((p) => (p.pat as number) > 0).length;
  const years = pts.map((p) => p.fiscal_year).filter(Boolean);
  const span = years.length >= 2 ? ` (${years[0]} to ${years[years.length - 1]})` : years.length === 1 ? ` (${years[0]})` : "";
  return `Made a profit in ${made} of the last ${pts.length} ${pts.length === 1 ? "year" : "years"}${span}.`;
}

export function growthLine(input: ChecklistInput): string | null {
  const pts = [...(input.fundamentals?.annual?.series_5y ?? [])]
    .filter((p) => fin(p.revenue))
    .sort((a, b) => String(a.fiscal_year ?? "").localeCompare(String(b.fiscal_year ?? "")));
  if (pts.length < 2) return null;
  const first = pts[0], last = pts[pts.length - 1];
  const n = pts.length - 1;
  const sales = pctChange(first.revenue as number, last.revenue as number);
  let text = `Sales went from ${crore(first.revenue as number)} to ${crore(last.revenue as number)} in ${n} ${n === 1 ? "year" : "years"}${sales !== null ? ` (${signed(sales)})` : ""}.`;
  if (fin(first.pat) && fin(last.pat)) {
    const profit = pctChange(first.pat, last.pat);
    text += ` Profit went from ${crore(first.pat)} to ${crore(last.pat)}${profit !== null ? ` (${signed(profit)})` : ""}.`;
  }
  return text;
}

export function debtLine(input: ChecklistInput): string | null {
  const de = input.fundamentals?.balance?.debt_to_equity ?? input.fundamentals?.valuation?.debt_to_equity ?? null;
  if (!fin(de) || de < 0) return null;
  if (de === 0) return "It reports no debt against its own capital (debt-to-equity 0).";
  return `Debt is ${de.toFixed(2)} times its own capital, the shareholders' money in the business (debt-to-equity ${de.toFixed(2)}).`;
}

export function promotersLine(input: ChecklistInput): string | null {
  const sh = input.fundamentals?.shareholding;
  if (!sh || !fin(sh.promoter_pct)) return null;
  let text = `Promoters hold ${pct1(sh.promoter_pct)}`;
  const series = [...(sh.series_4q ?? [])].filter((p) => fin(p.promoter) && p.date).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const latestDate = sh.latest_date ?? (series.length ? series[series.length - 1].date : null);
  const oldest = series.length >= 2 ? series[0] : null;
  if (oldest && latestDate) {
    const gap = daysBetween(latestDate, oldest.date as string);
    const when = gap !== null && gap >= 300 && gap <= 430 ? "a year ago" : `on ${shortDate(oldest.date) ?? oldest.date}`;
    const prev = oldest.promoter as number;
    const diff = sh.promoter_pct - prev;
    const dir = Math.abs(diff) < 0.05 ? "the same as" : diff > 0 ? "up from" : "down from";
    text += `, ${dir} ${pct1(prev)} ${when}`;
  }
  text += ".";
  const pledges = [...(input.pledge_history ?? [])].filter((p) => fin(p.pledged_pct)).sort((a, b) => String(a.as_of_date ?? a.quarter ?? "").localeCompare(String(b.as_of_date ?? b.quarter ?? "")));
  const latestPledge = pledges.length ? pledges[pledges.length - 1] : null;
  if (latestPledge) {
    const p = latestPledge.pledged_pct as number;
    text += ` ${p === 0 ? "0%" : pct1(p)} of their shares are pledged (given as security for a loan).`;
  } else {
    text += " Pledge figure not available.";
  }
  return text;
}

export function insidersLine(input: ChecklistInput, today: string): string | null {
  const trades = input.insider_trades;
  if (!Array.isArray(trades)) return null;
  const recent = trades.filter((t) => {
    const d = daysBetween(today, String(t.trade_date ?? ""));
    return d !== null && d >= 0 && d <= 92;
  });
  if (recent.length === 0) return "No insider trades were disclosed in the last 3 months.";
  let bought = 0, sold = 0, boughtN = 0, soldN = 0, valued = 0;
  const cats = new Set<string>();
  for (const t of recent) {
    const side = sideLabel(t.transaction_type);
    const v = fin(t.value_amount) ? t.value_amount : null;
    if (v !== null) valued += 1;
    if (side.startsWith("Bought")) { boughtN += 1; if (v !== null) bought += v; }
    else if (side.startsWith("Sold")) { soldN += 1; if (v !== null) sold += v; }
    cats.add(personCategory(t));
  }
  const who = cats.size ? ` (${[...cats].join(", ")})` : "";
  if (valued === 0) return `In the last 3 months: ${recent.length} disclosure${recent.length === 1 ? "" : "s"}, ${boughtN} bought and ${soldN} sold, amounts not stated${who}.`;
  return `In the last 3 months: bought ${rupees(bought)}, sold ${rupees(sold)}${who}.`;
}

export function watchLine(input: ChecklistInput): { answer: string | null; sources: ChecklistSource[] } {
  const rf = input.red_flags;
  if (!rf) return { answer: null, sources: [] };
  const groups = Array.isArray(rf.categories) ? rf.categories : [];
  // `coverage` is null when no annual-report/concall text was read for the symbol; items can still come from structured filings
  // (live: RELIANCE has 8 categories with coverage null). Only "nothing read and nothing found" is "not available".
  if (groups.length === 0 && !rf.coverage) return { answer: null, sources: [] };
  const occurrences = groups.flatMap((g) => (g.occurrences ?? []).map((o) => ({ ...o, category_label: o.category_label ?? g.category_label })));
  const count = groups.reduce((s, g) => s + (fin(g.occurrence_count) ? g.occurrence_count : (g.occurrences ?? []).length), 0);
  if (count === 0) return { answer: "No items found in the documents we read.", sources: [] };
  const labels = [...new Set(groups.map((g) => g.category_label).filter(Boolean))];
  const sources = occurrences
    .filter((o) => o.source_pdf_url)
    .sort((a, b) => String(b.filing_date ?? "").localeCompare(String(a.filing_date ?? "")))
    .slice(0, 5)
    .map((o) => ({
      label: `${o.category_label ?? "Item"} · ${o.source_type_label ?? "filing"}${o.fiscal_year ? ` ${o.fiscal_year}` : o.filing_date ? ` ${shortDate(o.filing_date) ?? ""}` : ""}`.trim(),
      href: o.source_pdf_url as string,
    }));
  return {
    answer: `${count} item${count === 1 ? "" : "s"} found in the annual report and concall filings we read${labels.length ? `: ${labels.join(", ").toLowerCase()}` : ""}.`,
    sources,
  };
}

/** `priceLabel` is the page's own "As of ..." text; it becomes "15 min delayed" or "At <date> close". */
export function priceLine(input: ChecklistInput, priceLabel: string): string | null {
  const p = input.price;
  if (!p || !fin(p.last_price)) return null;
  const ca = (p.corporate_action ?? input.corporate_action)?.status;
  if (ca === "unconfirmed" || ca === "review") return null;
  const r = resolve52Week(p.week52_high, p.week52_low, p.last_price);
  if (!r || r.low <= 0) return null;
  const aboveLow = ((p.last_price - r.low) / r.low) * 100;
  const basis = /delayed/i.test(priceLabel) ? "15 min delayed" : priceLabel.replace(/^As of /, "At ");
  return `At ${rupees(p.last_price)}, ${pct1(r.belowHighPct)} below its 52-week high (${rupees(r.high)}) and ${pct1(aboveLow)} above its 52-week low (${rupees(r.low)}). ${basis}.`;
}

export function buildChecklist(input: ChecklistInput, opts: { today: string; priceLabel: string }): ChecklistLine[] {
  const safe = <T,>(fn: () => T, fallback: T): T => {
    try {
      return fn();
    } catch {
      return fallback;
    }
  };
  const watch = safe(() => watchLine(input), { answer: null, sources: [] });
  return [
    { key: "profit", question: "Is the company making a profit?", answer: safe(() => profitLine(input), null), why: "Profit is what is left after all costs; it is the money a business can keep or reinvest.", detailsId: "annual-report" },
    { key: "growth", question: "Are sales and profit growing?", answer: safe(() => growthLine(input), null), why: "The change over several years shows whether the business is getting bigger or smaller.", detailsId: "annual-report" },
    { key: "debt", question: "How much debt does it have?", answer: safe(() => debtLine(input), null), why: "Borrowed money has to be repaid with interest whatever the business earns in a given year.", detailsId: "annual-report" },
    { key: "promoters", question: "What are the promoters doing?", answer: safe(() => promotersLine(input), null), why: "Promoters are the people who control the company; their holding and any pledged shares are disclosed every quarter.", detailsId: "insiders" },
    { key: "insiders", question: "Are insiders buying or selling?", answer: safe(() => insidersLine(input, opts.today), null), why: "Directors, promoters and senior staff must disclose their own share trades; the category is shown, never a name.", detailsId: "insiders" },
    { key: "watch", question: "Points to watch in its reports?", answer: watch.answer, why: "These are statements found in the company's own filings, listed with their source so you can read them yourself.", detailsId: "points-to-watch", sources: watch.sources },
    { key: "price", question: "Where is the price?", answer: safe(() => priceLine(input, opts.priceLabel), null), why: "The 52-week high and low are the highest and lowest closes of the past year; this is where today's price sits between them.", detailsId: "range" },
  ];
}
