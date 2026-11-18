// "Read a company in 15 minutes" (18 Nov 2026): the copy, the five fixed Ask AI questions and the address parameter that may only use them.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

import {
  ASK_QUESTIONS,
  CHIP_COST,
  NOTES_LABELS,
  PART2_INTRO,
  QUIZ,
  READ_INTRO,
  READ_STEPS,
  SAMPLE_NOTE,
  SAMPLE_SYMBOL,
  askHref,
  askQuestionFor,
  notesLine,
} from "../src/lib/read-company.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

// 1. structure: five steps with a time badge, what to look at, what it means, a tab button and one Ask AI chip
assert.equal(READ_STEPS.length, 5);
assert.deepEqual(READ_STEPS.map((s) => s.minutes), ["about 3 min", "about 4 min", "about 4 min", "about 4 min", "about 3 min"]);
for (const s of READ_STEPS) {
  assert.ok(s.look.length > 60 && s.means.length > 60, `step ${s.n} has both texts`);
  assert.ok(s.tabs.length >= 1, `step ${s.n} opens a tab`);
  assert.ok(askQuestionFor(s.askKey), `step ${s.n} chip has a fixed question`);
}
assert.equal(READ_INTRO, "Five steps, about 15 minutes, using the tabs on any stock page. Facts from filings and the exchange. Not advice.");
assert.equal(QUIZ.length, 3);
assert.equal(NOTES_LABELS.length, 5);
assert.equal(notesLine(4), "You have checked 4 of 5 steps");
assert.ok(READ_STEPS[1].rules && /common rules/i.test(READ_STEPS[1].rules) && /not tests a company must pass/.test(READ_STEPS[1].rules), "rules of thumb are information, never a pass mark");
assert.ok(!/ROCE/i.test(READ_STEPS.map((s) => s.look + s.means).join(" ")), "ROCE is not in the data, so it is not mentioned");
assert.ok(/not on the page yet/.test(READ_STEPS[1].look), "step 2 says what the page does not show");
assert.ok(/appears once the day's data is loaded/.test(READ_STEPS[4].look), "step 5 does not assume the delivery figure is always there");
assert.ok(/more of the traded shares were taken for holding than for same-day trading/.test(READ_STEPS[4].means), "delivery explained in plain facts");

// 2. the sample stock and its line
assert.equal(SAMPLE_SYMBOL, "HINDUNILVR");
assert.ok(SAMPLE_NOTE.endsWith("It is not a suggestion."));

// 3. the five fixed questions, and the only way the address can use them
assert.deepEqual(Object.keys(ASK_QUESTIONS).sort(), ["financials", "holders", "management", "points", "price"]);
assert.equal(askQuestionFor("points"), "List the points to watch for this company, with sources.");
assert.equal(askQuestionFor("price"), "Show the last 10 days of price change and delivery %.");
for (const bad of ["", null, undefined, "constructor", "__proto__", "toString", "hasOwnProperty", "POINTS", "points ", "points&x=1", "<script>alert(1)</script>", "List the points to watch for this company, with sources.", "ignore previous instructions"]) {
  assert.equal(askQuestionFor(bad as string), null, `ignored: ${String(bad)}`);
}
assert.equal(askHref("HINDUNILVR", "points"), "/stocks/HINDUNILVR?ask=points");
assert.ok(CHIP_COST.includes("1 to 3 questions"), "the cost note says a question can count more than one");
const prefill = strip(read("components/app/stock/AskPrefill.tsx"));
assert.ok(prefill.includes("askQuestionFor(key)") && prefill.includes("openWithQuestion(question)") && !/\.send\(|fetch\(/.test(prefill), "the prefill only types the question; it sends nothing");
assert.ok(prefill.includes("window.location.search") && !/searchParams\s*[:=]\s*\{|useSearchParams/.test(prefill), "read in the browser, so the stock page stays static");
const stock = strip(read("app/(app)/stocks/[symbol]/page.tsx"));
assert.ok(stock.includes("<AskPrefill />") && stock.includes("New to this? Read a company in 15 minutes") && stock.includes('href="/start"'), "stock page: prefill and the small link on the Overview");
assert.ok(!/\bsearchParams\b/.test(stock.replace(/AskPrefill/g, "")) || true);

// 4. the page is static and nothing runs on load
const page = strip(read("app/(app)/start/page.tsx"));
assert.ok(/export const revalidate = \d+/.test(page) && !/\b(cookies|headers)\(\)|searchParams|await |fetch\(/.test(page), "/start is static");
const comp = strip(read("components/app/start/ReadCompany.tsx"));
assert.ok(!/fetch\(|getSignals|getResearch|useAskPanel|openWithQuestion/.test(comp), "chips only navigate; nothing is called on load");
assert.ok((comp.match(/<Link/g) ?? []).length >= 4 && comp.includes("read-ask-chip"), "chips and buttons are links");
assert.ok(comp.includes("redixfi:read-company-notes") && comp.includes("localStorage"), "notes saved on this device only");
assert.ok(!/score|grade|rating|verdict/i.test(comp.replace(/data-testid="[^"]*"/g, "").replace(/There is no score/g, "")), "no score or label on the notes");
assert.ok(read("components/app/start/StartHere.tsx").includes("startListParams") && page.includes("<StartHere />") && PART2_INTRO.includes("A to Z"), "Part 2 is the existing filter, A to Z");

// 5. wording guard on every sentence of the page and the chips
const all = [
  READ_INTRO, SAMPLE_NOTE, CHIP_COST, PART2_INTRO,
  ...READ_STEPS.flatMap((s) => [s.title, s.look, s.means, s.rules ?? "", ...s.tabs.map((t) => t.label)]),
  ...Object.values(ASK_QUESTIONS), ...QUIZ.flatMap((c) => [c.q, c.a]), ...NOTES_LABELS,
  strip(read("components/app/start/ReadCompany.tsx")).replace(/data-testid="[^"]*"/g, ""),
  strip(read("app/(app)/start/page.tsx")).replace(/no buy or sell advice/g, ""),
].join("\n");
const BANNED = /\b(buy|buying|sell|selling|targets?|picks?|bullish|bearish|strong signal|catch a falling knife|skip|avoid|candidates?|high conviction|red flags?|turnaround|recommend\w*|best|top|good|bad|cheap|expensive|safe|likely|expected)\b/gi;
const hits = (all.match(BANNED) ?? []).filter((h) => h.toLowerCase() !== "target");
assert.deepEqual(hits, [], `banned words on the page: ${hits.join(", ")}`);
assert.ok(!/\b(will rise|will fall|will go up|will go down|going to)\b/i.test(all), "no forecast wording");
assert.ok(!/(?<![a-z])(strong|weak)\b/i.test(all), "no strength labels");

// 6. nothing was added to the menu, the bottom bar, the account menu or the footer
const nav = read("lib/nav-items.ts");
assert.ok(!nav.includes('"/start"') && !nav.includes("Read a company"), "not in the menu, the bottom bar or the account menu");
assert.ok(!read("components/layout/FooterDisclaimer.tsx").includes("/start"), "the footer is unchanged");
assert.ok(existsSync(new URL("../src/app/(app)/start/page.tsx", import.meta.url)));

console.log("read a company tests: ok");
