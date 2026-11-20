// Free Ask AI limit, web side (21 Nov 2026): 3 live questions a day on any stock, stated on the Pricing page and in the Ask panel.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { PLAN_MATRIX } from "../src/data/plan-features.ts";
import { FREE_ASK_LINE } from "../src/lib/ask-panel/howToAsk.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const ask = PLAN_MATRIX.find((r) => r.feature === "Ask AI")!;
assert.equal(ask.free, "3 questions a day, on any stock");
assert.equal(ask.basic, "10 a day, 200 a month");
assert.equal(ask.pro, "25 a day, 500 a month");
assert.equal(FREE_ASK_LINE, "Free accounts get 3 live questions a day on any stock.");
const panel = read("components/app/ask/AskRedixFi.tsx");
assert.ok(panel.includes('usage.tier === "free" && usage.daily_limit_per_symbol === null') && panel.includes("<QuotaBar label=\"Today\" remaining={left} limit={usage.daily_limit} showTotal />"), "the panel shows the shared daily count for Free");
assert.ok(panel.includes("if (usage.daily_limit_per_symbol !== null)"), "the old per-stock shape is still read");
// no page states the old limit any more
import { readdirSync, statSync } from "node:fs";
function walk(d: string, out: string[] = []): string[] {
  for (const f of readdirSync(d)) { const p = `${d}/${f}`; statSync(p).isDirectory() ? walk(p, out) : /\.(tsx?|json)$/.test(f) && out.push(p); }
  return out;
}
const old = walk(new URL("../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")).filter((p) => /1 question per stock per day|one question per stock per day/i.test(readFileSync(p, "utf8")));
assert.deepEqual(old, [], `old limit text left in: ${old.join(", ")}`);
console.log("free ask limit (web) tests: ok");
