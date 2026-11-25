// How the Ask AI window prints a table cell (26 Nov 2026): prices with a rupee sign, Change % signed and coloured, delivery as a percent,
// numbers right-aligned in tabular figures. Everything else is printed exactly as the API sent it.
import { humanizeDates } from "@/lib/human-date";

export type CellTone = "up" | "down" | "flat" | null;
export interface Cell { text: string; numeric: boolean; tone: CellTone }

const MINUS = "\u2212";
const inr = (n: number, d = 2) => n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
const asNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v);
  return null;
};

export function formatCell(field: string | undefined, key: string, value: unknown): Cell {
  if (value === null || value === undefined || value === "" || value === "N/A") return { text: "N/A", numeric: false, tone: null };
  const n = asNumber(value);
  if (field === "change_pct" || key === "change_pct" || key.endsWith("_change_pct")) {
    if (n === null) return { text: String(value), numeric: false, tone: null };
    const tone: CellTone = n > 0 ? "up" : n < 0 ? "down" : "flat";
    const body = `${inr(Math.abs(n), 2)}%`;
    return { text: n > 0 ? `+${body}` : n < 0 ? `${MINUS}${body}` : body, numeric: true, tone };
  }
  if (n !== null && (field === "open" || field === "close" || /(^|_)(open|close)$/.test(key))) return { text: `\u20b9${inr(n)}`, numeric: true, tone: null };
  if (n !== null && (field === "delivery_pct" || key.endsWith("delivery_pct"))) return { text: `${inr(n, 1)}%`, numeric: true, tone: null };
  if (n !== null) return { text: typeof value === "number" ? String(value) : String(value).trim(), numeric: true, tone: null };
  const text = humanizeDates(String(value));
  return { text, numeric: false, tone: null };
}

/** A column is a number column when every filled cell is numeric (the date column and text columns stay left). */
export function numericColumn(rows: Record<string, unknown>[], key: string, field?: string): boolean {
  if (key === "date") return false;
  const filled = rows.map((r) => r[key]).filter((v) => v !== null && v !== undefined && v !== "" && v !== "N/A");
  if (filled.length === 0) return false;
  return filled.every((v) => formatCell(field, key, v).numeric);
}
