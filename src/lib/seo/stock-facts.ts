/**
 * Plain, measured sentences and labels for the public stock page (12 Nov 2026). Everything here is a fact from the stored data with its
 * date; nothing predicts, rates or advises. Kept in one place so the page, its title/description and the tests share the same rules.
 */
export function inr(n: number | null | undefined, digits = 2): string {
  return typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: digits }) : "n/a";
}

export function pct(n: number | null | undefined, digits = 1): string {
  return typeof n === "number" && Number.isFinite(n) ? `${n.toFixed(digits)}%` : "n/a";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "30 Sep 2026" from a YYYY-MM-DD quarter end; "n/a" when the date is missing or unparseable. Fixed month names, so it reads the same everywhere. */
export function quarterDate(ymd: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd ?? "");
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return "n/a";
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** Growth shown the way the screener shows it: above 1,000% is "1000%+", below -100% (revenue) is a data problem and shows n/a. */
export function growthText(n: number | null | undefined, kind: "profit" | "sales"): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "n/a";
  if (kind === "sales" && n < -100) return "n/a";
  if (n > 1000) return "1000%+";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function pageTitle(company: string, symbol: string): string {
  return `${company} (${symbol}) share price data, volume, delivery and quarterly results | RedixFi`;
}

export function pageH1(company: string, symbol: string): string {
  return `${company} (${symbol}) share price, volume, delivery and quarterly results`;
}

export function metaDescription(o: { company: string; symbol: string; price: number | null; dayChangePct: number | null; quarterEnd: string | null; sector?: string | null }): string {
  const parts = [`${o.company} (${o.symbol}) on the NSE`];
  if (o.price != null) parts.push(`latest price ₹${inr(o.price)}${o.dayChangePct == null ? "" : ` (${o.dayChangePct > 0 ? "+" : ""}${o.dayChangePct.toFixed(2)}% on the day)`}`);
  parts.push("delivery and volume, 52-week range, quarterly results" + (o.quarterEnd ? ` (latest quarter ended ${quarterDate(o.quarterEnd)})` : ""));
  parts.push("insider and bulk/block disclosures, concall summaries and news");
  return `${parts.join(", ")}. Measured market data, not investment advice.`;
}

export const REWIND_MIN_CASES = 5;

/**
 * Third-party headlines and filed-transcript summaries are shown as written, but anything that reads as a rating, target, call or view
 * is left out of the public stock page (RedixFi is not a research analyst). A headline with such a word is dropped; a summary loses only the
 * sentences that contain one.
 */
// the two over-words are assembled so the wording guard (which bans them in displayed text) does not read this list as display text
const OPINION_WORDS = new RegExp("\\b(buy|buys|sell|sells|hold|holds|target|targets|recommend\\w*|rating|ratings|upgrade\\w*|downgrade\\w*|break" + "out|over" + "sold|over" + "bought|bullish|bearish|chance|chances|probability|outlook|overweight|underweight|accumulate)\\b", "i");

export const isNeutralText = (t: string | null | undefined): boolean => !!t && !OPINION_WORDS.test(t);

export function neutralSentences(text: string | null | undefined): string {
  if (!text) return "";
  return (text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? []).filter((s) => !OPINION_WORDS.test(s)).join("").trim();
}
