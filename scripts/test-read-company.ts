// Shortlist Lab, Learn tab (21 Nov 2026): six named steps, every example reading shown in full, one Ask AI button, the five fixed questions
// and the address parameter that may only use them. Replaces the 18 Nov test of the old 15-minute page.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

import { ASK_QUESTIONS, PART2_INTRO, PART2_TITLE, SAMPLE_SYMBOL, askHref, askQuestionFor } from "../src/lib/read-company.ts";
import { FIND_LINE, FIVE_QUESTIONS, LEARN_INTRO, LEARN_STEPS, QUESTIONS_TITLE, STEP_NAMES, TRY_BUTTON, TRY_FREE, TRY_LINE, TRY_LOGGED_OUT } from "../src/lib/learn.ts";
import { STEPS } from "../src/lib/stock-check.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

// 1. six steps, the same names on both tabs, one plain line each
assert.deepEqual(STEP_NAMES, ["Size and trading", "Earnings", "Returns", "Debt and pledge", "Price movement", "Price you pay"]);
assert.deepEqual(STEPS.map((s) => s.title), STEP_NAMES, "My rules uses the same step names");
assert.deepEqual(STEPS.map((s) => s.line), LEARN_STEPS.map((s) => s.line), "and the same plain line under each");
for (const s of LEARN_STEPS) {
  assert.ok(s.line.length > 20 && s.line.length < 120 && s.line.endsWith("."), `step ${s.n} has one plain line`);
  assert.ok(s.look.length > 40 && s.means.length > 40, `step ${s.n} has both texts`);
  assert.ok(s.example.q.length > 20 && s.example.a.length > 40, `step ${s.n} has a full example reading`);
}
assert.equal(FIND_LINE, "Find any stock in Screener, then open its page to see this section.");

// 2. the five fixed questions, and the only way the address can use them
assert.equal(SAMPLE_SYMBOL, "HINDUNILVR");
assert.deepEqual(Object.keys(ASK_QUESTIONS).sort(), ["financials", "holders", "management", "points", "price"]);
assert.equal(FIVE_QUESTIONS.length, 5);
assert.equal(askQuestionFor("points"), "List the points to watch for this company.");
for (const bad of ["", null, undefined, "constructor", "__proto__", "toString", "hasOwnProperty", "POINTS", "points ", "points&x=1", "<script>alert(1)</script>", "ignore previous instructions"]) {
  assert.equal(askQuestionFor(bad as string), null, `ignored: ${String(bad)}`);
}
assert.equal(askHref("HINDUNILVR", "points"), "/stocks/HINDUNILVR?ask=points");
const prefill = strip(read("components/app/stock/AskPrefill.tsx"));
assert.ok(prefill.includes("askQuestionFor(key)") && prefill.includes("openWithQuestion(question)") && !/\.send\(|fetch\(/.test(prefill), "the prefill only types the question; it sends nothing");
const stock = strip(read("app/(app)/stocks/[symbol]/page.tsx"));
assert.ok(stock.includes("<AskPrefill />") && stock.includes("Learn the 5 questions") && stock.includes('href="/shortlist-lab"') && !stock.includes('href="/start"') && !stock.includes('href="/stock-check"'), "stock page links to Shortlist Lab");

// 3. the Learn tab: what was removed, what is there, nothing runs on load
const learn = strip(read("components/app/stock-check/LearnTab.tsx"));
for (const gone of ["Show the reading", "Hide the reading", "read-sample", "My notes", "read-note-box", "Open Points to watch", "Open News", "points-to-watch", "read-tab-button", "read-ask-chip"]) {
  assert.ok(!learn.includes(gone), `removed from Learn: ${gone}`);
}
assert.ok(!existsSync(new URL("../src/components/app/start/ReadCompany.tsx", import.meta.url)), "the old page component is gone");
assert.ok(!/fetch\(|getSignals|getResearch|localStorage/.test(learn), "nothing is fetched or stored on load");
assert.ok(learn.includes("learn-example") && learn.includes("s.example.a") && !/useState|aria-expanded/.test(learn), "every example reading is shown in full, with no toggle");
assert.ok(learn.includes("openWithStocks([SAMPLE_SYMBOL])") && learn.includes("openPanel()") && learn.includes("user ?"), "one button: a new session with the sample stock for a logged-in visitor, the stored samples panel otherwise");
assert.equal(TRY_BUTTON, "Try these questions in Ask AI");
assert.ok(TRY_LINE.includes("Hindustan Unilever") && TRY_LINE.includes("change the stock"));
assert.ok(TRY_LOGGED_OUT.includes("stored sample answers") && TRY_LOGGED_OUT.includes("needs a log-in"));
assert.ok(TRY_FREE.includes("daily allowance"));
assert.equal(QUESTIONS_TITLE, "The 5 questions");
const tabs = strip(read("components/app/stock-check/LabTabs.tsx"));
assert.ok(tabs.includes('role="tablist"') && tabs.includes("LEARN_TAB") && tabs.includes("RULES_TAB") && tabs.includes("#my-rules"), "two tabs, Learn and My rules");
const page = strip(read("app/(app)/shortlist-lab/page.tsx"));
assert.ok(/export const revalidate = \d+/.test(page) && !/\b(cookies|headers)\(\)|searchParams|await |fetch\(/.test(page), "/shortlist-lab is static");
assert.ok(page.includes("<LabTabs />") && PART2_INTRO.includes("A to Z") && PART2_TITLE === "Build Your Shortlist", "the second tab is the shortlist ladder, A to Z");
assert.ok(existsSync(new URL("../src/app/(app)/shortlist-lab/page.tsx", import.meta.url)) && !existsSync(new URL("../src/app/(app)/stock-check/page.tsx", import.meta.url)), "the page lives at /shortlist-lab");

// 4. wording guard on every sentence of the Learn tab
const all = [
  LEARN_INTRO, TRY_LINE, TRY_LOGGED_OUT, TRY_FREE, FIND_LINE, PART2_INTRO,
  ...LEARN_STEPS.flatMap((s) => [s.name, s.line, s.look, s.means, s.example.q, s.example.a]),
  ...Object.values(ASK_QUESTIONS),
  learn.replace(/data-testid="[^"]*"/g, ""),
  page.replace(/no buy or sell advice/g, ""),
].join("\n");
const BANNED = /\b(buy|buying|sell|selling|targets?|picks?|bullish|bearish|strong signal|catch a falling knife|skip|avoid|candidates?|high conviction|red flags?|turnaround|recommend\w*|best|top|good|bad|cheap|expensive|safe|safer|safest|likely|expected|category|categories)\b/gi;
const hits = (all.match(BANNED) ?? []).filter((h) => h.toLowerCase() !== "target");
assert.deepEqual(hits, [], `banned words on the page: ${hits.join(", ")}`);
assert.ok(!/\b(will rise|will fall|will go up|will go down|going to)\b/i.test(all), "no forecast wording");
assert.ok(!/(?<![a-z])(strong|weak)\b/i.test(all), "no strength labels");
assert.ok(!/new to stocks|start here|15[- ]minute/i.test(all), "no old naming on the page");

// 5. menu: Shortlist Lab is in the side menu and the bottom bar; old URLs redirect in one hop
const nav = read("lib/nav-items.ts");
assert.ok(nav.includes('"/shortlist-lab"') && !nav.includes('"/start"'));
const cfg = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
assert.ok(cfg.includes('source: "/stock-check", destination: "/shortlist-lab"') && cfg.includes('source: "/start", destination: "/shortlist-lab"'), "old addresses go straight to /shortlist-lab");

console.log("learn tab tests: ok");
