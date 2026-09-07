const HEADER_ACRONYMS: Record<string, string> = {
  ai: "AI",
  api: "API",
  cagr: "CAGR",
  fii: "FII",
  fcf: "FCF",
  id: "ID",
  isin: "ISIN",
  nse: "NSE",
  ocf: "OCF",
  pcr: "PCR",
  pdf: "PDF",
  pe: "PE",
  pb: "PB",
  rsi: "RSI",
  url: "URL",
  vwap: "VWAP",
};

export function formatExportHeader(key: string): string {
  return key
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => HEADER_ACRONYMS[word.toLowerCase()] ?? `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date));
}

function exportValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.every((item) => !isRecord(item) && !Array.isArray(item)) ? value.join(", ") : JSON.stringify(value);
  }
  return value;
}

/** Shared row normalization for CSV/XLSX parity and to prevent [object Object]. */
export function normalizeExportRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (isRecord(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value)) normalized[`${key}_${nestedKey}`] = exportValue(nestedValue);
    } else {
      normalized[key] = exportValue(value);
    }
  }
  return normalized;
}

export function normalizeExportRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(normalizeExportRow);
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const normalizedRows = normalizeExportRows(rows);
  const headers = Object.keys(normalizedRows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(formatExportHeader).join(","), ...normalizedRows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
