// Shortlist Lab, Learn tab (21 Nov 2026): seven named steps, every example reading shown in full, one Ask AI button, the five fixed questions
// and the address parameter that may only use them. Replaces the 18 Nov test of the old 15-minute page.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

import { ASK_QUESTIONS, SAMPLE_SYMBOL, askHref, askQuestionFor } from "../src/lib/read-company.ts";
import { findLine, READY_LINE, FIVE_QUESTIONS, LEARN_FIELDS, LEARN_INTRO, LEARN_STEPS, STEP_NAMES } from "../src/lib/learn.ts";
import { PV_FILTERS, RULES, STEPS, VOL_LABEL } from "../src/lib/stock-check.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

// 1. seven steps, the same names on both tabs, one plain line each
assert.deepEqual(STEP_NAMES, ["Size and trading", "Earnings", "Returns", "Debt and pledge", "Price movement", "Price you pay", "Price and volume"]);
assert.deepEqual(STEPS.map((s) => s.title), STEP_NAMES, "My rules uses the same step names");
assert.deepEqual(STEPS.map((s) => s.line), LEARN_STEPS.map((s) => s.line), "and the same plain line under each");
for (const s of LEARN_STEPS) {
  assert.ok(s.line.length > 20 && s.line.length < 120 && s.line.endsWith("."), `step ${s.n} has one plain line`);
  assert.ok(s.look.length > 40 && s.means.length > 40, `step ${s.n} has both texts`);
  assert.ok(s.example.q.length > 20 && s.example.a.length > 40, `step ${s.n} has a full example reading`);
}
assert.equal(findLine(["Overview"]), "Find any stock in Screener, open its page and look in the Overview tab.");
assert.equal(findLine(["Annual report", "Insiders & promoters"]), "Find any stock in Screener, open its page and look in the Annual report and Insiders & promoters tabs.");
assert.equal(READY_LINE, "Ready to filter? Open the My rules tab to shortlist stocks as per your rule.");
{
  // every step points at real stock-page tab names
  const real = new Set(["Overview", "Annual report", "Concall", "Points to watch", "News", "Insiders & promoters", "Rewind", "Ask AI"]);
  for (const st of LEARN_STEPS) for (const t of st.tabs) assert.ok(real.has(t), `${st.name}: ${t} is not a stock-page tab`);
}

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
assert.ok(stock.includes("<AskPrefill />") && !stock.includes("Learn the 5 questions") && !stock.includes("read-company-link") && !stock.includes('href="/start"') && !stock.includes('href="/stock-check"'), "the stock page has no learn-the-rule link (removed 21 Nov 2026)");

// 3. the Learn tab: what was removed, what is there, nothing runs on load
const learn = strip(read("components/app/stock-check/LearnTab.tsx"));
for (const gone of ["Show the reading", "Hide the reading", "read-sample", "My notes", "read-note-box", "Open Points to watch", "Open News", "points-to-watch", "read-tab-button", "read-ask-chip"]) {
  assert.ok(!learn.includes(gone), `removed from Learn: ${gone}`);
}
assert.ok(!existsSync(new URL("../src/components/app/start/ReadCompany.tsx", import.meta.url)), "the old page component is gone");
assert.ok(!/fetch\(|getSignals|getResearch|localStorage/.test(learn), "nothing is fetched or stored on load");
assert.ok(learn.includes("learn-example") && learn.includes("s.example.a") && !/useState|aria-expanded/.test(learn), "every example reading is shown in full, with no toggle");
// 23 Nov 2026: the long "5 questions with an Ask AI button" card is gone from the Learn tab
for (const gone of ["learn-try", "openWithStocks", "Try these questions", "The 5 questions", "learn-questions"]) assert.ok(!learn.includes(gone), `removed from Learn: ${gone}`);
// the Learn tab explains every step AND every field of My rules, with an example
const dot = (t: string) => t.replace(/\.$/, "");
for (const d of RULES) {
  if (d.step === 6) continue;
  assert.ok((LEARN_FIELDS[d.step + 1] ?? []).some((f) => dot(f.name) === dot(d.label)), `Learn explains the field: ${d.label}`);
}
assert.ok(LEARN_FIELDS[5].some((f) => f.name === VOL_LABEL && /calmer/i.test(f.text) && /more active/i.test(f.text)), "Learn explains the price-swings option");
for (const f of PV_FILTERS) assert.ok(LEARN_FIELDS[7].some((x) => x.name === f.label), `Learn explains the Price and volume field: ${f.label}`);
for (const [n, list] of Object.entries(LEARN_FIELDS)) for (const f of list) assert.ok(f.text.length > 30 && f.example.length > 20, `step ${n}: ${f.name} has a text and an example`);
assert.ok(learn.includes("LEARN_FIELDS[s.n]") && learn.includes("Each field in this step"), "the Learn tab shows the fields");
const tabs = strip(read("components/app/stock-check/LabTabs.tsx"));
assert.ok(tabs.includes('role="tablist"') && tabs.includes("LEARN_TAB") && tabs.includes("RULES_TAB") && tabs.includes("#my-rules"), "two tabs, Learn and My rules");
const page = strip(read("app/(app)/shortlist-lab/page.tsx"));
assert.ok(/export const revalidate = \d+/.test(page) && !/\b(cookies|headers)\(\)|searchParams|await |fetch\(/.test(page), "/shortlist-lab is static");
assert.ok(page.includes("<LabTabs />") && tabs.includes("<ShortlistLadder />") && !tabs.includes("PART2"), "the second tab is the shortlist ladder, with no long intro above it");
assert.ok(existsSync(new URL("../src/app/(app)/shortlist-lab/page.tsx", import.meta.url)) && !existsSync(new URL("../src/app/(app)/stock-check/page.tsx", import.meta.url)), "the page lives at /shortlist-lab");

// 4. wording guard on every sentence of the Learn tab
const all = [
  LEARN_INTRO, findLine(["Overview"]), READY_LINE,
  ...Object.values(LEARN_FIELDS).flat().flatMap((f) => [f.name, f.text, f.example]),
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
