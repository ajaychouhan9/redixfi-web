// Ask AI "how to ask" empty state and table notes (Part B, stage 1, 19 Nov 2026).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CHIP_COST_LINE, HOW_TO_ASK_LINE, HOW_TO_ASK_SAMPLE_SYMBOL, daysAvailableNote, howToAskGroups } from "../src/lib/ask-panel/howToAsk.ts";
import { isSafeAskSuggestion } from "../src/lib/ask-panel/starterQuestions.ts";

const BANNED = /\b(buy|sell|target|picks?|bullish|bearish|strong signal|falling knife|skip|avoid|candidates?|high conviction|red flag|turnaround|top stocks|best stocks|rating|verdict)\b/i;

assert.equal(HOW_TO_ASK_LINE, "Name the companies, the numbers and the days.");
assert.ok(CHIP_COST_LINE.includes("1 question") && !/1 to 3|2 or 3/.test(CHIP_COST_LINE), "cost copy matches the metering rule (one question)");

for (const sym of [null, "TCS"]) {
  const groups = howToAskGroups(sym);
  assert.deepEqual(groups.map((g) => g.id), ["company", "documents", "numbers", "compare"]);
  for (const g of groups) {
    assert.ok(g.chips.length >= 2, `group ${g.id} has chips`);
    for (const text of [g.title, g.hint, ...g.chips]) assert.ok(!BANNED.test(text), `banned word in: ${text}`);
    for (const c of g.chips) assert.ok(isSafeAskSuggestion(c), `unsafe suggestion: ${c}`);
  }
  const sample = sym ?? HOW_TO_ASK_SAMPLE_SYMBOL;
  assert.ok(groups[0].chips[0].includes(sample) && groups[1].chips[0].includes(sample), "company and document chips name the company");
}

// days note
const t = (n: number, extra: object = {}) => ({ rows: new Array(n).fill({}), row_count: n, ...extra });
assert.equal(daysAvailableNote("show the last 5 days close for INFY", t(4)), "5 days asked, 4 available");
assert.equal(daysAvailableNote("show the last 5 days close for INFY", t(5)), null);
assert.equal(daysAvailableNote("past 1 day price", t(0)), "1 day asked, 0 available");
assert.equal(daysAvailableNote("close price for INFY", t(3)), null, "no number of days in the question: no note");
assert.equal(daysAvailableNote("anything", t(3, { requested_days: 10 })), "10 days asked, 3 available", "server number wins");
assert.equal(daysAvailableNote("last 5 days", null), null);

// the table renderer: date column from the server columns, scrolls inside the bubble, first column never clipped
const src = readFileSync(new URL("../src/components/app/ask/AskRedixFi.tsx", import.meta.url), "utf8");
assert.ok(src.includes("daysAvailableNote(") && src.includes('data-testid="how-to-ask"') && src.includes("sticky left-0"), "wired into the panel");
assert.ok(!src.includes("w-full min-w-[560px]"), "old fixed min width removed");
import { isPaidEntitled } from "../src/lib/entitlements.ts";
assert.equal(isPaidEntitled({ tier: "free" }), false);
assert.equal(isPaidEntitled({ tier: "free", is_pro_trial: true }), true, "the Pro trial may download");
assert.ok(isPaidEntitled({ tier: "basic" }) && isPaidEntitled({ tier: "pro" }) && isPaidEntitled({ tier: "founding" }));
assert.equal(isPaidEntitled(null), false);
assert.ok(src.includes("isPaidEntitled(user)") && src.includes("AddToShortlistButton") && src.includes('data-testid="ask-cost-line"'), "CSV gate, shortlist button and cost line wired");
const btn = readFileSync(new URL("../src/components/app/ask/AddToShortlistButton.tsx", import.meta.url), "utf8");
assert.ok(btn.includes("addToWatchlist(") && btn.includes("Add to shortlist") && !BANNED.test(btn.replace(/"[^"]*"/g, "")), "uses the watchlist");
console.log("ask how-to tests ok");
