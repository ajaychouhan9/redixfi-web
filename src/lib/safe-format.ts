/** Number formatting that never throws: a missing, null, non-numeric or NaN value renders "n/a". Used by every table that shows API numbers. */
export function safeNumber(v: unknown, digits?: number): string {
  if (typeof v === "string" && v.trim() !== "") v = Number(v);
  if (typeof v !== "number" || !Number.isFinite(v)) return "n/a";
  return digits === undefined ? v.toLocaleString("en-IN") : v.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** "₹1,70,000" or "n/a". */
export function safeRupees(v: unknown): string {
  const n = safeNumber(v);
  return n === "n/a" ? n : `\u20b9${n}`;
}
