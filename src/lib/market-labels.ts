import { formatShortDate } from "@/lib/format";

/**
 * Time-basis labels for Home and the header (16 Nov 2026). A live figure (index level while the market is open, the market feed)
 * is labelled "Live (15 min delayed)"; a figure from a completed session is labelled "At <date> close". The two never share a
 * label, so "Market open" is never shown beside an earlier session's reading without saying which is which.
 */
export const LIVE_LABEL = "Live (15 min delayed)";
export const DELAYED_FEED_LABEL = "Feed delayed";

/** "At 13 Nov close" from a date or ISO string. */
export function atCloseLabel(date: string): string {
  return `At ${formatShortDate(date.length === 10 ? `${date}T00:00:00Z` : date)} close`;
}

/** The API's "Readings as of 13 Nov close" becomes "Readings at 13 Nov close"; any other text is passed through unchanged. */
export function readingsLabel(apiText: string | null | undefined): string | null {
  if (!apiText) return null;
  return apiText.replace(/^Readings as of (.+) close$/i, "Readings at $1 close");
}

/**
 * The AI Daily Brief label must match when it was written (16 Nov 2026): the "morning" brief is produced before the open
 * (about 08:10 IST), so it is "Before the open"; a morning brief written after 09:15 IST is "Morning session"; "close" is
 * "After the close".
 */
export function briefSessionLabel(period: string, createdAt: string | null | undefined): string {
  if (period === "close") return "After the close";
  if (period !== "morning") return period;
  const m = createdAt ? /T(\d{2}):(\d{2})/.exec(toIst(createdAt)) : null;
  if (!m) return "Morning brief";
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  return minutes < 9 * 60 + 15 ? "Before the open" : "Morning session";
}

function toIst(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // en-CA gives YYYY-MM-DD; the time part is rebuilt as HH:MM so the regex above can read it
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const hh = parts.find((p) => p.type === "hour")?.value ?? "";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "";
  return hh && mm ? `T${hh}:${mm}` : "";
}
