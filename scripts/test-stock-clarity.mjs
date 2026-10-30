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
  "Reading 74 (-4 today, -8 over 5 sessions)", "Delivery 42.9% vs 48.9% 20-day avg", "Volume 1.5x usual", "Volatility rank 1,136 of 2,132 (1 = most volatile)"]);
// a blanked 5-day change (stale baseline) is not shown, and a blank 1-day change is not shown either
assert.equal(quickReadParts({ ...base, delta_5d: null })[0], "Reading 74 (-4 today)");
assert.equal(quickReadParts({ ...base, delta_1d: null, delta_5d: null })[0], "Reading 74");
assert.equal(quickReadParts({ ...base, delta_1d: 0 })[0], "Reading 74 (0 today, -8 over 5 sessions)");
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
  assert.ok(quick.includes("quickReadChips") && quick.includes('href="/how-it-works"') && quick.includes("How is this reading calculated?"));
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

// held / under review stocks: no Quick read card at all (line, chips and link)
{
  const { isHeldStatus, quickReadAllowed: allowed } = load("../src/lib/stock-clarity.ts");
  assert.equal(isHeldStatus("unconfirmed"), true);
  assert.equal(isHeldStatus("review"), true);
  assert.equal(isHeldStatus("confirmed"), false, "a confirmed split is adjusted, not held");
  assert.equal(isHeldStatus(null), false);
  assert.equal(allowed({ ...base, corporate_action_status: "review" }), false);
  const quick = readFileSync(new URL("../src/components/app/signals/QuickRead.tsx", import.meta.url), "utf8");
  const heldAt = quick.indexOf("isHeldStatus(detail.corporate_action?.status)) return null");
  assert.ok(heldAt > 0 && heldAt < quick.indexOf("quickReadChips("), "the held check comes before the chips are built");
  console.log("held stocks: ok");
}

// ---- 2026-10-25 page polish ----
{
  const rd = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
  const { searchTargetBase } = load("../src/lib/seo/stock-symbol.ts");
  // search stays in context: a Research stock page -> Research; Signals stock page and every other page -> Signals
  for (const [p, want] of [["/research/TCS", "/research"], ["/research/M%26M", "/research"], ["/signals/TCS", "/signals"], ["/", "/signals"],
    ["/account/alerts", "/signals"], ["/watchlist", "/signals"], ["/intraday", "/signals"], ["/more", "/signals"], ["/research", "/signals"],
    ["/signals", "/signals"], ["/signals/movers", "/signals"], [null, "/signals"]]) assert.equal(searchTargetBase(p), want, String(p));

  // held stocks: price- and trend-based change-log lines dated before the event are hidden; the rest stays
  const { visibleChangeLog, chartCaption } = load("../src/lib/stock-clarity.ts");
  const log = [
    { date: "2026-10-08", changed_signal: "trend", note: "10-day trend turned negative" },
    { date: "2026-10-08", changed_signal: "volume", note: "volume fell below its recent norm" },
    { date: "2026-10-08", changed_signal: "delivery", note: "delivery signal strengthened" },
    { date: "2026-10-12", changed_signal: "event", note: "event state cleared" },
    { date: "2026-10-20", changed_signal: "trend", note: "after the event" },
  ];
  const held = { status: "review", ex_date: "2026-10-15" };
  assert.deepEqual(visibleChangeLog(log, held).map((e) => e.changed_signal + e.date.slice(-2)), ["delivery08", "event12", "trend20"]);
  assert.equal(visibleChangeLog(log, { status: "confirmed", ex_date: "2026-10-15" }).length, 5, "a confirmed, adjusted stock keeps its log");
  assert.equal(visibleChangeLog(log, null).length, 5);
  assert.equal(chartCaption(held), "Prices before 15 Oct 2026 are not adjusted, so earlier prices are not comparable.");
  assert.equal(chartCaption({ status: "unconfirmed", ex_date: "2026-09-11" }), "Prices before 11 Sep 2026 are not adjusted, so earlier prices are not comparable.");
  assert.equal(chartCaption({ status: "confirmed", ex_date: "2026-09-11" }), null);
  assert.equal(chartCaption(null), null);

  // alert thresholds
  const { thresholdError, directionLabel } = load("../src/lib/alert-thresholds.ts");
  for (const [m, v] of [["delivery", 890], ["delivery", 317], ["delivery", -1], ["score", 101], ["volume", 0], ["volume", 101], ["price", 0], ["price", -4], ["price", NaN]])
    assert.ok(thresholdError(m, v), `${m} ${v}`);
  for (const [m, v] of [["delivery", 0], ["delivery", 100], ["score", 55], ["volume", 2.5], ["price", 0.5]]) assert.equal(thresholdError(m, v), null, `${m} ${v}`);
  assert.equal(thresholdError("delivery", 890), "Delivery % must be between 0 and 100.");
  assert.equal(directionLabel("above"), "crosses above");
  assert.equal(directionLabel("below"), "crosses below");

  // red-flag heading
  const { RED_FLAG_CATEGORY_LABELS } = load("../src/lib/redFlagCategories.ts");
  assert.equal(RED_FLAG_CATEGORY_LABELS.statutory_dues_dispute, "Statutory dues in dispute");
  assert.equal(RED_FLAG_CATEGORY_LABELS.default_or_covenant, "Default / Covenant Breach");
  assert.equal(RED_FLAG_CATEGORY_LABELS.fraud_or_investigation, "Investigation or enforcement mention");

  // structure
  const wl = rd("../src/components/app/watchlist/WatchlistMainView.tsx");
  assert.ok(wl.includes("showBehavior") && wl.includes('sm:hidden') && wl.includes("Remove"), "watchlist: Behavior only with data, Remove reachable on phones");
  const alerts = rd("../src/components/app/account/MorningBriefChannelsCard.tsx");
  assert.ok(alerts.includes("return null") && !/Coming soon/.test(alerts.replace(/\/\/.*$/gm, "")), "Morning Brief block hidden until live");
  const rs = rd("../src/components/app/research/ResearchSearch.tsx");
  assert.ok(rs.includes("Recently viewed") && rs.includes("Your watchlist") && rs.includes("Stocks you open will appear here."));
  const ex = rd("../src/components/app/signals/SignalsExplorer.tsx");
  assert.ok(ex.includes('"abs_delta_1d"') && ex.includes("SignalMobileRow") && ex.includes('"name"'), "list: new default sort, mobile list, other sorts kept");
  const hdr = rd("../src/components/layout/HeaderSearch.tsx");
  assert.ok(hdr.includes("searchTargetBase(pathname)") && hdr.includes('label: "Signals"') && hdr.includes('label: "Research"'));
  const cmp = rd("../src/components/app/signals/CompareResultCard.tsx");
  assert.ok(cmp.includes("sticky left-0") && cmp.includes("Swipe") && cmp.includes("shortName("), "compare: sticky metric column, swipe hint, short names");
  const home = rd("../src/app/(app)/page.tsx");
  assert.ok(home.includes("columns-1") && home.includes("break-inside-avoid"), "home: masonry cards, no empty gaps");
  const ev = rd("../src/components/app/EventRiskCard.tsx");
  assert.ok(ev.includes("session_date") && ev.includes("formatShortDate(n.published_at)"), "event card: one window, a date on each item");
  const intr = rd("../src/components/app/intraday/IntradayScreen.tsx");
  assert.ok(!/Risk-off tone/.test(intr) && intr.includes("breadth_line"), "risk-off label replaced by a breadth line");
  const rec = rd("../src/components/app/intraday/PostmarketRecap.tsx");
  assert.ok(rec.includes("its 20-day average") && rec.includes("showVolume"), "volume anomalies show the multiple of the 20-day average");

  // forbidden words in the strings added here
  const added = [chartCaption(held), "Recently viewed Your watchlist Stocks you open will appear here. Add stocks to your watchlist to find them here. Log in to see your watchlist here.",
    "Out of range Swipe Statutory dues in dispute Biggest reading change (up or down) Delivery % must be between 0 and 100. Price must be above 0.",
    "More stocks fell than rose volume its 20-day average session of high-severity (market or sector-wide)"].join("\n");
  const hits = added.match(/\b(buy|sell|target|likely|expected|bullish|bearish|recommend\w*|predict\w*)\b/gi) ?? [];
  assert.deepEqual(hits, []);
  console.log("page polish: ok");
}

// ---- follow-up: fundamentals date, recap basis ----
{
  const rd = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
  const { formatYmd } = load("../src/lib/format.ts");
  assert.equal(formatYmd("2026-09-15"), "15 Sep 2026");
  assert.equal(formatYmd("2026-10-05T10:00:00"), "5 Oct 2026");
  assert.equal(formatYmd(null), "");
  assert.equal(formatYmd("not a date"), "");
  const fp = rd("../src/components/app/research/FundamentalsPanels.tsx");
  assert.ok(fp.includes("Fundamentals as of") && fp.includes('data-testid="fundamentals-as-of"') && fp.indexOf("fundamentals-as-of") < fp.indexOf("Is it growing?"), "date shown above the growth and valuation blocks");
  const cmp = rd("../src/components/app/signals/CompareResultCard.tsx");
  assert.ok(cmp.includes("Fundamentals as of") && cmp.includes("fundamentals_as_of"), "compare table row");
  const added = "Fundamentals as of the company's own latest record is days old official close";
  assert.deepEqual(added.match(/\b(buy|sell|target|likely|expected|bullish|bearish|recommend\w*|predict\w*)\b/gi) ?? [], []);
  console.log("follow-up checks: ok");
}
