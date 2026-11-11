// Prompt 3 (12 Nov 2026): one page per stock, per-stock Rewind, weekly pages, reported-figure screens. Run with:
//   node --experimental-strip-types --import ./scripts/ts-alias.mjs scripts/test-prompt3.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { isNeutralText, neutralSentences, growthText, metaDescription, pageH1, pageTitle, quarterDate, REWIND_MIN_CASES } from "../src/lib/seo/stock-facts.ts";
import { fiveSessionChange, hasEnoughHistory, REWIND_CONDITIONS, resultSentence, summarise, periodLine, type RawStock } from "../src/lib/seo/stock-rewind.ts";
import { isWeekDate, weekDescription, weekH1, weekSentences, weekTitle, weekPath } from "../src/lib/seo/weekly.ts";
import { FILTERS_NOTE, FUNDAMENTAL_SCREENS, getFundamentalScreen } from "../src/data/fundamental-screens.ts";
import robots from "../src/app/robots.ts";

const FORBIDDEN = /\b(buy|sell|hold|target|targets|recommend\w*|breakout|oversold|overbought|bullish|bearish|chance|probability|outlook|undervalued|overvalued|multibagger|strong|weak)\b/i;
const VERDICT = /\b(positive|negative)\b(?! EPS)/i;
// The two sentences the owner prescribed contain the word "recommendations".
const ALLOWED = [
  "RedixFi is not a SEBI-registered Research Analyst or Investment Adviser. It provides measured market data and analytics only: not investment advice, recommendations or predictions.",
  "Filters on reported data; not recommendations.",
];
const clean = (t: string) => ALLOWED.reduce((acc, a) => acc.split(a).join(""), t);
const noForbidden = (t: string, where: string) => {
  const c = clean(t);
  assert.ok(!FORBIDDEN.test(c), `${where}: forbidden word "${c.match(FORBIDDEN)?.[0]}"`);
  assert.ok(!VERDICT.test(c), `${where}: positive/negative used as a verdict`);
};

// ---- stock page: title, H1, description
{
  const t = pageTitle("Reliance Industries Ltd", "RELIANCE");
  assert.equal(t, "Reliance Industries Ltd (RELIANCE) share price data, volume, delivery and quarterly results | RedixFi");
  assert.equal(pageH1("Reliance Industries Ltd", "RELIANCE"), "Reliance Industries Ltd (RELIANCE) share price, volume, delivery and quarterly results");
  const d = metaDescription({ company: "Reliance Industries Ltd", symbol: "RELIANCE", price: 1335.4, dayChangePct: 0.83, quarterEnd: "2026-06-30" });
  assert.match(d, /Reliance Industries Ltd \(RELIANCE\)/);
  assert.match(d, /₹1,335\.4/);
  assert.match(d, /latest quarter ended 30 Jun 2026/);
  assert.match(d, /not investment advice\.$/);
  for (const x of [t, d, pageH1("A", "B")]) noForbidden(x, "stock page text");
  // unique per stock
  assert.notEqual(pageTitle("A Ltd", "AAA"), pageTitle("B Ltd", "BBB"));
}

// ---- figures: quarter dates, growth caps
{
  assert.equal(quarterDate("2026-09-30"), "30 Sep 2026");
  assert.equal(quarterDate(null), "n/a");
  assert.equal(quarterDate("garbage"), "n/a");
  assert.equal(growthText(2204.76, "profit"), "1000%+");            // NRAIL stays as it is in the data, shown capped
  assert.equal(growthText(1000, "profit"), "+1000.0%");
  assert.equal(growthText(-1070.69, "sales"), "n/a");               // SILINV: a sales fall of more than 100% is a data problem
  assert.equal(growthText(-100, "sales"), "-100.0%");
  assert.equal(growthText(-250, "profit"), "-250.0%");              // a profit fall below -100% is a loss, not a data problem
  assert.equal(growthText(null, "sales"), "n/a");
  assert.equal(growthText(12.34, "sales"), "+12.3%");
}

// ---- third-party text: opinion words are left out
{
  assert.equal(isNeutralText("Infosys draws four downgrades in a day on weaker annual sales outlook"), false);
  assert.equal(isNeutralText("Motilal Oswal reveals 9 stock ratings and target prices"), false);
  assert.equal(isNeutralText("ITC shares rise 2% after Q2 results"), true);
  assert.equal(neutralSentences("Revenue grew 10%. The outlook is strong. Margins were 25%."), "Revenue grew 10%. Margins were 25%.");
  assert.equal(neutralSentences("We target 20% growth."), "");
}

// ---- per-stock Rewind
{
  assert.equal(REWIND_MIN_CASES, 5);
  const day = (date: string, next: number | null, move = 4): RawStock["days"][number] => ({
    date, move_pct: move,
    sessions: [1, 2, 3, 4, 5].map((o) => ({ offset: o, status: next === null ? "pending" : "ok", change_pct: o === 1 ? next : 1 })),
  });
  const cond = REWIND_CONDITIONS[0];
  const few: RawStock = { symbol: "X", sessions: 700, first_session: "2023-11-13", count: 4, listed: 4, days: [day("2026-01-01", 1), day("2026-01-02", -1), day("2026-01-03", 2), day("2026-01-04", 0.5)] };
  const rf = summarise(cond, few);
  assert.equal(rf.tooFew, true);
  assert.equal(resultSentence(rf), "Too few past cases");
  const enoughDays = [1, -1, 2, 0, 3, -2].map((v, i) => day(`2026-02-0${i + 1}`, v));
  const enough: RawStock = { symbol: "X", sessions: 700, first_session: "2023-11-13", count: 6, listed: 6, days: enoughDays };
  const re = summarise(cond, enough);
  assert.equal(re.tooFew, false);
  assert.equal(re.nextHigher, 3); assert.equal(re.nextLower, 2); assert.equal(re.nextFlat, 1); assert.equal(re.nextKnown, 6);
  assert.match(resultSentence(re), /higher in 3 of 6 cases and lower in 2 \(unchanged in 1\)/);
  noForbidden(resultSentence(re), "rewind sentence");
  assert.equal(re.rows[0].date, "2026-02-06");                      // newest first
  assert.equal(summarise(cond, null).tooFew, true);
  assert.equal(fiveSessionChange([1, 2, 3, 4, 5].map((o) => ({ offset: o, status: "ok", change_pct: 1 }))), 5.1);
  assert.equal(fiveSessionChange([{ offset: 1, status: "ok", change_pct: 1 }]), null);
  assert.match(periodLine(enough, "2026-11-11"), /700 sessions from 13 Nov 2023 to 11 Nov 2026/);
  // pending outcomes are not counted
  assert.equal(summarise(cond, { ...enough, days: [day("2026-03-01", null)] , count: 6}).nextKnown, 0);
  // history rule
  assert.equal(hasEnoughHistory({ ...enough, sessions: 249 }), false);
  assert.equal(hasEnoughHistory({ ...enough, sessions: 250 }), true);
  assert.equal(hasEnoughHistory(null), false);
  for (const c of REWIND_CONDITIONS) noForbidden(c.label, "rewind condition");
}

// ---- weekly pages
{
  assert.ok(isWeekDate("2026-11-06")); assert.ok(!isWeekDate("2026-13-45")); assert.ok(!isWeekDate("latest"));
  assert.equal(weekPath("2026-11-06"), "/weekly/2026-11-06");
  const review = {
    available: true, as_of: "2026-11-06",
    window: { sessions: [], n: 5, before: "2026-10-30", label: "Last 5 sessions: 2 Nov - 6 Nov 2026", as_of_label: "", holidays: [], notes: [] },
    market: {
      nifty: { start: 24000, end: 25000, pct: 4.17, pts: 1000 }, banknifty: { start: 56000, end: 55000, pct: -1.79, pts: -1000 }, vix: null,
      breadth: { advancing: 200, declining: 90, unchanged: 6, n: 296 }, industries: { higher: 20, lower: 14, total: 34 },
      flows: { unit: "INR crore", sessions: 5, fii_net: -1200.5, dii_net: 3400.2, fii_net_days: 2, dii_net_days: 4, complete: true },
    },
    events: { results: { stocks: 100 }, board_meetings: { stocks: 90 }, deals: { deals: 12, stocks: 8, covered_to: null }, insider: { disclosures: 30, stocks: 20, covered_to: null } },
  } as never;
  const s = weekSentences(review);
  assert.ok(s.some((x) => x.startsWith("The Nifty 50 rose 4.17%")));
  assert.ok(s.some((x) => x.startsWith("The Bank Nifty fell 1.79%")));
  assert.ok(s.some((x) => /net outflow of ₹1,201 crore/.test(x)));
  assert.equal(weekH1(review), "Weekly market review: 2 Nov - 6 Nov 2026");
  assert.match(weekTitle(review), /^Market data for 2 Nov - 6 Nov 2026/);
  for (const x of [...s, weekH1(review), weekTitle(review), weekDescription(review)]) noForbidden(x, "weekly text");
}

// ---- screens on reported data
{
  assert.equal(FILTERS_NOTE, "Filters on reported data; not recommendations.");
  const slugs = new Set(FUNDAMENTAL_SCREENS.map((x) => x.slug));
  assert.equal(slugs.size, FUNDAMENTAL_SCREENS.length);
  const reportedOnly = new Set(["pe_min", "pe_max", "roe_min", "eps_positive", "profit_growth_min", "sales_growth_min", "ema200_state", "sort", "order"]);
  for (const sc of FUNDAMENTAL_SCREENS) {
    noForbidden(`${sc.title} ${sc.heading} ${sc.description} ${sc.conditions.join(" ")}`, sc.slug);
    assert.ok(Object.keys(sc.params).every((k) => reportedOnly.has(k)), `${sc.slug}: only reported-data filters`);
    assert.ok(sc.title.length > 20 && sc.heading.length > 5 && sc.description.length > 40, `${sc.slug}: own title, heading and description`);
    assert.ok(/^[a-z0-9-]+$/.test(sc.slug));
  }
  assert.equal(new Set(FUNDAMENTAL_SCREENS.map((x) => x.title)).size, FUNDAMENTAL_SCREENS.length, "titles are unique");
  assert.deepEqual(getFundamentalScreen("pe-below-30-roe-above-25-positive-eps")?.params, { pe_max: 30, roe_min: 25, eps_positive: true, sort: "name", order: "asc" });
  assert.equal(getFundamentalScreen("price-above-200-day-ema")?.heading, "Price above 200-day EMA");
  assert.equal(getFundamentalScreen("profit-and-sales-growth-above-20-percent")?.params.profit_growth_min, 20);
  assert.equal(getFundamentalScreen("nope"), undefined);
}

// ---- robots
{
  const r = robots();
  const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
  const dis = ([] as string[]).concat(rule.disallow ?? []);
  for (const must of ["/api/*", "/login", "/account", "/admin", "/*?q="]) assert.ok(dis.includes(must), `robots disallows ${must}`);
  assert.ok(([] as string[]).concat(rule.allow ?? []).includes("/api/og"));
  assert.equal(r.sitemap, "https://www.redixfi.com/sitemap.xml");
}

// ---- new pages: standard line and no forbidden words in what they print
{
  const root = new URL("../src/", import.meta.url);
  const pages = [
    "app/(seo)/stocks/[symbol]/page.tsx",
    "app/(seo)/stocks/[symbol]/rewind/page.tsx",
    "app/(seo)/weekly/page.tsx",
    "app/(seo)/weekly/[date]/page.tsx",
    "app/(seo)/screens/[slug]/page.tsx",
    "app/(seo)/screens/page.tsx",
  ];
  for (const rel of pages) {
    const src = readFileSync(new URL(rel, root), "utf8");
    assert.ok(src.includes("<StandardLineNote"), `${rel}: standard line`);
  }
  const printed = [...pages, "components/seo/ScreenTable.tsx", "components/seo/ScreenMoreRows.tsx", "components/app/review/WeeklyEmailOptIn.tsx", "components/app/signals/FundamentalFilters.tsx", "lib/seo/stock-facts.ts", "lib/seo/stock-rewind.ts", "lib/seo/weekly.ts", "data/fundamental-screens.ts"];
  for (const rel of printed) {
    const src = readFileSync(new URL(rel, root), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n").filter((l) => !/^\s*(\/\/|\*|\{\/\*)/.test(l)).map((l) => l.replace(/\s\/\/ .*$/, "")).join("\n");
    // look only at quoted strings and JSX text, not identifiers
    const texts = [...src.matchAll(/"([^"\n]{3,})"|`([^`]{3,})`|>([^<>{}\n]{3,})</g)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");
    for (const t of texts) {
      if (/^[@./\w-]+$/.test(t) && !t.includes(" ")) continue;           // import paths, class names, keys
      if (/[=(){};]/.test(t)) continue;                                 // code between two angle brackets, not displayed text
      noForbidden(t, rel);
    }
  }
}

// ---- one public page per stock: the signed-in views point to /stocks/<symbol> and stay out of the index
{
  const root = new URL("../src/", import.meta.url);
  for (const rel of ["app/(app)/research/[symbol]/page.tsx", "app/(app)/signals/[symbol]/page.tsx"]) {
    const src = readFileSync(new URL(rel, root), "utf8");
    assert.ok(/canonical: stockPath\("\/stocks",/.test(src), rel + ": canonical is the /stocks page");
    assert.ok(/robots: \{ index: false, follow: true \}/.test(src), rel + ": noindex");
    assert.ok(src.includes('stockPath("/stocks"'), rel + ": links back to the public page");
  }
  const stock = readFileSync(new URL("app/(seo)/stocks/[symbol]/page.tsx", root), "utf8");
  for (const need of ["Breadcrumbs", "/rewind", "sectorPeers", "quarterDate", "formatPriceAsOf", "concall", "insider", "deals"]) assert.ok(stock.includes(need), "stock page has " + need);
  assert.ok(!/tone_label|tone_note|composite_score|severity|net_direction|deal_strength/.test(stock), "stock page prints no tone, score, severity or deal verdict");
  const rewind = readFileSync(new URL("app/(seo)/stocks/[symbol]/rewind/page.tsx", root), "utf8");
  assert.ok(rewind.includes("robots: enough") && rewind.includes("index: false"), "a stock without enough history is noindex");
  assert.ok(rewind.includes("href={stockUrl}") && rewind.includes("Back to the"), "the Rewind page links back to the stock page");
  const weekly = readFileSync(new URL("app/(seo)/weekly/[date]/page.tsx", root), "utf8");
  assert.ok(weekly.includes('stockPath("/stocks"'), "weekly pages link to stock pages");
}

console.log("prompt 3 tests: ok");
