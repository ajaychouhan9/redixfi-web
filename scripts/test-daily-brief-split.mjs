import assert from "node:assert/strict";
import { splitDailyBriefSummary, splitDailyBriefBullets } from "../src/lib/dailyBriefSplit.ts";

function check(body, expectedSummary) {
  assert.equal(splitDailyBriefSummary(body, 1).summary, expectedSummary);
}

const productionShape = "The Nikkei 225 fell 0.03%. The market closed with more tracked sectors advancing than declining. However, global indices showed a downward trend, with the Nifty, S&P 500, Nasdaq, and Nikkei all closing down.";
check(productionShape, "The Nikkei 225 fell 0.03%.");
assert.ok(!splitDailyBriefSummary(productionShape).summary.startsWith("03%."));

for (const sentence of [
  "The stock fell 0.5%.",
  "The index gained 12.5%.",
  "The value increased 99.99%.",
  "The ratio was 3.14%.",
  "Pi was 3.14.",
  "The price was ₹123.45.",
  "The price was $12.50.",
]) {
  check(`${sentence} The market closed.`, sentence);
}

check("The market closed. Global indices declined.", "The market closed.");
check("Gold increased. Crude oil fell.", "Gold increased.");

const productionBrief =
  "Overnight, GIFT Nifty fell 0.14%; the S&P 500 rose 0.32%; the Nasdaq rose 0.66%. " +
  "GIFT Nifty moved -0.14%; 14 of 48 tracked sectors closed higher and 34 closed lower. " +
  "Stat of the day: MADHAVIPL's composite score gained 39 points today, the largest single-day composite move measured across the tracked universe.";
const bullets = splitDailyBriefBullets(productionBrief, 2);
assert.deepEqual(bullets.visible, [
  "Overnight, GIFT Nifty fell 0.14%; the S&P 500 rose 0.32%; the Nasdaq rose 0.66%.",
  "GIFT Nifty moved -0.14%; 14 of 48 tracked sectors closed higher and 34 closed lower.",
]);
assert.deepEqual(bullets.rest, [
  "Stat of the day: MADHAVIPL's composite score gained 39 points today, the largest single-day composite move measured across the tracked universe.",
]);

const shortBrief = "Measured data for today was limited.";
assert.deepEqual(splitDailyBriefBullets(shortBrief), { visible: [shortBrief], rest: [] });

console.log("daily brief splitter: 13 passed, 0 failed");
