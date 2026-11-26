// SEO rules (26 Nov 2026): the permanent checklist, as tests.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DESC_MAX, STATIC_META, TITLE_MAX, brandTitle, clipText, finalizeMeta, seoMeta, shortCompany, staticMeta, stockDescription, stockTitle } from "@/lib/seo/page-meta";
import { isThinRow, isThinStock } from "@/lib/seo/thin";
import { ROUTE_CRUMBS } from "@/lib/seo/route-crumbs";
import { shortStamp } from "@/lib/human-date";

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

// every fixed page: title and description within the limits, unique, no advice words
const titles = new Set<string>(), descs = new Set<string>();
for (const [path, m] of Object.entries(STATIC_META)) {
  const meta = staticMeta(path);
  const t = (meta.title as { absolute: string }).absolute;
  assert.ok(t.length <= TITLE_MAX && t.endsWith(" | RedixFi"), `title ${path}: ${t} (${t.length})`);
  assert.ok((meta.description as string).length <= DESC_MAX && m.description.length <= DESC_MAX, `description ${path} (${m.description.length})`);
  assert.ok(!titles.has(t) && !descs.has(m.description), `duplicate on ${path}`);
  titles.add(t); descs.add(m.description);
  if (path !== "/more/disclaimer") assert.ok(!/\b(buy|sell|target|recommend\w*|prediction|undervalued|overvalued)\b/i.test(`${t} ${m.description}`.replace(/no buy or sell advice/i, "").replace(/not a (forecast or a )?recommendation/i, "").replace(/not a forecast/i, "")), `advice word on ${path}`);
  assert.equal(meta.alternates?.canonical, path);
  const og = meta.openGraph as { url: string; images: { url: string; width: number; height: number }[] };
  assert.equal(og.url, path === "/" ? "https://www.redixfi.com" : `https://www.redixfi.com${path}`);
  assert.deepEqual([og.images[0].url, og.images[0].width, og.images[0].height], ["/branding/redixfi-og-1200x630.png", 1200, 630]);
}
for (const path of Object.keys(ROUTE_CRUMBS)) assert.ok(STATIC_META[path], `breadcrumb page ${path} has SEO text`);

// stock pages
assert.equal(stockTitle("BEL"), "BEL share price, concall summary & insider trades | RedixFi");
for (const sym of ["BAJAJ-AUTO", "AARTIPHARM", "21STCENMGM", "A".repeat(24)]) assert.ok(stockTitle(sym).length <= TITLE_MAX && stockTitle(sym).startsWith(sym), stockTitle(sym));
assert.equal(shortCompany("Bharat Electronics Ltd"), "Bharat Electronics");
assert.equal(stockDescription("Bharat Electronics Ltd", "BEL"), "Bharat Electronics: price, key numbers, revenue & profit, shareholding, concall summary and insider trades in plain language. Updated daily.");
assert.ok(stockDescription("A Very Long Company Name Industries Private Limited Of India And Others Holdings", "LONGCO").length <= DESC_MAX);
assert.ok(!/\b(buy|sell|target)\b/i.test(stockDescription("X Ltd", "X")));
assert.equal(clipText("one two three four five six", 12), "one two");
assert.ok(brandTitle("A".repeat(80)).length <= TITLE_MAX && brandTitle("Pricing | RedixFi") === "Pricing | RedixFi");

// finalizeMeta: a page's own text is kept within the limits, its own share picture is kept, the og:url is its own
const f = finalizeMeta({ title: "T".repeat(90), description: "d ".repeat(120), openGraph: { images: [{ url: "/api/og?x=1", width: 1200, height: 630 }] } }, "/screens/x");
assert.ok((f.title as { absolute: string }).absolute.length <= TITLE_MAX && (f.description as string).length <= DESC_MAX);
assert.equal((f.openGraph as { url: string }).url, "https://www.redixfi.com/screens/x");
assert.equal((f.openGraph as { images: { url: string }[] }).images[0].url, "/api/og?x=1");
assert.equal(seoMeta({ title: "x", description: "y", path: "/z", index: false }).robots && (seoMeta({ title: "x", description: "y", path: "/z", index: false }).robots as { index: boolean }).index, false);

// thin pages
assert.ok(isThinStock(0, null) && isThinStock(0, 0) && !isThinStock(0, 100) && !isThinStock(3, null));
assert.ok(isThinRow({}) && !isThinRow({ last_price: 10 }) && !isThinRow({ pe: 12 }) && !isThinRow({ market_cap: 500 }));
const sitemap = read("src/app/sitemap.xml/route.ts");
assert.ok(sitemap.includes("isThinRow") && read("src/app/(app)/stocks/[symbol]/page.tsx").includes("isThinStock") && read("src/app/(app)/stocks/[symbol]/page.tsx").includes("permanentRedirect"), "thin pages: noindex and not listed; upper-case address");

// robots: private areas closed, sitemap named
const robots = read("src/app/robots.ts");
for (const p of ['"/login"', '"/account"', '"/admin"', '"/watchlist"', '"/api/*"']) assert.ok(robots.includes(p), `robots blocks ${p}`);
assert.ok(robots.includes("sitemap") || robots.includes("Sitemap"), "robots names the sitemap");

// stock page: the reading tabs are in the HTML, H2s carry the symbol, one H1
const tabs = read("src/components/app/stock/StockTabs.tsx");
assert.ok(tabs.includes("SERVER_RENDERED") && tabs.includes('"concall"') && tabs.includes('"points-to-watch"') && tabs.includes('"insiders"'), "reading tabs rendered on the server");
const page = read("src/app/(app)/stocks/[symbol]/page.tsx");
for (const h of ["concall summary", "insider and promoter activity", "shareholding pattern", "delivery percentage", "revenue and profit"]) assert.ok(page.includes(h) || read("src/components/app/stock/RevenueProfit.tsx").includes(h) || read("src/components/app/stock/Shareholding.tsx").includes(h), `H2 ${h}`);
assert.equal((page.match(/<h1/g) ?? []).length, 1, "one H1 on the stock page");

// home structured data and the date style
const home = read("src/app/(app)/page.tsx");
assert.ok(home.includes('"@type": "Organization"') && home.includes('"@type": "WebSite"') && home.includes("SearchAction") && !/aggregateRating|\breviews?\b/i.test(home), "home JSON-LD: simple, no ratings");
assert.ok(read("src/app/layout.tsx").includes('<html lang="en"'), "lang en");
assert.equal(shortStamp(new Date(2026, 10, 26, 10, 30)), "26 Nov, 10:30");
assert.equal(shortStamp("not a date"), "");
console.log("seo tests: ok");
