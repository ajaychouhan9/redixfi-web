// One place for the title, description, canonical, Open Graph and Twitter tags of every public page (26 Nov 2026).
// Rules (checked by scripts/test-seo.ts and by the deploy checklist): a title is at most 60 characters including " | RedixFi", a description at most 155,
// every page has its own pair, the canonical and og:url are the page's own www address, and every share card carries the one branded 1200x630 image.
import type { Metadata } from "next";

export const SITE = "https://www.redixfi.com";
export const SITE_NAME = "RedixFi";
export const OG_IMAGE_PATH = "/branding/redixfi-og-1200x630.png";
export const OG_IMAGES = [{ url: OG_IMAGE_PATH, width: 1200, height: 630, alt: "RedixFi: Market. Simplified." }];
const BRAND = " | RedixFi";
export const TITLE_MAX = 60;
export const DESC_MAX = 155;

/** Cut a text to `max` characters at a word boundary, with no trailing punctuation clutter. */
export function clipText(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  return cut.slice(0, at > 0 ? at : max).replace(/[\s,;:\-–—(]+$/, "");
}

/** "<head> | RedixFi" never longer than 60 characters: the head is shortened, the brand stays. */
export function brandTitle(head: string): string {
  const h = head.replace(/\s*\|\s*RedixFi$/i, "").replace(/\s*[·]\s*RedixFi$/i, "").trim();
  return `${clipText(h, TITLE_MAX - BRAND.length)}${BRAND}`;
}

export interface SeoInput {
  title: string; // head of the title, with or without the brand
  description: string;
  path: string; // "/pricing"; "/" for Home
  index?: boolean;
  type?: "website" | "article";
}

export function seoMeta({ title, description, path, index = true, type = "website" }: SeoInput): Metadata {
  const t = brandTitle(title);
  const d = clipText(description, DESC_MAX);
  const url = path === "/" ? SITE : `${SITE}${path}`;
  return {
    title: { absolute: t },
    description: d,
    alternates: { canonical: path },
    ...(index ? {} : { robots: { index: false, follow: true } }),
    openGraph: { type, siteName: SITE_NAME, url, title: t, description: d, images: OG_IMAGES },
    twitter: { card: "summary_large_image", title: t, description: d, images: [OG_IMAGE_PATH] },
  };
}

/** Takes a page's own Metadata (any shape used so far) and returns it with the length rules, the page's own og:url and the branded share image applied. */
export function finalizeMeta(meta: Metadata, path: string): Metadata {
  const raw = meta.title;
  const head = typeof raw === "string" ? raw : raw && "absolute" in raw && raw.absolute ? raw.absolute : raw && "default" in raw ? String(raw.default) : SITE_NAME;
  const base = seoMeta({ title: head, description: typeof meta.description === "string" ? meta.description : "", path, type: "website" });
  const robots = meta.robots;
  // a page with its own share picture (a stock's price card, a screen's card) keeps it; every other page gets the branded one
  const ownImages = meta.openGraph?.images;
  const ownTwitter = meta.twitter && "images" in meta.twitter ? meta.twitter.images : undefined;
  return {
    ...meta,
    title: base.title,
    description: base.description,
    alternates: { canonical: path },
    ...(robots ? { robots } : {}),
    openGraph: { ...base.openGraph, ...(ownImages ? { images: ownImages } : {}) },
    twitter: { ...base.twitter, ...(ownTwitter ? { images: ownTwitter } : {}) },
  };
}

/** The fixed public pages. Each pair is unique; the tests enforce the lengths. */
export const STATIC_META: Record<string, { title: string; description: string }> = {
  "/": { title: "RedixFi: understand any NSE stock in 5 minutes", description: "Plain-language data for 2,000+ NSE stocks: delivery, insider trades, points to watch and concall summaries. No buy or sell advice." },
  "/signals": { title: "Stock Screener for NSE stocks", description: "Filter 2,000+ NSE stocks by delivery, volume, distance from the 52-week high, volatility and reported figures, with the sources stated." },
  "/signals/7-day-review": { title: "7-Day Review: the week in NSE stocks", description: "The week's biggest price rises and falls, the Nifty and Bank Nifty for the week and what was announced. Measured data, not a forecast." },
  "/weekly": { title: "Weekly market review archive", description: "Every stored week of the 7-Day Review: index moves, how many stocks rose and fell, the largest moves and what was announced." },
  "/screens": { title: "NSE stock screens you can open today", description: "Ready-made screens of NSE stocks: high delivery, volume against its usual level, distance from the 52-week high and reported figures. No login needed." },
  "/market": { title: "Market Overview: NSE movers, pulse and activity", description: "Four pages on the NSE market: the largest moves, index levels and breadth, concalls and insider trades, and the top gainers and losers." },
  "/intraday": { title: "Intraday Monitor: largest gaps and moves", description: "Three views of the NSE trading day for liquid stocks: gaps before the open, the largest moves so far and how the day ended. Prices are delayed." },
  "/pulse": { title: "Market Pulse: Nifty 50, Bank Nifty and breadth", description: "The Nifty 50 and Bank Nifty levels and how many NSE stocks rose and fell, each with its date. Not a forecast or a recommendation." },
  "/market-activity": { title: "Market Activity: concalls, insider trades, deals", description: "Concalls, insider trades, corporate events and bulk or block deals across every tracked NSE stock. Measured facts only." },
  "/gainers-losers": { title: "Top Gainers and Losers on the NSE", description: "The five largest price rises and the five largest falls among liquid NSE stocks, with the date of the figures. Not a recommendation." },
  "/more/about-us": { title: "About RedixFi and how to contact us", description: "Who builds RedixFi, what it measures across 2,000+ NSE stocks, and how to reach the team. Analytics, not advice." },
  "/more/disclaimer": { title: "Disclaimer", description: "RedixFi shows market data for information only. It is not advice to buy or sell any stock and it makes no predictions." },
  "/more/terms": { title: "Terms of Service", description: "The terms for using RedixFi: the service, accounts, plans and billing, the 5-day trial, acceptable use, liability and how to contact us." },
  "/more/privacy": { title: "Privacy Policy", description: "What personal data RedixFi collects and why, who else handles it, how long it is kept, and your rights to access, correct and delete it." },
  "/more/refund-policy": { title: "Refund and Cancellation Policy", description: "A plan period paid for is not refunded once the plan is active. Refunds are made only for a double charge or a payment that did not activate." },
  "/more/data-sources": { title: "Data sources and update times", description: "Where RedixFi's prices, delivery, filings and news come from, the date of the newest data in each source and how many stocks have each field." },
  "/news": { title: "Market News for NSE stocks", description: "AI-classified NSE market and company news, tagged by stock and event type. Measured facts, not advice." },
  "/pricing": { title: "Pricing: Free, Basic and Pro plans", description: "Free, Basic (Rs 249 a month or Rs 1,499 a year) and Pro (Rs 399 a month or Rs 2,499 a year), with a free 5-day Pro trial. No auto-renew." },
  "/how-it-works": { title: "How the readings are measured", description: "What each reading on a RedixFi stock page is (delivery, volume, RSI, promoter pledge, FII flow), where the data comes from and what it does not tell you." },
  "/sample-report": { title: "Free sample company report", description: "See what a RedixFi company report PDF contains: price and 52-week range, growth, peers, ownership, events, filings and governance items, with sources." },
  "/shortlist-lab": { title: "Shortlist Lab: set your rules, read the result", description: "Learn seven steps and five questions, then set your own rules and read the result. Facts from filings and the exchange. Not advice." },
  "/volatility": { title: "Volatility ranking of NSE stocks", description: "Which NSE stocks moved the most and the least from day to day over the last 21 sessions, on split-adjusted prices. Past movement, not a forecast." },
  "/unusual-activity": { title: "Unusual Activity in NSE stocks", description: "Stocks that met a disclosed statistical threshold today: volume, options positioning or a cluster of insider filings. Not a recommendation." },
  "/market-brief": { title: "Daily market brief archive", description: "RedixFi's AI-written daily market recap, built from the day's measured data and labelled AI-generated." },
};

export function staticMeta(path: string): Metadata {
  const m = STATIC_META[path];
  if (!m) throw new Error(`no static SEO entry for ${path}`);
  return seoMeta({ ...m, path });
}

// ---- stock pages
const SUFFIXES = /\b(limited|ltd\.?|private|pvt\.?|corporation|corp\.?|company|co\.?)\b/gi;
/** "Bharat Electronics Ltd" -> "Bharat Electronics" */
export function shortCompany(name: string): string {
  return name.replace(SUFFIXES, "").replace(/\s+/g, " ").replace(/\s+\(/g, " (").trim() || name;
}

/** "BEL share price, concall summary & insider trades | RedixFi"; a long symbol drops the last words so the title stays within 60 characters. */
export function stockTitle(symbol: string): string {
  for (const tail of [" share price, concall summary & insider trades", " share price, concall summary", " share price"]) {
    const t = `${symbol}${tail}${BRAND}`;
    if (t.length <= TITLE_MAX) return t;
  }
  return brandTitle(`${symbol} share price`);
}

/** "Bharat Electronics: price, key numbers, revenue & profit, shareholding, concall summary and insider trades in plain language. Updated daily." within 155. */
export function stockDescription(company: string, symbol: string): string {
  const name = shortCompany(company);
  const tail = ": price, key numbers, revenue & profit, shareholding, concall summary and insider trades in plain language. Updated daily.";
  const full = `${name}${tail}`;
  if (full.length <= DESC_MAX) return full;
  const sym = `${symbol}${tail}`;
  return sym.length <= DESC_MAX ? sym : clipText(sym, DESC_MAX);
}
