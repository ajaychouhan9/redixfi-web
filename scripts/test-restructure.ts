// Restructure of 17 Nov 2026, corrected 18 Nov 2026: one stock page with lazy tabs, redirects, the side menu and phone bar, the account menu, Market Overview and its four pages, the new Home,
// the Rewind tab's wording and rows, Start here, and the display guard of the AI brief. Static checks of the source plus the pure helpers.
// Run: npm run test:restructure   (part of check:wording)
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

import { restructureRedirects } from "../src/lib/seo/restructure-redirects.ts";
import { NAV_ITEMS, BOTTOM_ITEMS, ACCOUNT_ITEMS, activeNavId, signupHref } from "../src/lib/nav-items.ts";
import { STOCK_TABS, DEFAULT_STOCK_TAB, neighbourTab, tabFromHash, tabFromSearch } from "../src/lib/stock-tabs.ts";
import { stockPath, stockTabPath } from "../src/lib/seo/stock-symbol.ts";
import { cardTags, closeTag, LIVE_TAG, NEWS_TAG } from "../src/lib/market-overview.ts";
import { previewLabel, previewRows } from "../src/lib/home-movers.ts";
import { formatShares, volumeLine } from "../src/lib/intraday-volume-filter.ts";
import { REWIND_FOOTER, REWIND_INTRO, REWIND_MOVES, REWIND_PERIODS, rewindRow, rewindSummary, sessionNumbers } from "../src/lib/rewind-simple.ts";
import { BRIEF_NOT_ADVICE, bulletIsSafe, shownBullets, updatedLine } from "../src/lib/home-brief.ts";
import { START_PAGE_SIZE, START_WHAT_MATTERS, HOW_TO_READ, profitFlag, salesText, startListParams, yieldText } from "../src/lib/start-here.ts";

const root = new URL("../src/", import.meta.url);
const exists = (rel: string) => existsSync(new URL(rel, root));
const read = (rel: string) => readFileSync(new URL(rel, root), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

// ---- 1. redirects: every old address moves in one hop to the right place
{
  const rules = restructureRedirects();
  assert.ok(rules.every((r) => r.statusCode === 301), "all permanent");
  const find = (source: string, hasQuery = false) => rules.find((r) => r.source === source && !!r.has === hasQuery);
  assert.equal(find("/stocks/:symbol/rewind")!.destination, "/stocks/:symbol#rewind");
  assert.equal(find("/stocks/:symbol/concall-summary")!.destination, "/stocks/:symbol#concall");
  assert.equal(find("/research")!.destination, "/");
  assert.equal(find("/research/:symbol")!.destination, "/stocks/:symbol");
  assert.equal(find("/rewind", true)!.destination, "/stocks/:symbol#rewind", "/rewind?symbol=X goes to that stock's Rewind tab");
  assert.equal(find("/rewind")!.destination, "/", "plain /rewind goes to Home");
  // 18 Nov 2026: Intraday, Market Pulse and Market Activity are separate pages again, so nothing redirects them
  for (const back of ["/intraday", "/pulse", "/market-activity"]) assert.ok(!rules.some((r) => r.source === back), `${back} is a page again, not a redirect`);
  assert.equal(find("/me")!.destination, "/", "the Me page was removed: /me goes to Home");
  assert.equal(find("/history")!.destination, "/", "the older /history chain is one hop now");
  // the /signals/<symbol> rule must not catch the 7-Day Review or a deeper review path
  const sym = rules.find((r) => r.destination === "/stocks/:symbol" && r.source.startsWith("/signals/:symbol("))!;
  const re = new RegExp("^" + sym.source.replace("/signals/:symbol(", "/signals/(").replace(/\)$/, ")") + "$");
  assert.ok(re.test("/signals/TCS") && re.test("/signals/M%26M"), "a stock is redirected");
  assert.ok(!re.test("/signals/7-day-review"), "the 7-Day Review is not a stock");
  assert.ok(!re.test("/signals"), "the Screener is not redirected");
  // destinations never point at an address that itself redirects
  const targets = rules.map((r) => r.destination.replace(/[#?].*$/, ""));
  for (const t of targets) assert.ok(t === "/" || t === "/stocks/:symbol", `final destination ${t}`);
  const cfg = read("../next.config.ts");
  assert.ok(cfg.includes("restructureRedirects()") && !cfg.includes('destination: "/rewind"'), "next.config uses the list and no rule ends at /rewind");
  // the removed pages are really gone, and stock paths point at the one page
  for (const gone of ["app/(app)/rewind/page.tsx", "app/(app)/me/page.tsx", "app/(app)/research/page.tsx", "app/(app)/research/[symbol]/page.tsx", "app/(app)/signals/[symbol]/page.tsx", "app/(seo)/stocks/[symbol]/page.tsx", "app/(seo)/stocks/[symbol]/rewind/page.tsx", "app/(seo)/stocks/[symbol]/concall-summary/page.tsx"])
    assert.ok(!exists(gone), `${gone} is removed`);
  for (const here of ["stocks/[symbol]", "market", "intraday", "pulse", "market-activity", "gainers-losers", "pricing", "shortlist-lab"]) assert.ok(exists(`app/(app)/${here}/page.tsx`), `${here} is a page`);
  assert.equal(stockPath("/signals", "tcs"), "/stocks/TCS");
  assert.equal(stockPath("/research", "M&M"), "/stocks/M%26M");
  assert.equal(stockTabPath("INFY", "rewind"), "/stocks/INFY#rewind");
}

// ---- 2. the one stock page: static, tabbed, lazy
{
  const page = strip(read("app/(app)/stocks/[symbol]/page.tsx"));
  assert.ok(/export const revalidate = 21600/.test(page) && page.includes("generateStaticParams"), "still ISR, 6 h");
  assert.ok(!/\b(cookies|headers)\(\)|searchParams/.test(page), "no request-bound API on the cached page");
  assert.ok(page.includes("<StockTabs") && page.includes("<StockActions") && page.includes("<LazyRewindTab") && page.includes("<LazyAskAiTab"), "tabs, actions, Rewind and Ask AI tabs");
  assert.ok(!page.includes("StockViewSwitch") && !page.includes("Public page for") && !/Simple view|Detailed view/.test(page), "no switch, no public/signed-in split");
  assert.equal((page.match(/getResearch\(|getSignalDetail\(|getVolatility\(|getSignals\(/g) ?? []).length, 5, "the same five reads as before (research x2 with its retry, detail, volatility, peers): no new server fetch");
  assert.ok(page.includes("detail?.partial") && page.includes("Partial reading"), "Partial reading note only when the API says an input is missing");
  assert.ok(!exists("components/app/stock/StockViewSwitch.tsx") && !/stock-view/.test(read("app/globals.css")), "the switch and its CSS are gone");
  assert.deepEqual(STOCK_TABS.map((t) => t.label), ["Overview", "Annual report", "Concall", "Points to watch", "News", "Insiders & promoters", "Rewind", "Ask AI"]);
  assert.equal(DEFAULT_STOCK_TAB, "overview");
  assert.equal(tabFromHash("#rewind"), "rewind");
  assert.equal(tabFromHash("#concall"), "concall");
  assert.equal(tabFromHash("#range"), null, "an anchor inside a tab is not a tab");
  assert.equal(tabFromSearch("?tab=news"), "news");
  assert.equal(neighbourTab("ask-ai", 1), "overview");
  assert.equal(neighbourTab("overview", -1), "ask-ai");
  // lazy: a panel is mounted only after it was opened
  const tabs = strip(read("components/app/stock/StockTabs.tsx"));
  assert.ok(tabs.includes("visited.has(t.id) || SERVER_RENDERED.has(t.id) ?") && tabs.includes('hidden={active !== t.id}') && tabs.includes("new Set([DEFAULT_STOCK_TAB])"), "the interactive tabs are mounted when opened, the reading tabs are in the server HTML; Overview first");
  assert.ok(tabs.includes('role="tablist"') && tabs.includes('role="tab"') && tabs.includes('role="tabpanel"') && tabs.includes("ArrowRight"), "accessible tabs");
  assert.ok(tabs.includes("hashchange") && tabs.includes("tabFromHash(window.location.hash)"), "an address fragment opens a tab");
  const rewind = strip(read("components/app/stock/RewindTab.tsx"));
  assert.ok(rewind.includes("runStockwise(") && rewind.includes("[symbol, move, period]"), "Rewind numbers are fetched by the tab, not the page");
  assert.ok(!/revalidate|generateStaticParams/.test(rewind) && rewind.includes('"use client"'), "client only");
  const ask = strip(read("components/app/stock/AskAiTab.tsx"));
  assert.ok(ask.includes("<AskPills") && ask.includes("openPanel"), "Ask AI tab opens the one panel");
  // personal buttons are client-side and send a logged-out visitor to sign-up
  const actions = strip(read("components/app/stock/StockActions.tsx"));
  assert.ok(actions.includes('"use client"') && actions.includes("signupHref(pathname)") && actions.includes("<WatchlistButton") && actions.includes("<ReportActions") && actions.includes("<CompareIndicator") && actions.includes("<StockExcelButton"), "watchlist, alert, compare, share and PDF, Excel");
  assert.ok(strip(read("components/app/WatchlistButton.tsx")).includes("signupHref(window.location.pathname)"), "watchlist sends a logged-out visitor to sign-up");
  assert.equal(signupHref("/stocks/TCS"), "/login?mode=signup&next=%2Fstocks%2FTCS");
  const excel = strip(read("components/app/stock/StockExcelButton.tsx"));
  assert.ok(excel.includes("async function exportXlsx") && excel.includes("getToken()"), "Excel reads its data on click, with the visitor's token");
  // the checklist's See details links name tabs
  const sv = strip(read("lib/simple-view.ts"));
  for (const id of ["annual-report", "insiders", "points-to-watch", "range"]) assert.ok(sv.includes(`detailsId: "${id}"`), `See details -> ${id}`);
}

// ---- 3. the menu: side menu in the asked order, the phone bar, the account menu
{
  assert.deepEqual(NAV_ITEMS.map((i) => i.label), ["Home", "Shortlist Lab", "Screener", "7-Day Review", "Market Overview", "Ask AI", "Pricing"]);
  assert.deepEqual(NAV_ITEMS.map((i) => i.href), ["/", "/shortlist-lab", "/signals", "/signals/7-day-review", "/market", null, "/pricing"]);
  assert.deepEqual(BOTTOM_ITEMS.map((i) => i.short), ["Home", "Shortlist", "Screener", "Market", "Account"]);
  assert.deepEqual(ACCOUNT_ITEMS.map((i) => i.label), ["Profile and plan", "Watchlist", "Alerts", "Billing"]);
  assert.equal(NAV_ITEMS.find((i) => i.id === "ask")!.href, null, "Ask AI opens a panel");
  for (const gone of ["Research", "Pro", "Rewind", "Intraday", "Start here"]) assert.ok(!NAV_ITEMS.some((i) => i.label.includes(gone)), `${gone} is not a menu item`);
  assert.equal(activeNavId("/"), "home");
  assert.equal(activeNavId("/shortlist-lab"), "lab");
  assert.equal(activeNavId("/full-check"), "lab");
  assert.equal(activeNavId("/signals"), "screener");
  assert.equal(activeNavId("/signals/7-day-review"), "review");
  for (const m of ["/market", "/intraday", "/pulse", "/market-activity", "/gainers-losers"]) assert.equal(activeNavId(m), "market", m);
  assert.equal(activeNavId("/pricing"), "pricing");
  assert.equal(activeNavId("/account/alerts"), "account");
  assert.equal(activeNavId("/watchlist"), "account");
  assert.equal(activeNavId("/stocks/TCS"), null);
  const side = strip(read("components/layout/Sidebar.tsx"));
  assert.ok(side.includes("NAV_ITEMS.map") && side.includes("BOTTOM_ITEMS.map") && !/Research|Rewind|Intraday|"\/more"|"\/research"|"\/start"|Start here/.test(side), "sidebar and bottom bar read their lists; no Start here in the menu");
  assert.ok(side.includes("export function BottomNav") && side.includes("md:hidden") && side.includes("<AccountPanel"), "phone bar with the Account menu");
  const header = strip(read("components/layout/MarketRibbon.tsx"));
  assert.ok(header.includes("<HeaderSearch") && header.includes("<AskRedixFiTrigger") && header.includes("<UserMenu") && !/getMarketOverview|MarketOverview|FreshnessDot|Bell/.test(header), "header: logo, search, Ask AI, profile; no market data");
  const layout = strip(read("app/(app)/layout.tsx"));
  assert.ok(!/getMarketOverview|await |fetch\(/.test(layout), "the app layout makes no server request");
  const menu = strip(read("components/layout/AccountMenu.tsx"));
  assert.ok(menu.includes("ACCOUNT_ITEMS.map") && menu.includes("Log out") && menu.includes("Log in") && menu.includes('data-testid="header-login"'), "profile circle menu; Log in button when logged out");
  assert.ok(!exists("app/(app)/me/page.tsx") && !exists("components/app/me/MeMenu.tsx"), "the Me page is gone");
  assert.equal(signupHref("/watchlist"), "/login?mode=signup&next=%2Fwatchlist");
  const stock = strip(read("app/(app)/stocks/[symbol]/page.tsx"));
  assert.equal((stock.match(/AskPills/g) ?? []).length, 0, "the stock page itself has no second Ask AI entry (the tab holds it)");
  assert.ok(!/ReviewTabs/.test(read("app/(app)/signals/page.tsx") + read("app/(app)/signals/7-day-review/page.tsx")), "the Screener | 7-Day Review tabs are gone");
}

// ---- 4. Market Overview and its four pages
{
  assert.deepEqual(cardTags("OPEN", "2026-11-17"), { intraday: LIVE_TAG, pulse: "As of 17 Nov close", activity: "As of 17 Nov close", movers: "As of 17 Nov close", news: NEWS_TAG, volatility: "As of 17 Nov close" }, '"Live" only on Intraday, only while open');
  assert.deepEqual(cardTags("CLOSED", "2026-11-17"), { intraday: "As of 17 Nov close", pulse: "As of 17 Nov close", activity: "As of 17 Nov close", movers: "As of 17 Nov close", news: NEWS_TAG, volatility: "As of 17 Nov close" });
  assert.equal(cardTags("OPEN", null).pulse, null, "no date, no tag");
  assert.equal(closeTag("2026-11-14"), "As of 14 Nov close");
  const cards = strip(read("components/app/market/MarketOverviewCards.tsx"));
  for (const t of ["Intraday", "Market Pulse", "Market Activity", "Top Gainers & Losers", "News", "Volatility"]) assert.ok(cards.includes(`title: "${t}"`), `card ${t}`);
  for (const h of ["/intraday", "/pulse", "/market-activity", "/gainers-losers", "/news", "/volatility"]) assert.ok(cards.includes(`href: "${h}"`), `card opens ${h}`);
  const mp = strip(read("app/(app)/market/page.tsx"));
  assert.ok(/export const revalidate = \d+/.test(mp) && mp.includes("Market Overview"), "/market has a refresh window and the new name");
  assert.ok(!/\b(cookies|headers)\(\)|searchParams|await |fetch\(/.test(mp), "/market is static");
  for (const pg of ["pulse", "gainers-losers"]) {
    const src = strip(read(`app/(app)/${pg}/page.tsx`));
    assert.ok(/export const revalidate = \d+/.test(src) && !/\b(cookies|headers)\(\)|searchParams|await |fetch\(/.test(src), `${pg} is static with a refresh window`);
  }
  const tm = strip(read("components/app/market/TopMovers.tsx"));
  assert.ok(tm.includes("getPriceMovers") && tm.includes("closeTag(data.date)") && tm.includes("Not a forecast or a recommendation."), "Top gainers and losers: existing price-movers list, dated, with the not-advice line");
  const sitemap = read("app/sitemap.xml/route.ts");
  for (const h of ["/market", "/intraday", "/pulse", "/market-activity", "/gainers-losers"]) assert.ok(sitemap.includes(`"${h}"`), `sitemap lists ${h}`);
  // Intraday rows: company, change, price, volume; the row is the link; no chart column, no per-row links
  const list = strip(read("components/app/intraday/tabs/StockList.tsx"));
  assert.ok(!/Spark|spark|Rewind|Research page|Links|\/rewind|\/research/.test(list), "no chart column, no links per row");
  assert.ok(list.includes('stockPath("/stocks", r.symbol)'), "tapping a row opens the stock page");
  const bodies = strip(read("components/app/intraday/tabs/TabBodies.tsx"));
  assert.ok(bodies.includes("volumeLine(r)") && bodies.includes('header: "Volume"') && bodies.includes("UNIVERSE_ORDER") && bodies.includes("VOLUME_STEPS") && bodies.includes('upLabel="Up"') && bodies.includes('downLabel="Down"'), "Volume column, Nifty universes, Up/Down, volume filter");
  assert.ok(!/spark=/.test(bodies) && !/ rewind /.test(bodies), "no per-row rewind or chart props");
  // volume text
  assert.equal(formatShares(1200000), "12 lakh");
  assert.equal(formatShares(412500), "4.1 lakh");
  assert.equal(formatShares(25000000), "2.5 crore");
  assert.equal(formatShares(45000), "45,000");
  assert.equal(volumeLine({ vt: 1200000, vu: 400000, vr: 3 }), "12 lakh shares today, usual 4 lakh, 3x");
  assert.equal(volumeLine({ vt: 1200000, vu: 400000, vr: 3.04 }), "12 lakh shares today, usual 4 lakh, 3x");
  assert.equal(volumeLine({ vr: 3.04 }), "3x its usual volume", "rows stored before the counts were added keep the ratio only");
  assert.equal(volumeLine({ vr: null }), "-");
}

// ---- 5. Home: no server request, the order, five boxes without Rewind
{
  const home = strip(read("app/(app)/page.tsx"));
  assert.ok(!/@\/lib\/api|await |fetch\(|\b(cookies|headers)\(\)|searchParams/.test(home), "Home makes no server request and stays static");
  assert.ok(/export const revalidate = \d+/.test(home), "Home has a refresh window: a fully static page is cached for a year and would outlive a deploy");
  const order = ["<HeroStockSearch", "<HomeMarketStrip", "<HomeMovers", "<HomeBrief", "<HomeBoxes", "<HomeTrialLine"].map((k) => home.indexOf(k));
  assert.ok(order.every((i, n) => i >= 0 && (n === 0 || i > order[n - 1])), `order: search, market strip, movers, brief, boxes, trial line (${order.join(",")})`);
  assert.ok(home.includes("Understand any NSE stock in 5 minutes") && home.includes("Plain-language data for 2,000+ NSE stocks. No buy or sell advice."), "headline and sub-line");
  const boxes = strip(read("components/app/home/HomeBoxes.tsx"));
  for (const t of ["Shortlist Lab", "Screener", "Market Overview", "7-Day Review", "Ask AI"]) assert.ok(boxes.includes(`title="${t}"`), `box ${t}`);
  assert.ok(!/Rewind/.test(boxes), "no Rewind box");
  assert.equal((boxes.match(/<Box /g) ?? []).length, 5, "five boxes");
  const mv = strip(read("components/app/home/HomeMovers.tsx"));
  assert.ok(mv.includes('href="/intraday"') && mv.includes("See all") && mv.includes("getIntradayTab") && !/getPriceMovers|Price movers|Price Movers/.test(mv), "Home: five Intraday movers with See all to /intraday; the Price Movers card is gone");
  assert.ok(mv.includes("Not a forecast or a recommendation."), "the not-advice line stays where movers appear");
  const scanRow = (symbol: string, pct: number) => ({ symbol, name: symbol + " Ltd", pct, price: 10, vr: 1, sector: null, spark: [] });
  const live = { tab: "scan", available: true, is_today: true, data_date_label: "17 Nov", session: { phase: "live", latest_completed_session: "2026-11-14" }, lists: { nifty500: { up: [scanRow("A", 4), scanRow("B", 3.5), scanRow("C", 1)], down: [scanRow("D", -5), scanRow("E", -2), scanRow("F", -0.5)] }, liquid: { up: [], down: [] }, nifty50: { up: [], down: [] }, nifty100: { up: [], down: [] } } } as never;
  assert.deepEqual(previewRows(live).map((r) => r.symbol), ["D", "A", "B", "E", "C"], "five rows, the largest moves by size whichever way they went");
  assert.equal(previewLabel(live), "Live · 15 min delayed");
  assert.equal(previewLabel({ ...(live as object), session: { phase: "post_market", latest_completed_session: "2026-11-17" }, data_date_label: "17 Nov" } as never), "As of 17 Nov close");
  assert.equal(previewLabel({ ...(live as object), session: { phase: "weekend", latest_completed_session: "2026-11-14" }, data_date_label: "14 Nov", is_today: false } as never), "As of 14 Nov close");
  assert.deepEqual(previewRows(null), []);
  const trial = strip(read("components/app/home/HomeTrialLine.tsx"));
  assert.ok(trial.includes("if (user) return null") && trial.includes("free Pro trial. No payment details needed."), "small trial line for logged-out visitors");
}

// ---- 6. the AI brief on the page: only guard-clean bullets, "Updated 12:30 IST"
{
  assert.ok(bulletIsSafe("Nifty 50 closed at 25,262.30, up 0.50% on 13 Nov."));
  for (const bad of ["Investors may buy Alpha.", "Nifty 50 rose because of global cues.", "Nifty 50 fell due to profit booking.", "Banks gained on worries about rates.", "Nifty is expected to rise.", "A target of 26,000 is set.", "Our pick of the day is Alpha."]) assert.ok(!bulletIsSafe(bad), bad);
  assert.deepEqual(shownBullets(["Nifty 50 closed at 1.", "Nifty may rise.", 7, "FII net flow was +1 crore."]), ["Nifty 50 closed at 1.", "FII net flow was +1 crore."]);
  assert.equal(shownBullets(["a", "b", "c", "d", "e", "f", "g"]).length, 5);
  assert.deepEqual(shownBullets(null), []);
  assert.equal(updatedLine("12:30 IST", null), "Updated 12:30 IST");
  assert.equal(updatedLine(null, "2026-11-17T12:30:03+05:30"), "Updated 12:30 IST");
  assert.equal(updatedLine(null, null), null);
  const b = strip(read("components/app/home/HomeBrief.tsx"));
  assert.ok(b.includes("shownBullets(brief?.bullets)") && b.includes("getHomeBrief") && b.includes(BRIEF_NOT_ADVICE.slice(0, 20)) || b.includes("BRIEF_NOT_ADVICE"), "reads the stored brief through the guard and carries the not-advice line");
  assert.ok(b.includes("home-brief-updated") && b.includes("return null"), "Updated line; no brief means the card is hidden (26 Nov 2026)");
  const ep = strip(read("lib/api/endpoints.ts"));
  assert.ok(ep.includes('"/brief/home"') && /@auth public[^\n]*\n[^\n]*getHomeBrief|@auth public[\s\S]{0,300}getHomeBrief/.test(read("lib/api/endpoints.ts")), "public GET /brief/home, read-only");
}

// ---- 7. Rewind tab wording and rows
{
  assert.equal(REWIND_INTRO, "Pick a size. We show every day this stock moved by that much, and what its numbers looked like the day before.");
  assert.equal(REWIND_FOOTER, "Past record. Not a forecast or a recommendation.");
  assert.deepEqual(REWIND_MOVES, [2, 3, 5]);
  assert.deepEqual(REWIND_PERIODS.map((p) => p.v), ["1y", "3y"]);
  assert.equal(rewindSummary("INFY", 2, "3y", { count: 139, up: 74, down: 65, partial_period: false }), "INFY moved 2% or more on 139 days in 3 years (74 up, 65 down).");
  assert.equal(rewindSummary("NEW", 5, "1y", { count: 1, up: 1, down: 0, partial_period: true }), "NEW moved 5% or more on 1 day in 1 year (1 up, 0 down). This stock has been listed for less than the full period.");
  const day = {
    symbol: "INFY", date: "2026-11-09", weekday: "Monday", move_pct: -2.31,
    sessions: [
      { offset: -2, status: "ok", change_pct: 3.47, volume_x: 0.66, delivery_pct: 51.2 },
      { offset: -1, status: "ok", change_pct: -0.1, volume_x: 1.234, delivery_pct: null },
      { offset: 0, status: "ok", change_pct: -2.31 },
    ],
  } as never;
  assert.deepEqual(rewindRow(day), { date: "9 Nov 2026", move: "-2.31%", before1: "-0.10% · volume 1.23× usual · delivery n/a", before2: "+3.47% · volume 0.66× usual · delivery 51.2%" });
  assert.equal(sessionNumbers({ sessions: [{ offset: -1, status: "pending" }] } as never, -1), "Not yet available");
  assert.equal(sessionNumbers({ sessions: [] } as never, -1), "Not available");
  assert.equal(rewindRow({ date: "-", move_pct: NaN, sessions: [] } as never).date, "n/a");
  const t = strip(read("components/app/stock/RewindTab.tsx"));
  assert.ok(t.includes("REWIND_INTRO") && t.includes("REWIND_FOOTER") && t.includes("More options") && t.includes("StockwiseHistory"), "intro, footer, More options holds the full explorer");
  assert.ok(t.includes("dynamic(") && t.includes("{more && ("), "the explorer is loaded only when More options is opened");
  assert.equal((t.match(/<Choice /g) ?? []).length, 2, "only two controls on top");
  assert.ok(!exists("components/app/history/PooledHistory.tsx") || !t.includes("Across stocks"), "no Across stocks mode");
}

// ---- 8. Start here
{
  assert.equal(HOW_TO_READ.length, 4);
  assert.ok(HOW_TO_READ.every((h) => h.line.length > 40) && !/\b[A-Z]{3,}\b/.test(HOW_TO_READ.map((h) => h.line).join(" ")), "four plain lines, no company or ticker named");
  assert.deepEqual(startListParams(["profit", "sales", "dividend"], "NIFTY AUTO", 2), { sort: "name", order: "asc", page: 2, size: START_PAGE_SIZE, eps_positive: true, sales_growth_min: 1, dividend_yield_min: 0.01, sector: "NIFTY AUTO" });
  assert.deepEqual(startListParams([], "", 1), { sort: "name", order: "asc", page: 1, size: START_PAGE_SIZE }, "nothing ticked lists everything A to Z");
  assert.equal(profitFlag({ eps: 3 }), "Yes");
  assert.equal(profitFlag({ eps: -1 }), "No");
  assert.equal(profitFlag({ eps: null }), "Not available");
  assert.equal(salesText({ sales_growth_pct: 12.34 }), "+12.3%");
  assert.equal(salesText({ sales_growth_pct: null }), "Not available");
  assert.equal(salesText({ sales_growth_pct: -150 }), "Not available", "a fall of more than 100% is a data problem");
  assert.equal(yieldText({ dividend_yield_pct: 1.234 }), "1.23%");
  assert.equal(yieldText({ dividend_yield_pct: 0 }), "None");
  assert.equal(yieldText({ dividend_yield_pct: null }), "Not available");
  assert.deepEqual(START_WHAT_MATTERS.map((o) => o.label), ["Steady profits", "Growing sales", "Pays dividends"]);
  const page = strip(read("app/(app)/shortlist-lab/page.tsx"));
  assert.ok(!/\b(cookies|headers)\(\)|searchParams|await |fetch\(/.test(page), "/shortlist-lab is static");
  assert.ok(read("app/sitemap.xml/route.ts").includes('"/shortlist-lab"') && read("app/sitemap.xml/route.ts").includes('"/market"'), "sitemap lists /shortlist-lab and /market");
  // Pricing: its own page and menu item; the research-lookups row is gone with the feature; no price changed
  const plans = read("data/plan-features.ts");
  assert.ok(!/Research page lookups/.test(plans), "the 3 research lookups a day line is removed");
  assert.ok(/ask_topup_50", questions: 50, priceRupees: 99/.test(plans) && /ask_topup_150", questions: 150, priceRupees: 199/.test(plans) && /ask_topup_500", questions: 500, priceRupees: 499/.test(plans) && /ask_topup_1000", questions: 1000, priceRupees: 749/.test(plans), "the Ask AI add-on prices are unchanged");
}

console.log("restructure tests: ok");
