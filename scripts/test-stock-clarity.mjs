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

// BZ is handled like BE everywhere delivery is concerned
{
  const { isTradeForTrade, quickReadAllowed: allowed } = load("../src/lib/stock-clarity.ts");
  assert.equal(isTradeForTrade("BE"), true);
  assert.equal(isTradeForTrade("BZ"), true);
  assert.equal(isTradeForTrade("EQ"), false);
  assert.equal(isTradeForTrade(null), false);
  assert.equal(allowed({ ...base, delivery_series: "BZ" }), false, "a BZ stock gets no Quick read");
  assert.equal(allowed({ ...base, delivery_series: "EQ" }), true);
  console.log("BE/BZ rule: ok");
}

// Quick read card: flag chips in the same card, one per topic, fixed order, at most six
{
  const { quickReadChips, MAX_QUICK_READ_CHIPS } = load("../src/lib/stock-clarity.ts");
  const { signalStateLabel, signalStateTone } = load("../src/lib/signal-state-labels.ts");
  const run = (o) => quickReadChips({ signal_states: [], insight_chips: [], delivery_pct: 42.9, delivery_avg20: 48.9, volume_ratio_5d: 0.5,
    delivery_series: "EQ", series: "EQ", ...o }, signalStateLabel, signalStateTone);
  const fact = (metric, text) => ({ type: "computed_fact", metric, text });
  // the same thing said twice keeps the shorter wording
  const dup = run({
    signal_states: ["TREND_DOWN_10D", "BELOW_20DMA", "DELIVERY_DOWN", "VOLUME_MUTED"],
    insight_chips: [fact("delivery_pct", "Below its 20-day delivery average"), fact("volume_ratio", "Trading well below its usual volume"),
      { type: "entry_point", metric: "delivery_pct", text: "Common misreading: is high delivery always bullish?", faq_id: "delivery_pct_q2" }],
  });
  assert.deepEqual(dup.map((c) => c.text), ["Trend down (10d)", "Below 20-DMA", "Delivery down", "Volume muted"]);
  assert.deepEqual(dup.map((c) => c.tone), ["down", "down", "down", "neutral"], "existing colours kept");
  assert.ok(!dup.some((c) => /misreading|Learn how/i.test(c.text)), "no Q&A chips");
  // more than six topics: six, in the fixed order
  const many = run({
    signal_states: ["EVENT_RISK", "PCR_CALL_HEAVY", "FII_BUY_STREAK", "RSI_OVERSOLD_ZONE", "VOLUME_MUTED", "DELIVERY_DOWN", "ABOVE_20DMA", "TREND_UP_10D"],
    insight_chips: [fact("sector_rank", "Among the top-ranked stocks in its industry today"), fact("delta_1d", "Changed the most in the last 5 days today")],
  });
  assert.equal(many.length, MAX_QUICK_READ_CHIPS);
  assert.deepEqual(many.map((c) => c.key), ["TREND_UP_10D", "ABOVE_20DMA", "DELIVERY_DOWN", "VOLUME_MUTED", "RSI_OVERSOLD_ZONE", "FII_BUY_STREAK"]);
  // a shorter computed fact replaces a longer state label and keeps that state's colour
  const sh = run({ signal_states: ["PCR_PUT_HEAVY"], insight_chips: [fact("pcr", "Put-heavy")] });
  assert.deepEqual(sh.map((c) => c.text), ["Put-heavy"]);
  // never contradicts the Quick read numbers; BE/BZ get no delivery chip
  assert.equal(run({ signal_states: ["DELIVERY_UP"] }).length, 0, "delivery 42.9 vs 48.9 average: no 'Delivery up'");
  assert.equal(run({ signal_states: ["VOLUME_ELEVATED"], volume_ratio_5d: 0.5 }).length, 0);
  assert.equal(run({ signal_states: ["DELIVERY_DOWN"], delivery_series: "BE" }).length, 0);
  assert.equal(run({ signal_states: ["DELIVERY_DOWN"], series: "BZ", insight_chips: [fact("delivery_pct", "Below its 20-day delivery average")] }).length, 0);
  assert.deepEqual(run({}), []);
  console.log("Quick read chips: ok");
}

// page structure: order of the cards, removed blocks, markers, FAQ, Ask panel chips
{
  const rd = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
  const view = rd("../src/components/app/signals/SignalDetailView.tsx");
  const idx = ["<QuickRead", 'title="AI Summary"', 'title="Why did this change?"', "<ScoreHistorySection", "<VolatilitySection", 'title="Tension in the data"', 'title="What the data shows"'].map((m) => view.indexOf(m));
  assert.ok(idx.every((n) => n > 0), `all cards present: ${idx}`);
  assert.deepEqual([...idx].sort((a, b) => a - b), idx, "card order");
  assert.ok(!/HowToReadPage|InsightChips|SignalStateChip/.test(view), "How to read, Q&A chips and the separate flags block are gone");
  const quick = rd("../src/components/app/signals/QuickRead.tsx");
  assert.ok(quick.includes("quickReadChips") && quick.includes('href="/how-it-works"') && quick.includes("How is this score calculated?"));
  const why = rd("../src/components/app/signals/WhyDidThisChange.tsx");
  assert.ok(why.includes("c.change ??") && why.includes('data-testid="change-marker"') && !why.includes('?? "•"'), "each line starts with its marker");
  const page = rd("../src/app/(app)/how-it-works/page.tsx");
  assert.ok(page.includes("Common questions") && page.includes("COMMON_QUESTION_GROUPS") && page.includes("<details"));
  const cq = load("../src/lib/common-questions.ts");
  const n = cq.COMMON_QUESTION_GROUPS.reduce((a, g) => a + g.items.length, 0);
  assert.ok(n >= 30 && cq.COMMON_QUESTION_CHIPS.length === 6, `faq items: ${n}`);
  const text = JSON.stringify(cq.COMMON_QUESTION_GROUPS.map((g) => g.items.map((i) => i.a)));
  assert.ok(!/\b\d+(\.\d+)? ?(points|pts)\b|weights? of/i.test(text), "no internal weights");
  const panel = rd("../src/components/app/ask/AskRedixFi.tsx");
  assert.ok(panel.includes("COMMON_QUESTION_CHIPS") && panel.includes('data-testid="common-questions"'));
  // forbidden words in the strings added here (the reviewed Q&A text itself is existing content and is excluded)
  const added = [quick, "Common questions · instant, free", cq.COMMON_QUESTION_NOTE, ...cq.COMMON_QUESTION_CHIPS.filter((q) => !/buy|sell/i.test(q))].join("\n");
  const visible = added.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const hits = visible.match(/\b(buy|sell|target|likely|expected|bullish|bearish|recommend\w*|predict\w*)\b/gi) ?? [];
  assert.deepEqual(hits, [], hits.join(","));
  console.log("page structure, FAQ, markers: ok");
}
