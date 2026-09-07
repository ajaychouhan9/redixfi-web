import { formatExportHeader, normalizeExportRows } from "./csv";

const BRAND_GOLD = "D4A94E";
const HEADER_BLUE = "D9EAF7";
const TEXT_BLACK = "000000";

export interface XlsxSheet {
  name: string;
  rows: Record<string, unknown>[];
}

function xmlEscape(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

function excelDate(value: Date): number {
  return (Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds()) - Date.UTC(1899, 11, 30)) / 86400000;
}

function isDateKey(key: string): boolean {
  return /(^|_)(date|at|timestamp|quarter_end|fiscal_year)$/i.test(key) || /(_date|_at|_timestamp)$/i.test(key);
}

function asDate(value: unknown, key: string): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string" || !isDateKey(key) || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function cellXml(value: unknown, key: string, ref: string): string {
  const date = asDate(value, key);
  if (date) return `<c r="${ref}" s="2"><v>${excelDate(date)}</v></c>`;
  if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
  if (typeof value === "boolean") return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
  const text = value === null || value === undefined ? "" : Array.isArray(value) ? value.map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).join(", ") : typeof value === "object" ? JSON.stringify(value) : String(value);
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
}

function safeSheetName(name: string, used: Set<string>): string {
  const base = (name || "Sheet").replace(/[\\/?*\[\]:]/g, "-").slice(0, 31) || "Sheet";
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    const suffixText = ` ${suffix++}`;
    candidate = `${base.slice(0, 31 - suffixText.length)}${suffixText}`;
  }
  used.add(candidate);
  return candidate;
}

function sheetXml(sheet: XlsxSheet): string {
  const rows = normalizeExportRows(sheet.rows);
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const lastColumn = columnName(Math.max(headers.length - 1, 0));
  const body = [
    `<row r="1" ht="20"><c r="A1" s="1" t="inlineStr"><is><t>RedixFi — Market. Simplified. | redixfi.com</t></is></c></row>`,
    `<row r="2">${headers.map((h, i) => `<c r="${columnName(i)}2" s="3" t="inlineStr"><is><t>${xmlEscape(formatExportHeader(h))}</t></is></c>`).join("")}</row>`,
    ...rows.map((row, rowIndex) => `<row r="${rowIndex + 3}">${headers.map((key, columnIndex) => cellXml(row[key], key, `${columnName(columnIndex)}${rowIndex + 3}`)).join("")}</row>`),
  ].join("");
  const lastRow = Math.max(rows.length + 2, 2);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${headers.map((h, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(34, Math.max(12, h.length + 3))}" customWidth="1"/>`).join("")}</cols><sheetData>${body}</sheetData><autoFilter ref="A2:${lastColumn}${lastRow}"/><mergeCells count="1"><mergeCell ref="A1:${lastColumn}1"/></mergeCells></worksheet>`;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): number[] { return [value & 255, (value >>> 8) & 255]; }
function u32(value: number): number[] { return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]; }

function appendBytes(target: number[], bytes: Uint8Array) {
  for (const byte of bytes) target.push(byte);
}

function zip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts: number[] = [];
  const central: number[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const localHeader = [0x50, 0x4b, 0x03, 0x04, ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(file.data.length), ...u32(file.data.length), ...u16(name.length), ...u16(0)];
    parts.push(...localHeader);
    appendBytes(parts, name);
    appendBytes(parts, file.data);
    const localLength = localHeader.length + name.length + file.data.length;
    central.push(0x50, 0x4b, 0x01, 0x02, ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(file.data.length), ...u32(file.data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset));
    appendBytes(central, name);
    offset += localLength;
  }
  const end = [0x50, 0x4b, 0x05, 0x06, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(central.length), ...u32(offset), ...u16(0)];
  const result = new Uint8Array(parts.length + central.length + end.length);
  result.set(parts, 0);
  result.set(central, parts.length);
  result.set(end, parts.length + central.length);
  return result;
}

export function downloadXlsx(filename: string, sheets: XlsxSheet[]) {
  const encoder = new TextEncoder();
  const validSheets = sheets.filter((sheet) => sheet.rows.length > 0);
  if (!validSheets.length) return;
  const usedNames = new Set<string>();
  const sheetEntries = validSheets.map((sheet, i) => ({ sheet: { ...sheet, name: safeSheetName(sheet.name, usedNames) }, id: i + 1 }));
  const workbookSheets = sheetEntries.map(({ sheet, id }) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${id}" r:id="rId${id + 2}"/>`).join("");
  const rels = sheetEntries.map(({ id }) => `<Relationship Id="rId${id + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${id}.xml"/>`).join("");
  const contentSheets = sheetEntries.map(({ id }) => `<Override PartName="/xl/worksheets/sheet${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  const files = [
    { name: "[Content_Types].xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${contentSheets}</Types>`) },
    { name: "_rels/.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
    { name: "xl/workbook.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`) },
    { name: "xl/_rels/workbook.xml.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}<Relationship Id="rId${validSheets.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`) },
    { name: "xl/styles.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="14" formatCode="yyyy-mm-dd"/></numFmts><fonts count="3"><font><sz val="11"/><color rgb="FF${TEXT_BLACK}"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FF${TEXT_BLACK}"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FF${TEXT_BLACK}"/><name val="Aptos"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF${BRAND_GOLD}"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF${HEADER_BLUE}"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellXfs count="4"><xf/><xf fillId="2" fontId="1" applyFill="1"/><xf numFmtId="14" applyNumberFormat="1"/><xf fillId="3" fontId="2" applyFill="1"/></cellXfs></styleSheet>`) },
    ...sheetEntries.map(({ sheet, id }) => ({ name: `xl/worksheets/sheet${id}.xml`, data: encoder.encode(sheetXml(sheet)) })),
  ];
  const archive = zip(files);
  const archiveBuffer = archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength) as ArrayBuffer;
  const blob = new Blob([archiveBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Keep the object URL alive until the browser has started the download.
  // Revoking it synchronously can leave the downloaded XLSX empty or
  // unreadable in Chromium-based browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
