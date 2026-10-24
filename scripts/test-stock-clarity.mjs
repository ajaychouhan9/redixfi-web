// Tests for the stock-page presentation helpers (Quick read, volatility share, crore format, 12-month filter)
// and a forbidden-word scan of the strings added for them.
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync } from "node:fs";

const load = (rel) => {
  const src = readFileSync(new URL(rel, import.meta.url), "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", js)(mod, mod.exports);
  return mod.exports;
};
const { quickReadParts, quickReadAllowed, moreVolatileThanPct, formatRupeesCompact, splitLast12Months } = load("../src/lib/stock-clarity.ts");

const base = { composite_score: 74, delta_1d: -4, delta_5d: -8, delivery_pct: 42.9, delivery_avg20: 48.9, delivery_series: null,
  volume_ratio_5d: 1.5, vol_rank: 1136, ranked_of: 2132, series: "EQ", corporate_action_status: null, limited_data: false };

// the example from the task
assert.deepEqual(quickReadParts(base), [
  "Score 74 (-4 today, -8 over 5 sessions)", "Delivery 42.9% vs 48.9% 20-day avg", "Volume 1.5x usual", "Volatility rank 1,136 of 2,132 (1 = most volatile)"]);
// a blanked 5-day change (stale baseline) is not shown, and a blank 1-day change is not shown either
assert.equal(quickReadParts({ ...base, delta_5d: null })[0], "Score 74 (-4 today)");
assert.equal(quickReadParts({ ...base, delta_1d: null, delta_5d: null })[0], "Score 74");
assert.equal(quickReadParts({ ...base, delta_1d: 0 })[0], "Score 74 (0 today, -8 over 5 sessions)");
// at least 3 parts, otherwise nothing
assert.equal(quickReadParts({ ...base, delivery_pct: null, volume_ratio_5d: null }).length, 0, "score + volatility only = 2 parts");
assert.equal(quickReadParts({ ...base, delivery_pct: null }).length, 3);
assert.equal(quickReadParts({ ...base, vol_rank: null }).length, 3);
// omission rules
for (const [name, patch] of Object.entries({
  "missing score": { composite_score: null }, "limited data": { limited_data: true }, "hold (review)": { corporate_action_status: "review" },
  "hold (unconfirmed)": { corporate_action_status: "unconfirmed" }, "BE (delivery series)": { delivery_series: "BE" }, "BE (volatility series)": { series: "BE" }, "BZ": { series: "BZ" },
})) assert.deepEqual(quickReadParts({ ...base, ...patch }), [], name);
assert.equal(quickReadAllowed({ ...base, corporate_action_status: "adjusted" }), true, "an adjusted stock is not a hold");
assert.ok(quickReadParts({ ...base, corporate_action_status: "adjusted" }).length === 4);

// "more volatile than X%": rank 1136 of 2132 gives 47
assert.equal(moreVolatileThanPct(1136, 2132), 47);
assert.equal(moreVolatileThanPct(1, 2000), 100);
assert.equal(moreVolatileThanPct(2000, 2000), 0);
assert.equal(moreVolatileThanPct(1064, 2136), 50);

// crore formatting
assert.equal(formatRupeesCompact(85_42_87_99_772), "₹8,543 Cr");
assert.equal(formatRupeesCompact(2_50_00_00_000), "₹250 Cr");
assert.equal(formatRupeesCompact(25_00_00_000), "₹25 Cr");
assert.equal(formatRupeesCompact(2_50_00_000), "₹2.5 Cr");
assert.equal(formatRupeesCompact(12_34_567), "₹12.35 lakh");
assert.equal(formatRupeesCompact(98_765), "₹98,765");
assert.equal(formatRupeesCompact(-85_42_87_99_772), "-₹8,543 Cr");
assert.equal(formatRupeesCompact(0), "₹0");
assert.equal(formatRupeesCompact(null), "—");
assert.equal(formatRupeesCompact(Number.NaN), "—");

// 12-month filter: nothing is dropped, an unreadable date stays visible
const now = new Date("2026-10-24T10:00:00Z");
const rows = [{ d: "2026-10-01" }, { d: "2025-10-25" }, { d: "2025-10-23" }, { d: "2024-01-05" }, { d: "" }, { d: "garbage" }];
const { recent, older } = splitLast12Months(rows, (r) => r.d, now);
assert.deepEqual(recent.map((r) => r.d), ["2026-10-01", "2025-10-25", "", "garbage"]);
assert.deepEqual(older.map((r) => r.d), ["2025-10-23", "2024-01-05"]);
assert.equal(recent.length + older.length, rows.length);
assert.deepEqual(splitLast12Months([], (r) => r.d, now), { recent: [], older: [] });

// forbidden words in everything the new UI says
const files = ["../src/lib/stock-clarity.ts", "../src/components/app/signals/QuickRead.tsx", "../src/components/app/research/VolatilityRankCard.tsx",
  "../src/components/app/research/OwnershipActivity.tsx", "../src/components/app/signals/HowToReadPage.tsx"];
const banned = /\b(buy|sell|target|likely|expected|bullish|bearish|recommend\w*|predict\w*|strong|weak|opportunity|risky|safe)\b/i;
for (const f of files) {
  let text;
  try { text = readFileSync(new URL(f, import.meta.url), "utf8"); } catch { continue; }
  // the user-visible strings only: drop comments
  const visible = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  // the one required negated disclaimer ("does not give predictions or advice") is the only allowed use of the word
  const scanned = visible.replace(/does not give predictions or advice/g, "");
  const hits = scanned.match(new RegExp(banned.source, "gi")) ?? [];
  assert.deepEqual(hits, [], `${f}: ${hits.join(", ")}`);
}
console.log("stock-page clarity helpers: ok");
