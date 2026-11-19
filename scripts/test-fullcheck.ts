// "Run full check on my shortlist" (Ask AI Part B stages 3-4): copy, wording guard, wiring.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as C from "../src/lib/fullcheck-copy.ts";

const BANNED = /\b(buy|sell|target|picks?|bullish|bearish|strong signal|falling knife|skip|avoid|candidates?|high conviction|red flag|turnaround|top stocks|best stocks|rating|verdict|score)\b/i;
const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");

for (const [k, v] of Object.entries(C)) {
  if (typeof v === "string") assert.ok(!BANNED.test(v), `banned word in ${k}`);
}
assert.equal(C.FULL_CHECK_FOOTER, "Facts from filings. Not investment advice.");
assert.ok(C.FULL_CHECK_NO_RANK.includes("does not rank them"), "never ranks the shortlist");
assert.equal(C.FULL_CHECK_BUTTON, "Run full check on my shortlist");
assert.equal(C.costLine(4, [{ cost: 3, cached: false }, { cost: 1, cached: false }]), "This run will use 4 questions from your plan.");
assert.equal(C.costLine(1, [{ cost: 1, cached: true }]), "This run will use 1 question from your plan. 1 of 1 has a stored result that is still current, so it costs less.");
assert.equal(C.progressLine("Reading concall and annual report", 40), "Reading concall and annual report, 40%");
assert.equal(C.progressLine("x", 140), "x, 100%");
assert.ok(!/1 to 3|2 or 3/.test(C.FULL_CHECK_INTRO));

const panel = read("components/app/fullcheck/FullCheckPanel.tsx");
assert.ok(panel.includes("estimateFullCheck(") && panel.includes("startFullCheck(") && panel.includes("listFullCheckRuns(") && panel.includes("POLL_MS"), "estimate before start, resume and polling");
assert.ok(panel.includes("downloadFullCheckPdf") && panel.includes("downloadFullCheckCsv") && panel.includes("fc-locked"), "downloads and the Free lock");
assert.ok(panel.indexOf("estimateFullCheck(") < panel.indexOf("startFullCheck("), "cost is fetched before the run starts");
assert.ok(!/\.sort\(|rank/i.test(panel.replace(/FULL_CHECK_NO_RANK/g, "")), "the panel never sorts or ranks the shortlist");
assert.ok(read("app/(app)/full-check/page.tsx").includes("index: false"), "personal page is noindex");
assert.ok(read("components/app/watchlist/WatchlistMainView.tsx").includes("/full-check") && read("components/app/ask/AskRedixFi.tsx").includes("ask-full-check-link"), "button on the watchlist page and in Ask AI");
console.log("full check tests ok");
