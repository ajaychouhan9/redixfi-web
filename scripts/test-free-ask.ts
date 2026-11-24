// Ask AI limits, web side (24 Nov 2026): Free 5 a day shared by chat and reports; Basic and Pro have a chat pool and a report pool. Stated on the Pricing page and in the Ask panel.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { PLAN_MATRIX } from "../src/data/plan-features.ts";
import { FREE_ASK_LINE } from "../src/lib/ask-panel/howToAsk.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const ask = PLAN_MATRIX.find((r) => r.feature === "Ask AI chat")!;
assert.equal(ask.free, "5 questions a day, shared with reports");
assert.equal(ask.basic, "150 a month, up to 10 a day");
assert.equal(ask.pro, "400 a month, up to 25 a day");
const rep = PLAN_MATRIX.find((r) => r.feature === "Ask AI reports")!;
assert.equal(rep.free, "1 stock, 5 questions, from the same 5 a day");
assert.equal(rep.basic, "150 questions a month");
assert.equal(rep.pro, "350 questions a month");
assert.ok(PLAN_MATRIX.some((r) => r.feature === "Question packs (add-ons)" && r.basic.includes("chat and in reports")), "add-ons work in chat and in reports");
assert.ok(PLAN_MATRIX.some((r) => r.feature === "When questions reset" && r.basic.includes("renewal date") && r.basic.includes("nothing carries over")), "pools reset on the renewal date, no rollover");
assert.equal(FREE_ASK_LINE, "Free accounts get 5 questions a day, shared by chat and reports.");
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

const old3 = walk(new URL("../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")).filter((p) => /3 (live )?questions a day|10 a day, 200 a month|25 a day, 500 a month/i.test(readFileSync(p, "utf8")));
assert.deepEqual(old3, [], `old plan numbers left in: ${old3.join(", ")}`);
console.log("free ask limit (web) tests: ok");
