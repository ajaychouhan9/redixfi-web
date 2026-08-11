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

/** e.g. "15 Jul" — used in change logs / recap cards */
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
