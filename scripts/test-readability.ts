// Readability overhaul (26 Nov 2026): number formats, key-number tiles, plain sentences (banned words, no data = no sentence), chart ranges, design tokens.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  bannedIn, changeOver, crore, dailyRangesAvailable, epsTtm, growthRows, holdPoints, holdSentence, keyTiles, priceSentence, profitSentence, quarterlyPoints, revenueSentence,
  rupees, shortBullets, signedPct, signedRupees, sliceDaily, toneOf, yearlyPoints, type Close,
} from "@/lib/stock-visual";

const MINUS = "−";
// formats
assert.equal(crore(289103.81), "₹2,89,104 Cr");
assert.equal(rupees(402.6), "₹402.60");
assert.equal(rupees(-3.96), `${MINUS}₹3.96`);
assert.equal(signedPct(1.76), "+1.76%");
assert.equal(signedPct(-0.8), `${MINUS}0.8%`);
assert.equal(signedPct(0), "0%");
assert.equal(signedPct(null), null);
assert.equal(signedPct(Number.NaN), null);
assert.equal(signedRupees(6.8), "+₹6.80");
assert.equal(signedRupees(-1.2), `${MINUS}₹1.20`);
assert.equal(toneOf(1), "up"); assert.equal(toneOf(-1), "down"); assert.equal(toneOf(0), "flat"); assert.equal(toneOf(null), "flat");

// a BEL-like record from the database (real figures, 23 Nov 2026)
const f: any = {
  as_of: "2026-11-23", fetched_on: "2026-11-23",
  identity: { market_cap: 289103.81 },
  valuation: { pe_ttm: 44.39, pb: 11.4, roe_ttm: 24.37, debt_to_equity: 0.0, sector_pe: 52.94, dividend_yield_pct: 0.62 },
  balance: { debt_to_equity: 0.0, book_value_per_share: 34.7 },
  annual: { series_5y: [["2022", 15368.18, 2398.87], ["2023", 17734.44, 2984.42], ["2024", 20268.24, 3984.52], ["2025", 23768.75, 5321.44], ["2026", 27610.11, 6062.0]].map(([fy, revenue, pat]) => ({ fiscal_year: fy, revenue, pat })) },
  quarterly: { latest_quarter_end: "2026-09-30", series_8q: [["2025-12-31", 7153.85, 1579.1, 2.16], ["2026-03-31", 10224.43, 2225.22, 3.04], ["2026-06-30", 5546.98, 1054.34, 1.44], ["2026-09-30", 7327.72, 1540.19, 2.11]].map(([quarter_end, revenue, pat, eps]) => ({ quarter_end, revenue, pat, eps })) },
  shareholding: { series_4q: [["2025-12-31", 51.14, 18.51, 14.82, 15.53], ["2026-03-31", 51.14, 19.51, 14.28, 15.07], ["2026-06-30", 51.14, 18.02, 14.99, 15.85], ["2026-09-30", 51.14, 16.99, 14.9, 16.97]].map(([date, promoter, fii, mf, other]) => ({ date, promoter, fii, mf, other })) },
};
const tiles = keyTiles(f);
assert.deepEqual(tiles.map((t) => t.key), ["mcap", "pe", "ipe", "pb", "roe", "eps", "dy", "de", "bv"], "every stored figure has a tile, face value has none");
assert.equal(tiles.find((t) => t.key === "mcap")!.value, "₹2,89,104 Cr");
assert.equal(tiles.find((t) => t.key === "eps")!.value, "₹8.75", "EPS TTM is the sum of the last four quarters (2.16+3.04+1.44+2.11)");
assert.equal(tiles.find((t) => t.key === "pe")!.meaning, "P/E 44.4: the price is 44.4 times the profit of the last 12 months.");
// missing data: no tile, never NaN or "—"
assert.deepEqual(keyTiles(null), []);
const thin = keyTiles({ identity: { market_cap: null }, valuation: { pe_ttm: null, pb: Number.NaN }, balance: {}, quarterly: { series_8q: [] } } as any);
assert.deepEqual(thin, []);
for (const t of [...tiles, ...thin]) assert.ok(!/NaN|undefined|—/.test(`${t.label}${t.value}${t.meaning}`), "no NaN in tiles");
// a gap in the quarters gives no EPS TTM
assert.equal(epsTtm([{ quarter_end: "2025-03-31", eps: 1 }, { quarter_end: "2025-06-30", eps: 1 }, { quarter_end: "2025-12-31", eps: 1 }, { quarter_end: "2026-03-31", eps: 1 }]), null);

// sentences
const y = yearlyPoints(f);
assert.equal(profitSentence(y, "year"), "Profit went up in each of the last 5 years (₹2,399 Cr → ₹6,062 Cr).");
assert.equal(revenueSentence(y, "year"), "Revenue went up in each of the last 5 years (₹15,368 Cr → ₹27,610 Cr).");
const qd = quarterlyPoints(f);
assert.equal(profitSentence(qd, "quarter"), "Profit in Sep 26 was ₹1,540 Cr, up from ₹1,054 Cr in Jun 26.");
assert.equal(profitSentence(y.slice(0, 1), "year"), null, "one point: no sentence");
const h = holdPoints(f);
assert.equal(holdSentence(h, "fii", "FII"), "FII holding went from 18.51% to 16.99% in 3 quarters.");
assert.equal(holdSentence(h, "promoter", "Promoter"), "Promoter holding stayed at 51.14% over 3 quarters.");
assert.equal(holdSentence(h.slice(0, 1), "fii", "FII"), null);
assert.deepEqual(growthRows(y).map((r) => r.label), ["1 year", "3 year CAGR"]);
assert.equal(growthRows(y.slice(0, 3)).length, 1, "3 year CAGR needs four years");
// banned words never appear in any sentence built here
const all = [profitSentence(y, "year"), revenueSentence(y, "year"), profitSentence(qd, "quarter"), holdSentence(h, "fii", "FII"), holdSentence(h, "promoter", "Promoter"), ...tiles.map((t) => t.meaning)].filter(Boolean) as string[];
for (const s of all) assert.deepEqual(bannedIn(s), [], s);
assert.deepEqual(bannedIn("A buyback and a good day"), ["buy", "good"].filter((w) => new RegExp(`\\b${w}\\w*\\b`, "i").test("A buyback and a good day")));

// price ranges
const day = (n: number) => new Date(Date.UTC(2025, 10, 25) + n * 86400000).toISOString().slice(0, 10);
const closes: Close[] = Array.from({ length: 400 }, (_, i) => [day(i), 100 + i * 0.1] as Close);
assert.ok(dailyRangesAvailable(closes).includes("1Y") && !dailyRangesAvailable(closes).includes("5Y"));
assert.ok(dailyRangesAvailable(closes.slice(-40)).join() === "1W,1M", "a short history offers only the ranges it covers");
assert.equal(dailyRangesAvailable(closes.slice(-1)).length, 0);
assert.ok(sliceDaily(closes, "1M").length >= 30);
const c = changeOver([100, 112])!;
assert.equal(c.pct, 12);
assert.match(priceSentence(closes) ?? "", /^Price is up \d+% in 1 year\.$/);
assert.equal(priceSentence(closes.slice(-20)), null, "less than a year of closes: no sentence");

// short bullets: at most 15 words each, at most 3 shown
const long = "Order book stood at 74,000 crore with strong execution expected across defence electronics, radar and communication programmes over the coming years. Margins stayed near 25 percent. Hiring was steady. A new plant opens next year. Exports grew.";
const sb = shortBullets(long, 3, 15);
assert.equal(sb.shown.length, 3);
assert.ok(sb.rest.length >= 1);
for (const b of [...sb.shown, ...sb.rest]) assert.ok(b.split(" ").length <= 16, b);
assert.deepEqual(shortBullets("", 3, 15), { shown: [], rest: [] });

// design tokens and clutter
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
assert.ok(/--font-weight-semibold:\s*700/.test(css), "semibold is drawn as bold: only 400, 500, 700");
assert.ok(layout.includes('weight: ["400", "500", "700"]') && layout.includes("Inter"), "one family, three weights");
assert.ok(css.includes("--up-fill: #00a86b") && css.includes("--down-fill: #e5484d") && css.includes("--border: #eeeeee") && css.includes("--foreground-muted: #6b7280"), "Light tokens");
assert.ok(!/box-shadow/.test(css.slice(css.indexOf("Light theme (26 Nov 2026"), css.indexOf("Typography readability"))), "no shadows in Light");
for (const f of ["components/app/AiDailyBriefCard.tsx", "components/app/signals/SmartScreenerBox.tsx", "components/app/ask/AskRedixFi.tsx", "components/app/billing/PlanCard.tsx"]) {
  assert.ok(!/linear-gradient/.test(readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8")), `${f}: no gradient`);
}
const logo = readFileSync(new URL("../src/components/brand/RedixFiLogo.tsx", import.meta.url), "utf8");
assert.ok(logo.includes('variant === "symbol" ? "RedixFi" : ""'), "the logo name is read once");
const movers = readFileSync(new URL("../src/components/app/home/HomeMovers.tsx", import.meta.url), "utf8");
assert.ok(!movers.includes("Loading…") && movers.includes("return null"), "Home movers: no Loading placeholder, the card hides");
const page = readFileSync(new URL("../src/app/(app)/stocks/[symbol]/page.tsx", import.meta.url), "utf8");
for (const need of ["<StockPriceChart", "<KeyNumbers", "<RevenueProfit", "<Shareholding", "<QuickReads"]) assert.ok(page.includes(need), `stock page has ${need}`);
assert.ok(page.indexOf("<StockPriceChart") < page.indexOf("<KeyNumbers") && page.indexOf("<KeyNumbers") < page.indexOf("<RevenueProfit") && page.indexOf("<RevenueProfit") < page.indexOf("<Shareholding") && page.indexOf("<Shareholding") < page.indexOf("<QuickReads"), "order: chart, key numbers, revenue & profit, shareholding, short reads");
console.log("readability tests: ok");
