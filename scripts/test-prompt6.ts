// Prompt 6 (14 Nov 2026): Screener columns, filter columns, CSV rules.
//   node --experimental-strip-types --import ./scripts/ts-alias.mjs scripts/test-prompt6.ts
import assert from "node:assert/strict";
import {
  COLUMNS, PRESETS, COLUMN_BY_ID, DEFAULT_COLUMNS, buildScreenerCsv, filterColumns, resolveColumns, sanitizeColumns, fromLegacyColumns,
  neededFields, sortOptionsFor, sortPage, apiSort, emaGapPct, exportPages, EXPORT_MAX_ROWS, fmtDate, inrShort,
} from "../src/lib/screener-columns.ts";

const row = (o: Record<string, unknown> = {}) => ({
  symbol: "TCS", company_name: "Tata Consultancy", sector: "IT", last_price: 1050, day_change_pct: 1.2, ema200: 1000, ema200_state: "above", ema200_as_of: "2026-11-12",
  pe: 18.44, roe: 27.1, eps: 120, profit_growth_pct: 22, sales_growth_pct: 9, de: 0.4, promoter_pct: 54.2, shareholding_date: "2026-09-30",
  dividend_yield_pct: 1.8, fund_quarter_end: "2026-03-31", delivery_pct: 62.5, delivery_avg20: 55, volume_ratio_5d: 1.3, week52_high: 1200, pct_below_52w_high: 12.5,
  vol_pct_more: 40, vol_rank: 800, vol_ranked_of: 2000, vol_as_of: "2026-11-12", signal_states: [], news_5d: null, locked: false, ...o,
}) as never;
const ctx = { measuredAsOf: "2026-11-12", pledgeAsOf: "2026-07-18", dealLatest: "2026-11-12" };
const cell = (id: string, r = row()) => COLUMN_BY_ID[id].cell(r, ctx);
const syms = (rs: { symbol: string }[]) => rs.map((x) => x.symbol);

// ---- values with unit and date
assert.deepEqual(cell("ema200"), { primary: "Above (+5%)", sub: "EMA ₹1,000" });
assert.equal(emaGapPct(row({ last_price: 960 })), -4);
assert.deepEqual(cell("pe"), { primary: "18.4", sub: "31 Mar 2026 qtr" });
assert.deepEqual(cell("roe"), { primary: "27.1%", sub: "31 Mar 2026 qtr" });
assert.equal(cell("promoter")?.primary, "54.2%");
assert.equal(cell("promoter")?.sub, "30 Sep 2026");
assert.equal(cell("dividend_yield")?.primary, "1.8%");
assert.equal(cell("delivery")?.primary, "62.5%");
assert.equal(cell("pledge", row({ pledge_pct: 0 }))?.primary, "0%");        // a real zero is shown, not hidden
assert.equal(cell("pledge", row({ pledge_pct: 0 }))?.sub, "18 Jul 2026");
// ---- missing value is n/a (null cell), never zero
assert.equal(cell("pe", row({ pe: null })), null);
assert.equal(cell("pledge"), null);
assert.equal(cell("ema200", row({ ema200: null, ema200_state: null })), null);
assert.equal(cell("insider", row({ insider_net_30d: null })), null);
assert.equal(cell("insider", row({ insider_net_30d: 0 }))?.primary, "None disclosed");
assert.equal(cell("insider", row({ insider_net_30d: -25000000 }))?.primary, "Net selling ₹2.5 Cr");
assert.equal(inrShort(450000), "₹4.5 lakh");
assert.equal(cell("deals", row({ deal_30d_count: 2, deal_30d_last: "2026-11-10" }))?.primary, "2 deals");

// ---- every filter turns its own column on
assert.deepEqual(filterColumns({ ema200: "above", peMax: "30" }), ["ema200", "pe"]);
assert.deepEqual(filterColumns({ deMax: "1", promoterMin: "40", pledgeMax: "5", dividendYieldMin: "1", deliveryMin: "50", insider: "net_buying", deal30d: true }),
  ["delivery", "de", "promoter", "pledge", "dividend_yield", "insider", "deals"]);
assert.deepEqual(filterColumns({ peMax: "  " }), []);
const r = resolveColumns(["sector"], filterColumns({ peMax: "30" }));
assert.deepEqual(r.ids, ["sector", "pe"]);
assert.ok(r.forced.has("pe"), "a filter column is marked as forced (cannot be unticked while the filter is on)");
assert.deepEqual(resolveColumns([], []).ids, []);

// ---- presets, storage, saved state
assert.deepEqual(PRESETS.map((p) => p.label), ["Basic", "Fundamentals", "Technical", "Activity"]);
for (const p of PRESETS) assert.deepEqual(sanitizeColumns(p.ids), p.ids, `${p.id} lists only known ids in table order`);
assert.deepEqual(sanitizeColumns(["pe", "nope", "pe", "<x>", 3]), ["pe"]);
assert.deepEqual(fromLegacyColumns({ sector: true, delivery: false, volume: true, chips: true, eventRisk: false, from52: true, volatility: true }), ["sector", "volume", "from52", "volatility", "chips"]);
assert.deepEqual(fromLegacyColumns(null), DEFAULT_COLUMNS);
assert.equal(neededFields(["pe", "pledge"]), "pledge_pct");
assert.equal(neededFields(["pledge", "insider"]), "pledge_pct,insider_net_30d");
assert.equal(neededFields(["pe", "roe"]), "");

// ---- sorting: server sorts for stored numbers, page-only for the EMA gap
const so = sortOptionsFor(["pe", "ema200", "sector", "news"]);
assert.deepEqual(so.map((s) => s.value), ["pe", "page:ema200"]);
assert.ok(so[1].pageOnly && so[1].label.includes("this page only"));
assert.equal(apiSort("page:ema200"), "symbol");
assert.deepEqual(syms(sortPage([row({ symbol: "A", last_price: 1100 }), row({ symbol: "B", ema200: null, ema200_state: null }), row({ symbol: "C", last_price: 900 })], "page:ema200", "asc")), ["C", "A", "B"]);
assert.deepEqual(syms(sortPage([row({ symbol: "A", last_price: 1100 }), row({ symbol: "B", ema200: null }), row({ symbol: "C", last_price: 900 })], "page:ema200", "desc")), ["A", "C", "B"]);
for (const c of COLUMNS) if (c.sort) assert.match(c.sort, /^[a-z0-9_]+$/);

// ---- CSV: standard line first, exactly the visible columns, unit and date in each header
const csv = buildScreenerCsv([row(), row({ symbol: "X", pe: null, locked: false })], ["pe", "ema200", "sector"], ctx, "12 Nov 2026");
const lines = csv.trim().split("\r\n");
assert.ok(lines[0] === "RedixFi shows market data for information only. It gives no buy or sell advice or predictions.", "row 1 is the one-sentence line");
assert.equal(lines[1], 'Symbol,Company,"Price (₹, as of 12 Nov 2026)",Day change (%),"P/E (x, as of 31 Mar 2026 qtr)","200-day EMA (% vs EMA, as of 12 Nov 2026)",Sector');
assert.equal(lines[2], "TCS,Tata Consultancy,1050,1.2,18.44,5,IT");
assert.equal(lines[3].split(",")[4], "n/a", "a missing value is n/a");
assert.equal(lines.length, 4);
const locked = buildScreenerCsv([row({ locked: true })], ["delivery", "pe"], ctx, null).trim().split("\r\n")[2];
assert.ok(locked.includes("locked") && locked.includes("18.44"), "masked readings stay masked in the file; reported figures are not masked");
assert.ok(buildScreenerCsv([row({ company_name: "=HYPERLINK(1)" })], [], ctx, null).includes("'=HYPERLINK(1)"), "spreadsheet formulas are neutralised");
assert.equal(EXPORT_MAX_ROWS, 2000);
assert.equal(exportPages(2303), 10);
assert.equal(exportPages(150), 1);
assert.equal(exportPages(0), 0);
assert.equal(fmtDate("2026-03-31"), "31 Mar 2026");

// ---- wording of everything this file can print
const FORBIDDEN = /\b(buy|sell|hold|target|targets|recommend\w*|breakout|oversold|overbought|bullish|bearish|outlook|better than|worse than)\b/i;
for (const c of COLUMNS) assert.ok(!FORBIDDEN.test(`${c.label} ${c.unit}`), `column text: ${c.id}`);
for (const p of PRESETS) assert.ok(!FORBIDDEN.test(p.label));

// ---- pages: how-it-works section, one Common questions block, trust strip, export gate
import { existsSync, readFileSync } from "node:fs";
const root = new URL("../src/", import.meta.url);
const read = (f: string) => readFileSync(new URL(f, root), "utf8");
const STANDARD = "RedixFi shows market data for information only. It gives no buy or sell advice or predictions.";
{
  const how = read("app/(app)/how-it-works/page.tsx");
  assert.ok(how.includes('title="What else RedixFi shows"'));
  assert.ok(how.indexOf('title="The readings"') < how.indexOf('title="What else RedixFi shows"') && how.indexOf('title="What else RedixFi shows"') < how.indexOf('title="Where the data comes from"'), "new section sits below the eight readings");
  for (const need of ["Screener", "Saved screens", "Ask AI", "Market Activity", "Market Rewind", "7-Day Review and weekly pages", "Company report PDF", "A filter is a filter on reported data, not a recommendation."]) assert.ok(how.includes(need), need);
  assert.equal((how.match(/title="Common questions"/g) ?? []).length, 0, "the second Common questions card is merged into the section");
  assert.equal((how.match(/>Common questions</g) ?? []).length, 1, "one Common questions heading");
  for (const q of ["Is a reading a buy or sell recommendation?", "Which session's delivery do the readings use?", "Why can a reading change from one day to the next?", "Why is a reading sometimes missing?", "How often are the readings updated?", "Is volatility one of the readings?"]) assert.ok(how.includes(q), `kept: ${q}`);
  for (const sentence of ["Whether the stock is moving with or against its recent path.", "How much of the traded quantity in the latest delivery session", "A 14-session momentum reading on a 0–100 scale."]) assert.ok(how.includes(sentence), "reading explanation kept");
  const block = how.slice(how.indexOf("const ALSO_SHOWN"), how.indexOf("const SOURCES")).replace("not a recommendation", "");
  assert.ok(!FORBIDDEN.test(block), `new section wording: ${block.match(FORBIDDEN)}`);
}
{
  // prompt 7 (14 Nov 2026) removed the trust strip entirely: facts about the operator live on the four legal/about pages only
  assert.ok(!existsSync(new URL("components/layout/TrustStrip.tsx", root)), "trust strip removed");
  assert.ok(!read("components/layout/FooterDisclaimer.tsx").includes("TrustStrip") && !read("app/(app)/page.tsx").includes("TrustStrip") && !read("app/(app)/pricing/page.tsx").includes("TrustStrip"), "no page shows a trust strip");
  assert.ok(read("lib/compliance/standard-line.ts").includes(STANDARD), "the one-sentence line");
}
{
  const ex = read("components/app/signals/SignalsExplorer.tsx");
  assert.ok(ex.includes("export: true") && ex.includes("buildScreenerCsv"), "export asks the API in export mode and writes the visible columns");
  assert.ok(ex.includes("isProEntitled(user)") && ex.includes('data-testid="csv-locked"') && ex.includes("<UpgradeLink"), "CSV locked for non-Pro with the existing UpgradeLink");
  assert.ok(!ex.includes("downloadXlsx"), "Excel button removed: its headers cannot carry the unit and date");
  assert.ok(ex.includes("columns: shown.ids") && ex.includes("sanitizeColumns(p.columns)"), "columns travel in the shared and saved screen state");
  assert.ok(ex.includes("SIGNALS_COLUMNS_KEY_V2") && /try \{[\s\S]*localStorage\.setItem\(SIGNALS_COLUMNS_KEY_V2/.test(ex), "choice remembered in browser storage inside try/catch");
}
console.log("prompt 6 column tests ok");
