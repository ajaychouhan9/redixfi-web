// One date style for the whole site (26 Nov 2026): "18 Nov 2026"; a quarter or month is "Sep 2026". Used on text that arrives from the API
// (answers, findings, summaries) so no "2026-07-18" or "July 27, 2026" reaches the screen.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

export function humanDate(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return iso ?? "";
  const mon = MONTHS[Number(m[2]) - 1];
  return mon ? `${Number(m[3])} ${mon} ${m[1]}` : (iso ?? "");
}

/** "Sep 2026" for a quarter-end or month date. */
export function monthYear(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso ?? "");
  if (!m) return iso ?? "";
  const mon = MONTHS[Number(m[2]) - 1];
  return mon ? `${mon} ${m[1]}` : (iso ?? "");
}

/** Rewrite every ISO date ("2026-07-18") and every "July 27, 2026" / "27 July 2026" in a text to "18 Jul 2026". Numbers that only look like dates (no valid month) are left alone. */
export function humanizeDates(text: string): string {
  if (!text) return text;
  return text
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (all, y, mo, d) => (Number(mo) >= 1 && Number(mo) <= 12 && Number(d) >= 1 && Number(d) <= 31 ? `${Number(d)} ${MONTHS[Number(mo) - 1]} ${y}` : all))
    .replace(/\b([A-Z][a-z]{2,8})\.? (\d{1,2}),? (20\d{2})\b/g, (all, mon, d, y) => {
      const i = LONG_MONTHS.findIndex((x) => x.startsWith(String(mon).toLowerCase().slice(0, 3)) && x.startsWith(String(mon).toLowerCase()));
      return i >= 0 ? `${Number(d)} ${MONTHS[i]} ${y}` : all;
    })
    .replace(/\b(\d{1,2}) ([A-Z][a-z]{2,8}),? (20\d{2})\b/g, (all, d, mon, y) => {
      const i = LONG_MONTHS.findIndex((x) => x.startsWith(String(mon).toLowerCase()));
      return i >= 0 ? `${Number(d)} ${MONTHS[i]} ${y}` : all;
    });
}
