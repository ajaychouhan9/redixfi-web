export function formatInr(amount: number, opts: { paise?: boolean } = {}): string {
  const value = opts.paise ? amount : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(n);
}

export function formatPct(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function formatDelta(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}`;
}

const IST_DATE = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const IST_TIME = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

/**
 * e.g. "28 Mar 2026" — the year-inclusive counterpart to formatShortDate().
 * Use wherever the year is load-bearing (financial transaction dates like
 * insider trades/dividends, where "18 Jan" alone is ambiguous across
 * years) — everywhere else on the site intentionally uses the shorter,
 * year-less formatShortDate().
 */
export function formatDateIst(iso: string): string {
  return IST_DATE.format(new Date(iso));
}

export function formatTimeIst(iso: string): string {
  return IST_TIME.format(new Date(iso));
}

export function formatDateTimeIst(iso: string): string {
  return `${formatDateIst(iso)}, ${formatTimeIst(iso)}`;
}

export function formatDataAsOf(asOf: { data_as_of: string; data_as_of_type: string } | null | undefined): string {
  if (!asOf?.data_as_of) return "Data timestamp unavailable";
  // Daily candle documents are stored at midnight even though their
  // provenance is a trading date. Do not fabricate a 12:00 am timestamp.
  if (
    asOf.data_as_of_type === "date" ||
    /^\d{4}-\d{2}-\d{2}$/.test(asOf.data_as_of) ||
    /T00:00:00(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/.test(asOf.data_as_of)
  ) {
    const isoDate = /^\d{4}-\d{2}-\d{2}/.test(asOf.data_as_of)
      ? asOf.data_as_of.slice(0, 10)
      : asOf.data_as_of;
    const parsed = new Date(`${isoDate}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return `Data as of ${formatDateIst(parsed.toISOString())}`;
    return `Data as of ${asOf.data_as_of}`;
  }
  return `Data as of ${formatDateIst(asOf.data_as_of)} · ${formatTimeIst(asOf.data_as_of)} IST`;
}

/**
 * Sep 2026 — plain "17 Sep 2026" with no prefix, for card titles like
 * "Industry standing · 17 Sep 2026" / "Unusual activity · 17 Sep 2026",
 * replacing a static "today" with the real underlying observation date.
 * Accepts a plain "YYYY-MM-DD" date (measured_signals' own date format)
 * or a full ISO timestamp; returns null (render nothing) rather than
 * fabricating a date when none is available.
 */
export function formatObservationDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const isoDate = /^\d{4}-\d{2}-\d{2}/.test(dateStr) ? dateStr.slice(0, 10) : dateStr;
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatDateIst(parsed.toISOString());
}

/** Trial expiry in the viewer's browser/device timezone, e.g. "13 Sep, 3:30 PM". */
export function formatTrialExpiryLocal(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** e.g. "15 Jul" — used in change logs / recap cards */
/** Price-label helper (2026-10-21).
 *
 * A stock page must never present a previous-session close as "Live". This
 * turns the API's price_data_as_of into one honest line:
 *   - a timestamp from today  -> "Live · 13:30 IST" (or "Today · …" after hours)
 *   - a daily-candle date      -> "Last close, 19 Oct"
 * It is the same rule on the detail page, the signals list and Research.
 */
const IST_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function istToday(): string {
  return IST_DAY.format(new Date());
}

function isMarketOpenNow(): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  if (weekday === "Sat" || weekday === "Sun") return false;
  const mins = hour * 60 + minute;
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

export function formatPriceAsOf(
  asOf?: { data_as_of: string; data_as_of_type?: string } | null,
): string {
  if (!asOf?.data_as_of) return "Last close";
  const raw = asOf.data_as_of;
  const day = raw.slice(0, 10);
  const hasClockTime = /T\d{2}:\d{2}/.test(raw) && !/T00:00:00/.test(raw);
  const isTimestamp = asOf.data_as_of_type === "timestamp" || hasClockTime;
  if (isTimestamp) {
    const time = formatTimeIst(raw);
    if (day === istToday()) return isMarketOpenNow() ? `Live · ${time} IST` : `Today · ${time} IST`;
    return `Last update ${formatDateIst(raw)} · ${time} IST`;
  }
  return `Last close, ${formatShortDate(day)}`;
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short" }).format(
    new Date(iso)
  );
}

/**
 * ₹ amount already expressed in crore. ≥1 Cr rounds to a whole number (no
 * decimals); sub-crore (lakhs-level) figures keep up to 2 decimal places so
 * small values don't round away to "0". ₹ first, comma-grouped digits, "Cr"
 * last — e.g. "₹2,921 Cr" / "₹-2,921 Cr" / "₹0.35 Cr".
 */
export function formatCr(value: number | null): string {
  if (value === null) return "—";
  const digits = Math.abs(value) >= 1 ? 0 : 2;
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: digits })} Cr`;
}
