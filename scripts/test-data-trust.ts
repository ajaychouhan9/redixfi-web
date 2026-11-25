// Trust fixes (26 Nov 2026): sentence splitting on decimals and abbreviations, fragments hidden, one date style, Ask AI table cells, Home movers tabs and strip.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clipSentence, isFragment, splitSentences } from "@/lib/sentences";
import { humanDate, humanizeDates, monthYear } from "@/lib/human-date";
import { formatCell, numericColumn } from "@/lib/ask-table-format";
import { shortBullets } from "@/lib/stock-visual";
import { sideRows } from "@/lib/home-movers";
import { isNumberAnswer } from "@/lib/rule-answers";
import { stripAsOf } from "@/lib/home-market";
import { neutralSentences } from "@/lib/seo/stock-facts";

// ---- splitter: decimals, Rs., INR figures never break a sentence
const pledge = "Promoters have pledged 1.56 percent of their holding (as of 18 Jul 2026).";
assert.deepEqual(splitSentences(pledge), [pledge], "a decimal point is not a sentence end");
assert.deepEqual(splitSentences("Earnings per share rose to INR 1.43. The order book was INR 72,258 crores."), ["Earnings per share rose to INR 1.43.", "The order book was INR 72,258 crores."]);
assert.deepEqual(splitSentences("It paid Rs. 5,000 crore to lenders. Margins held."), ["It paid Rs. 5,000 crore to lenders.", "Margins held."], "Rs. is an abbreviation");
assert.deepEqual(splitSentences("It contributed INR 50,000. The trust is not for profit."), ["It contributed INR 50,000.", "The trust is not for profit."]);
assert.deepEqual(splitSentences("Revenue grew 25.27% year-over-year. Profit rose 8.81%."), ["Revenue grew 25.27% year-over-year.", "Profit rose 8.81%."]);
assert.deepEqual(splitSentences(""), []);
assert.equal(neutralSentences(`${pledge} Margins held.`).startsWith("Promoters have pledged 1.56 percent"), true, "the prefix before a decimal is kept");

// ---- fragments are never shown
for (const frag of ["43.", "…reaching INR 5,533 crores for Q1 FY27.", "reaching INR 5,533 crores for Q1 FY27.", "Defence Innovation Organisation (DIO) during.", "Notes were issued regarding the.", "Profit."]) assert.ok(isFragment(frag), `fragment: ${frag}`);
for (const ok of [pledge, "Profit before tax rose by 8.81% to INR 1,403 crores.", "The EBITDA margin for the quarter was reported at 25.83%."]) assert.ok(!isFragment(ok), `whole sentence: ${ok}`);
const cut = clipSentence("The company contributed INR 50,000 to the equity capital of Defence Innovation Organisation (DIO) during FY 2018-19, which is a not-for-profit company.", 15);
assert.ok(!/\b(during|the|of|to|regarding)\.$/i.test(cut), `no dangling end: ${cut}`);
const sb = shortBullets("revenue up to INR 5,533 crores. Profit before tax rose by 8.81% to INR 1,403 crores. 43. The EBITDA margin was reported at 25.83% for the quarter.", 3, 15);
assert.deepEqual(sb.shown, ["Profit before tax rose by 8.81% to INR 1,403 crores.", "The EBITDA margin was reported at 25.83% for the quarter."], "fragments dropped, whole sentences kept");

const lead = shortBullets("During the earnings conference call held on 27 Jul 2026, Bharat Electronics Limited (BEL) reported a revenue increase of 25.27% year-over-year. The EBITDA margin was reported at 25.83%.", 3, 40);
assert.equal(lead.shown[0], "Bharat Electronics Limited (BEL) reported a revenue increase of 25.27% year-over-year.", "the call lead-in clause is dropped, the bullet starts with the fact");

// ---- one date style
assert.equal(humanDate("2026-07-18"), "18 Jul 2026");
assert.equal(monthYear("2026-09-30"), "Sep 2026");
assert.equal(humanizeDates("Promoters have pledged 1.56 percent (as of 2026-07-18)."), "Promoters have pledged 1.56 percent (as of 18 Jul 2026).");
assert.equal(humanizeDates("The call was held on July 27, 2026 and the filing came on 28 July 2026."), "The call was held on 27 Jul 2026 and the filing came on 28 Jul 2026.");
assert.equal(humanizeDates("Ratio 12.5 and amount 2026-13-45 stay."), "Ratio 12.5 and amount 2026-13-45 stay.", "a number that is not a date is left alone");

// ---- Ask AI table cells
assert.deepEqual(formatCell("change_pct", "change_pct", 1.234), { text: "+1.23%", numeric: true, tone: "up" });
assert.deepEqual(formatCell("change_pct", "change_pct", -0.5), { text: "−0.50%", numeric: true, tone: "down" });
assert.equal(formatCell("close", "close", 2508).text, "₹2,508.00");
assert.equal(formatCell("delivery_pct", "delivery_pct", 57.09).text, "57.1%");
assert.equal(formatCell("close", "close", null).text, "N/A");
assert.equal(formatCell(undefined, "date", "2026-11-18").text, "18 Nov 2026");
const rows = [{ date: "2026-11-18", close: 10, note: "x" }];
assert.ok(numericColumn(rows, "close") && !numericColumn(rows, "date") && !numericColumn(rows, "note"));
assert.ok(isNumberAnswer({ table: { rows: [{}] } }) && isNumberAnswer({ screen: { results: [{}] } }) && !isNumberAnswer({}) && !isNumberAnswer({ table: { rows: [] } }), "Add to my rule only under number answers");

// ---- Home: Gainers and Losers, market strip, one headline
const scanRow = (symbol: string, pct: number) => ({ symbol, name: `${symbol} Ltd`, pct, price: 10, vr: 1, sector: null, spark: [] });
const scan = { tab: "scan", available: true, session: { phase: "live" }, lists: { nifty500: { up: [scanRow("A", 4), scanRow("B", 6), scanRow("C", 1)], down: [scanRow("D", -5), scanRow("E", -2)] } } } as never;
assert.deepEqual(sideRows(scan, "up").map((r) => r.symbol), ["B", "A", "C"], "gainers, biggest first");
assert.deepEqual(sideRows(scan, "down").map((r) => r.symbol), ["D", "E"], "losers, biggest fall first");
assert.deepEqual(sideRows(null, "up"), []);
assert.equal(stripAsOf({ as_of_date: "2026-11-25", market_session: { phase: "post_market" } as never, india_vix: undefined }), "As of 25 Nov 2026 close");
assert.equal(stripAsOf({ as_of_date: "", market_session: undefined, india_vix: undefined }), null);
const read = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const movers = read("components/app/home/HomeMovers.tsx");
assert.ok(movers.includes("Gainers") && movers.includes("Losers") && movers.includes("return null") && !movers.includes("Loading"), "tabs, and the card hides with no data");
assert.ok(read("components/app/home/HomePricingStrip.tsx").includes("Free · Basic ₹249/mo · Pro ₹399/mo") && read("components/app/home/HomeTrialLine.tsx").includes("<HomePricingStrip />"));
assert.ok(read("components/app/HeroStockSearch.tsx").includes('["BEL", "RELIANCE", "TCS", "HDFCBANK"]'));

// ---- Ask AI window, contrast tokens, stock page
const ask = read("components/app/ask/AskRedixFi.tsx");
assert.ok(ask.includes('placeholder={authLoading ? "Loading…" : "Ask about a stock…"}') && ask.includes("var(--user-bubble)") && ask.includes("isNumberAnswer(m)"), "placeholder, light user bubble, Add to my rule only on number answers");
assert.ok(!ask.includes("QuotaBar") && ask.includes("<UsageLine"), "one usage line");
const css = read("app/globals.css");
assert.ok(css.includes("--foreground-muted: #4b5563;") && css.includes("--foreground-faint: #4b5563;"), "Light small text is #4b5563");
const page = read("app/(app)/stocks/[symbol]/page.tsx");
assert.equal((page.match(/<StockSignupOffer /g) ?? []).length, 1, "the trial prompt once");
assert.ok(page.includes("DELIVERY_SESSIONS = 60") && page.includes("latest ${lastFive.length} of ${sortedDelivery.length} sessions"), "the delivery heading and caption come from the row count");
console.log("data trust tests: ok");
