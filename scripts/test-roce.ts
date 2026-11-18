// ROCE (annual), 19 Nov 2026: the stock-page block, the five-year table, the Screener column and filter, and the wording on all of it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ROCE_CAUTION_ADVANCES, ROCE_DATA_NOTE, ROCE_FORMULA, ROCE_TABLE_NOTE, ROCE_HOW_BODY, ROCE_HOW_TITLE, ROCE_LABEL, ROCE_NOT_APPLICABLE, ROCE_NOT_AVAILABLE, ROCE_SOURCE,
  roceFilterNote, roceState, roceTableRows, type RoceBlock,
} from "../src/lib/roce.ts";
import { COLUMN_BY_ID, PRESETS, columnAvailable, filterColumns, resolveColumns, sanitizeColumns } from "../src/lib/screener-columns.ts";
import { EMPTY_FUND, fundChips, fundParams } from "../src/components/app/signals/fund-filter-model.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

const row = (end: string, fyr: string | null, op: number | null, ce: number | null, pct: number | null) =>
  ({ fiscal_year: fyr, period_end: end, total_assets: null, current_liabilities: null, operating_profit_pre_exceptional: op, capital_employed: ce, roce_pct: pct });
const HUL: RoceBlock = {
  roce_applicable: true, roce_caution: null, roce_pct: 21.37, roce_year: "2026", roce_period_end: "2026-03-31",
  series: [row("2025-03-31", "2025", 13453, 63343, 21.24), row("2026-03-31", "2026", 13721, 64203, 21.37), row("2024-03-31", "2024", null, 65623, null)],
};

// 1. the stock page block: figure with its year, not applicable, real estate caution, missing
const s = roceState(HUL);
assert.ok(s.kind === "figure" && s.value === "21.4%" && s.year === "FY2026" && s.caution === null);
assert.deepEqual(roceState({ ...HUL, roce_applicable: false, roce_pct: null, series: [] }), { kind: "not_applicable" });
const re = roceState({ ...HUL, roce_caution: "customer_advances" });
assert.ok(re.kind === "figure" && re.caution === "Customer advances can distort this figure");
assert.equal(roceState({ ...HUL, roce_pct: null, roce_year: null }).kind, "missing");
assert.equal(roceState(null).kind, "missing");
assert.equal(roceState(undefined).kind, "missing");

// 2. the five-year table: newest first, a missing figure reads "Not available", nothing for banks and insurers
const rows = roceTableRows(HUL);
assert.deepEqual(rows.map((r) => r[0]), ["FY2026", "FY2025", "FY2024"]);
assert.deepEqual(rows[0], ["FY2026", "13,721", "64,203", "21.4%"]);
assert.deepEqual(rows[2], ["FY2024", ROCE_NOT_AVAILABLE, "65,623", ROCE_NOT_AVAILABLE]);
assert.deepEqual(roceTableRows({ ...HUL, roce_applicable: false }), []);
assert.deepEqual(roceTableRows(null), []);

// 3. the copy, word for word
assert.equal(ROCE_LABEL, "Return on capital employed (ROCE)");
assert.equal(ROCE_SOURCE, "Calculated by RedixFi from annual statements");
assert.equal(ROCE_HOW_TITLE, "How is this calculated?");
assert.equal(ROCE_FORMULA, "Operating profit before exceptional items ÷ (total assets − current liabilities). Calculated by RedixFi from annual statements; may differ slightly from the company's own figure.");
assert.equal(ROCE_NOT_APPLICABLE, "Not applicable for banks, insurers and finance companies");
assert.equal(ROCE_CAUTION_ADVANCES, "Customer advances can distort this figure");
assert.equal(ROCE_NOT_AVAILABLE, "Not available");

// 4. Screener column: cell, CSV, availability, preset, forced on by the filter
const col = COLUMN_BY_ID.roce;
assert.ok(col && col.group === "Fundamentals" && col.sort === "roce");
assert.deepEqual(col.cell({ roce: 21.37, roce_year: "2026", roce_applicable: true } as never, {}), { primary: "21.4%", sub: "FY2026" });
assert.deepEqual(col.cell({ roce: null, roce_applicable: false } as never, {}), { primary: "Not applicable" });
assert.equal(col.cell({ roce: null, roce_applicable: true } as never, {}), null);
assert.equal(col.csv({ roce: null, roce_applicable: false } as never, {}), "not applicable");
assert.equal(col.csv({ roce: 21.37, roce_applicable: true } as never, {}), 21.37);
assert.equal(col.csv({ roce: null } as never, {}), "n/a");
assert.equal(col.asOf({ roce_year: "2026" } as never, {}), "FY2026 annual statements");
assert.equal(columnAvailable("roce", { fundamentals: true, filters13: true, columns: true }), false, "not offered by an API that has no ROCE figures");
assert.equal(columnAvailable("roce", { fundamentals: true, filters13: true, columns: true, roce: true }), true);
assert.ok(PRESETS.find((p) => p.id === "fundamentals")!.ids.includes("roce"));
assert.deepEqual(sanitizeColumns(["roce", "roe"]), ["roe", "roce"], "ROCE sits right after ROE");
assert.deepEqual(filterColumns({ roceMin: "15" }), ["roce"]);
assert.ok(resolveColumns([], filterColumns({ roceMin: "15" })).forced.has("roce"));

// 5. the filter: a plain number, no suggested value; a stock with no figure is counted, not matched
assert.equal(fundParams({ ...EMPTY_FUND, roceMin: "20" }).roce_min, 20);
assert.equal(fundParams({ ...EMPTY_FUND, roceMin: "" }).roce_min, undefined);
assert.equal(fundChips({ ...EMPTY_FUND, roceMin: "20" }, () => undefined).find((c) => c.key === "roce")?.text, "ROCE above 20%");
const filt = read("components/app/signals/FundamentalFilters.tsx");
const roceInput = /ROCE % above[\s\S]*?data-testid="roce-min"/.exec(filt)?.[0] ?? "";
assert.ok(roceInput.includes('placeholder="Enter a number"') && !/placeholder="e\.g\./.test(roceInput), "no suggested or preset number on the ROCE filter");
assert.ok(!filt.includes("ROCE is not stored"), "the old 'ROCE is not stored' line is gone");
assert.equal(roceFilterNote(0, 0), null);
assert.equal(roceFilterNote(null, null), null);
assert.equal(roceFilterNote(1, 0), "1 stock has no ROCE figure and is left out of this filter.");
assert.equal(roceFilterNote(1281, 250), "1,281 stocks have no ROCE figure and are left out of this filter (250 of them are banks, insurers or finance companies, where it does not apply).");
const ex = strip(read("components/app/signals/SignalsExplorer.tsx"));
assert.ok(ex.includes("roceFilterNote(info.roce_no_figure_count, info.roce_not_applicable_count)") && ex.includes('data-testid="roce-filter-note"'), "the count is shown under the filters");

// 6. stock page: ROCE sits beside ROE on the Annual report tab, static markup
const page = strip(read("app/(app)/stocks/[symbol]/page.tsx"));
assert.ok(page.indexOf('label="Return on equity"') > 0 && page.indexOf("<RoceView roce={f?.roce} />") > page.indexOf('label="Return on equity"'), "ROCE follows ROE");
const dataPage = read("app/(app)/more/data-sources/page.tsx");
assert.ok(dataPage.includes("ROCE_DATA_NOTE") && dataPage.includes("roce-data-note"), "the data sources page carries the ROCE note");
const view = strip(read("components/app/research/RoceView.tsx"));
assert.ok(!/use client|useEffect|fetch\(/.test(view) && view.includes("<details") && view.includes("ROCE_FORMULA"), "no script, formula under 'How is this calculated?'");

// 7. wording guard on everything new
const all = [ROCE_DATA_NOTE, ROCE_TABLE_NOTE, ROCE_LABEL, ROCE_SOURCE, ROCE_FORMULA, ROCE_HOW_BODY, ROCE_NOT_APPLICABLE, ROCE_CAUTION_ADVANCES, ROCE_NOT_AVAILABLE,
  roceFilterNote(1281, 250) ?? "", view.replace(/data-testid="[^"]*"/g, "")].join("\n");
const BANNED = /\b(buy|buying|sell|selling|targets?|picks?|bullish|bearish|strong signal|catch a falling knife|skip|avoid|candidates?|high conviction|red flags?|turnaround|recommend\w*|best|top|good|bad|cheap|expensive|safe|likely|expected|strong|weak|attractive|quality|undervalued|overvalued|healthy)\b/gi;
assert.deepEqual(all.match(BANNED) ?? [], [], "banned words in the ROCE copy");
assert.ok(!/\b(score|verdict|rating|grade)\b/i.test(all), "no score or verdict");

console.log("roce tests: ok");
