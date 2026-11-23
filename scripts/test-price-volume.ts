// Shortlist Lab, "Price and volume" step (22 Nov 2026): four optional filters about past prices and volume. The counts in the browser, the parameters sent to the server,
// saved rules coming back, the plain-language labels (what it tells you / what it does not tell you) and the owner's banned words.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  COMMON_RULES, EMPTY_RULES, PV_FILTERS, RULES, STEPS, avgOn, cardValues, chgOn, countAfter, countsByStep, describeRules, fromParams, hasAnyRule, ruleProblem, sameRules,
  toParams, typicalRules, validValue, type LadderData, type Rules,
} from "../src/lib/stock-check.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
const withRules = (p: Partial<Rules>): Rules => ({ ...EMPTY_RULES, ...p });

// ---- the counts file carries seven new columns, appended: h52 r1 r3 r6 a50 a200 vd
const COLS = ["mc", "eps", "py", "sgq", "pgq", "sg3", "pg3", "roe", "roce", "rna", "de", "pl", "vol", "vr", "dl", "pe", "gs", "h52", "r1", "r3", "r6", "a50", "a200", "vd"];
const row = (o: Record<string, number | null>): (number | null)[] => COLS.map((c) => (c in o ? o[c] : null));
const data: LadderData = {
  version: 1, as_of: "2026-11-20", fund_quarter_end: null, built_at: "x", cols: COLS,
  rows: [
    row({ mc: 5000, roe: 20, h52: 3, r1: 4, r3: 12, r6: 30, a50: 1, a200: 1, vd: 2.5 }),
    row({ mc: 5000, roe: 20, h52: 15, r1: -2, r3: 8, r6: 10, a50: 1, a200: 0, vd: 1.0 }),
    row({ mc: 5000, roe: 20, h52: 40, r1: -9, r3: -20, r6: -25, a50: 0, a200: 0, vd: 0.4 }),
    row({ mc: 5000, roe: 20 }),                                             // no price history: every Price and volume figure is blank
    row({ mc: 300, roe: 5, h52: 1, r1: 6, r3: 20, r6: 50, a50: 1, a200: 1, vd: 4 }),
  ],
};
assert.equal(countAfter(data, EMPTY_RULES, 6), 5, "no rules: every stock");
// a) price change: a period AND a number
assert.equal(countAfter(data, withRules({ chgMonths: "3", chgMin: "10" }), 6), 2);
assert.equal(countAfter(data, withRules({ chgMonths: "1", chgMin: "0" }), 6), 2);
assert.equal(countAfter(data, withRules({ chgMonths: "6", chgMin: "-30" }), 6), 4, "a stock with no figure never matches, a negative minimum is allowed");
assert.equal(countAfter(data, withRules({ chgMonths: "3" }), 6), 5, "a period alone is not a rule");
assert.equal(countAfter(data, withRules({ chgMin: "10" }), 6), 5, "a number alone is not a rule");
assert.equal(chgOn(withRules({ chgMonths: "3", chgMin: "10" })), true);
assert.equal(chgOn(withRules({ chgMonths: "3", chgMin: "abc" })), false);
assert.equal(chgOn(withRules({ chgMonths: "3", chgMin: "-150" })), false, "below -100 % is not a price change");
assert.equal(chgOn(withRules({ chgMonths: "" as never, chgMin: "10" })), false);
for (const bad of ["0", "2", "12", "1 ", "0.5"]) assert.equal(chgOn(withRules({ chgMonths: bad as never, chgMin: "10" })), false, `no period of ${bad} months (nothing shorter than 1 month)`);
// b) within X % of the 52-week high
assert.equal(countAfter(data, withRules({ near52: "5" }), 6), 2);
assert.equal(countAfter(data, withRules({ near52: "20" }), 6), 3);
assert.equal(validValue(RULES.find((d) => d.key === "near52")!, "100"), true);
assert.equal(validValue(RULES.find((d) => d.key === "near52")!, "101"), false);
assert.equal(validValue(RULES.find((d) => d.key === "near52")!, "-1"), false);
assert.ok(ruleProblem(RULES.find((d) => d.key === "near52")!, "101")?.includes("This is not used yet."));
// c) above the 50-day or 200-day average (the user picks one)
assert.equal(countAfter(data, withRules({ avgDays: "50" }), 6), 3);
assert.equal(countAfter(data, withRules({ avgDays: "200" }), 6), 2);
assert.equal(avgOn(withRules({ avgDays: "100" as never })), false);
// d) the latest day's volume against its 20-day average
assert.equal(countAfter(data, withRules({ volDay: "1.5" }), 6), 2);
assert.equal(countAfter(data, withRules({ volDay: "0" }), 6), 4);
// all four together, and the step count
const all = withRules({ chgMonths: "3", chgMin: "10", near52: "10", avgDays: "200", volDay: "2" });
assert.equal(countAfter(data, all, 6), 2);
assert.equal(countAfter(data, all, 5), 5, "the Price and volume rules count only from step 7");
assert.deepEqual(countsByStep(data, all), [5, 5, 5, 5, 5, 5, 2]);
assert.equal(countsByStep(data, all).length, 7);
// an older counts file with none of the new columns matches nothing for a new rule, and everything for no rule
const old: LadderData = { ...data, cols: COLS.slice(0, 17), rows: data.rows.map((r) => r.slice(0, 17)) };
assert.equal(countAfter(old, withRules({ chgMonths: "3", chgMin: "10" }), 6), 0);
assert.equal(countAfter(old, EMPTY_RULES, 6), 5);

// ---- what is sent to the server, and what comes back from a saved rule
assert.deepEqual(toParams(all), { price_change_months: 3, price_change_min: 10, from_52w_max: 10, above_avg_days: 200, volume_day_min: 2 });
assert.deepEqual(toParams(withRules({ chgMonths: "6" })), {}, "a period alone is not sent");
assert.deepEqual(toParams(withRules({ chgMonths: "1", chgMin: "-5" })), { price_change_months: 1, price_change_min: -5 });
assert.deepEqual(fromParams(toParams(all) as Record<string, unknown>), all, "a saved rule comes back as it was");
assert.deepEqual(fromParams({ price_change_months: 2, price_change_min: 5, above_avg_days: 20 } as Record<string, unknown>), EMPTY_RULES, "a period or average the server does not accept is ignored");
assert.ok(hasAnyRule(withRules({ avgDays: "50" })) && hasAnyRule(withRules({ chgMonths: "3", chgMin: "1" })) && !hasAnyRule(withRules({ chgMonths: "3" })));
assert.ok(sameRules(withRules({ chgMonths: "3" }), EMPTY_RULES), "an unused period does not count as a change");
assert.deepEqual(describeRules(all), [
  "Price within this % of its 52-week high 10 %", "Latest day's volume at least 2 times its 20-day average", "Price change over 3 months at least 10%", "Price above its 200-day average",
]);
// the card of a listed stock shows the figure behind each rule
const cv = cardValues(all, { ret_3m: 12.34, pct_below_52w_high: 3.2, sma200_above: true, vol_day_x: 2.56 });
assert.deepEqual(cv.map((c) => c.label), ["Price change, 3 months", "Below 52-week high", "Above 200-day average", "Latest volume vs 20-day average"]);
assert.deepEqual(cv.map((c) => c.value), ["12.3%", "3.2%", "Yes", "2.6x"]);
assert.equal(cardValues(withRules({ avgDays: "50" }), { sma50_above: null })[0].value, "Not available");

// ---- Fill typical values: only numbers from published methods; the four new fields have none, so they stay blank
const typical = typicalRules();
assert.deepEqual(typical, COMMON_RULES);
for (const k of ["chgMonths", "chgMin", "near52", "avgDays", "volDay"] as const) assert.equal(typical[k], "", `${k} stays blank`);
assert.equal(typical.roe, "15");

// ---- the step: seventh, named, with plain copy
assert.equal(STEPS.length, 7);
assert.equal(STEPS[6].title, "Price and volume");
assert.ok(STEPS[6].line.length < 120);
assert.equal(PV_FILTERS.length, 4);
for (const f of PV_FILTERS) {
  assert.ok(f.label.length < 70 && f.line.length > 20 && f.line.length < 200 && f.example.startsWith("e.g. ") && f.tells.length > 20 && f.tells.length < 150, `${f.id}: a short plain label, one plain line, an example, and (folded away) what it tells you`);
  assert.equal(f.not, "It is not a prediction and not advice.", `${f.id}: what it does not tell you`);
}

// ---- wording: no indicator names, none of the owner's banned words, no forecast wording, in everything a person reads about the four filters
const ladder = strip(read("components/app/stock-check/ShortlistLadder.tsx"));
const pvSource = ladder.slice(ladder.indexOf("function PvBlock"), ladder.indexOf("function StepBody"));
const copy = [PV_FILTERS.map((f) => `${f.label} ${f.tells} ${f.not}`).join(" "), STEPS[6].line, PV_FILTERS.map((f) => `${f.line} ${f.example}`).join(" "), pvSource.replace(/e.target.value/g, "").replace(/className="[^"]*"/g, "").replace(/data-testid=\{?[^ >]*/g, "")].join("\n");
const BANNED = /\b(buy|buying|sell|selling|targets?|picks?|bullish|bearish|strong|breakout|top|best|RSI|MACD|momentum|oversold|overbought|avoid|candidates?|safe|verdict|rating|recommend(ed)?|standard)\b/gi;
assert.deepEqual(copy.match(BANNED) ?? [], [], "banned words in the Price and volume copy");
assert.ok(pvSource.includes("<details") && pvSource.includes("What it tells you:") && pvSource.includes("What it does not tell you:"), "the two ideas are folded away under each field");
assert.ok(!/\b(will rise|will fall|will go up|will go down|going to|expected to)\b/i.test(copy), "no forecast wording");
// only 1, 3 and 6 months can be chosen
assert.deepEqual([...pvSource.matchAll(/<option value="(\d*)"/g)].map((m) => m[1]), ["", "1", "3", "6", "", "50", "200"], "the options are the periods 1, 3, 6 months and the averages 50, 200 days");
console.log("price and volume tests: ok");
