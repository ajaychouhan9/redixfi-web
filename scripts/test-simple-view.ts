// Simple view checklist templates (17 Nov 2026): normal values, missing values and bad values ("-", null, zero bases) never throw and
// never invent a figure. Run: npm run test:simple-view (part of check:wording).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildChecklist, debtLine, growthLine, insidersLine, pctChange, priceLine, profitLine, promotersLine, watchLine, type ChecklistInput } from "../src/lib/simple-view.ts";

const TODAY = "2026-11-17";

const full: ChecklistInput = {
  price: { last_price: 1200, week52_high: 1500, week52_low: 1000 },
  fundamentals: {
    annual: {
      series_5y: [
        { fiscal_year: "FY22", revenue: 100, pat: 10 },
        { fiscal_year: "FY23", revenue: 120, pat: -2 },
        { fiscal_year: "FY24", revenue: 150, pat: 12 },
        { fiscal_year: "FY25", revenue: 180, pat: 15 },
        { fiscal_year: "FY26", revenue: 200, pat: 20 },
      ],
    },
    balance: { debt_to_equity: 0.4 },
    valuation: { debt_to_equity: 0.9 },
    shareholding: {
      latest_date: "2026-09-30",
      promoter_pct: 52.1,
      series_4q: [
        { date: "2025-09-30", promoter: 50.3 },
        { date: "2025-12-31", promoter: 51 },
        { date: "2026-03-31", promoter: 51.5 },
        { date: "2026-09-30", promoter: 52.1 },
      ],
    },
  },
  pledge_history: [
    { as_of_date: "2026-06-30", pledged_pct: 3.5 },
    { as_of_date: "2026-09-30", pledged_pct: 0 },
  ],
  insider_trades: [
    { trade_date: "2026-11-01", transaction_type: "BUY", value_amount: 150000, person_category: "Promoter" },
    { trade_date: "2026-10-15", transaction_type: "SELL", value_amount: 50000, person_category: "Director" },
    { trade_date: "2026-05-01", transaction_type: "BUY", value_amount: 999999, person_category: "KMP" }, // older than 3 months
  ],
  red_flags: {
    coverage: { total_chunks: 100 },
    categories: [
      {
        category_label: "Contingent Liability",
        occurrence_count: 2,
        occurrences: [
          { source_type_label: "Annual report", fiscal_year: "FY25", filing_date: "2025-08-01", source_pdf_url: "https://x/ar.pdf" },
          { source_type_label: "Concall", filing_date: "2026-02-01", source_pdf_url: "https://x/cc.pdf" },
        ],
      },
      { category_label: "Related-Party Transaction", occurrence_count: 1, occurrences: [{ source_type_label: "Annual report", fiscal_year: "FY25", filing_date: "2025-08-01", source_pdf_url: null }] },
    ],
  },
};

// ---- normal values
assert.equal(profitLine(full), "Made a profit in 4 of the last 5 years (FY22 to FY26).");
assert.equal(growthLine(full), "Sales went from ₹100 crore to ₹200 crore in 4 years (+100%). Profit went from ₹10 crore to ₹20 crore (+100%).");
assert.equal(debtLine(full), "Debt is 0.40 times its own capital, the shareholders' money in the business (debt-to-equity 0.40).");
assert.equal(promotersLine(full), "Promoters hold 52.1%, up from 50.3% a year ago. 0% of their shares are pledged (as of 30 Sep 2026), given as security for a loan.");
assert.equal(insidersLine(full, TODAY), "In the last 3 months: bought ₹1,50,000, sold ₹50,000 (Promoter, Director).");
const w = watchLine(full);
assert.equal(w.answer, "3 items found in the annual report and concall filings we read: contingent liability, related-party transaction. Showing 2 of 3.");
assert.equal(w.sources.length, 2, "only occurrences with a source link");
assert.equal(w.sources[0].href, "https://x/cc.pdf", "newest filing first");
assert.equal(priceLine(full, "As of 13:12 IST (delayed)"), "At ₹1,200, 20.0% below its 52-week high (₹1,500) and 20.0% above its 52-week low (₹1,000). 15 min delayed.");
assert.equal(priceLine(full, "As of 14 Nov close"), "At ₹1,200, 20.0% below its 52-week high (₹1,500) and 20.0% above its 52-week low (₹1,000). At 14 Nov close.");

const lines = buildChecklist(full, { today: TODAY, priceLabel: "As of 14 Nov close" });
assert.equal(lines.length, 7);
assert.deepEqual(lines.map((l) => l.key), ["profit", "growth", "debt", "promoters", "insiders", "watch", "price"]);
assert.ok(lines.every((l) => l.answer && l.why && l.detailsId));

// ---- missing values: every line answers null (page shows "Data not available yet"), nothing throws
const empty = buildChecklist({}, { today: TODAY, priceLabel: "As of the last close" });
assert.deepEqual(empty.map((l) => l.answer), [null, null, null, null, null, null, null]);
assert.equal(buildChecklist({ fundamentals: null, red_flags: null, insider_trades: null }, { today: TODAY, priceLabel: "" }).filter((l) => l.answer).length, 0);

// ---- partial and bad values
assert.equal(profitLine({ fundamentals: { annual: { series_5y: [{ fiscal_year: "FY26", revenue: 1, pat: null }] } } }), null, "no profit figure at all");
assert.equal(growthLine({ fundamentals: { annual: { series_5y: [{ fiscal_year: "FY26", revenue: 10, pat: 1 }] } } }), null, "one year is not growth");
assert.equal(growthLine({ fundamentals: { annual: { series_5y: [{ fiscal_year: "FY24", revenue: 0, pat: -5 }, { fiscal_year: "FY26", revenue: 50, pat: 5 }] } } }), "Sales went from ₹0 crore to ₹50 crore in 1 year. Profit went from ₹-5 crore to ₹5 crore.", "zero or negative base: no percentage");
assert.equal(pctChange(0, 10), null);
assert.equal(pctChange(-5, 5), null);
assert.equal(debtLine({ fundamentals: { balance: { debt_to_equity: null }, valuation: { debt_to_equity: 0 } } }), "It reports no debt against its own capital (debt-to-equity 0).");
assert.equal(debtLine({ fundamentals: { balance: { debt_to_equity: -1 } } }), null, "a negative ratio is not shown");
assert.equal(debtLine({ fundamentals: { balance: { debt_to_equity: NaN } } }), null);
assert.equal(promotersLine({ fundamentals: { shareholding: { promoter_pct: 40, series_4q: [] } } }), "Promoters hold 40.0%. Pledge figure not available.");
assert.equal(
  promotersLine({ fundamentals: { shareholding: { latest_date: "2026-09-30", promoter_pct: 40, series_4q: [{ date: "2026-03-31", promoter: 41 }, { date: "2026-09-30", promoter: 40 }] } } }),
  "Promoters hold 40.0%, down from 41.0% on 31 Mar 2026. Pledge figure not available.",
  "a shorter history is dated, not called a year",
);
assert.equal(insidersLine({ insider_trades: [] }, TODAY), "No insider trades were disclosed in the last 3 months.");
assert.equal(insidersLine({ insider_trades: [{ trade_date: "-", transaction_type: "BUY", value_amount: 5 }] }, TODAY), "No insider trades were disclosed in the last 3 months.", "a '-' date is skipped");
assert.equal(
  insidersLine({ insider_trades: [{ trade_date: "2026-11-10", transaction_type: "BUY", value_amount: null, person_category: "-" }] }, TODAY),
  "In the last 3 months: 1 disclosure, 1 bought and 0 sold, amounts not stated (Category not disclosed).",
);
assert.equal(watchLine({ red_flags: { coverage: { total_chunks: 5 }, categories: [] } }).answer, "No items found in the documents we read.");
assert.equal(watchLine({ red_flags: { coverage: null, categories: [] } }).answer, null, "no documents read: not available, never 'none found'");
assert.equal(watchLine({ red_flags: { coverage: null, categories: [{ category_label: "Promoter Pledge", occurrence_count: 1, occurrences: [{ source_type_label: "Structured filing", filing_date: "2026-09-30", source_pdf_url: null }] }] } }).answer, "1 item found in the annual report and concall filings we read: promoter pledge.", "items from structured filings count even with no document coverage");
assert.equal(priceLine({ price: { last_price: 100, week52_high: null, week52_low: 50 } }, "x"), null);
assert.equal(priceLine({ price: { last_price: 100, week52_high: 120, week52_low: 0 } }, "x"), null, "zero low: no division");
assert.equal(priceLine({ price: { last_price: 100, week52_high: 120, week52_low: 80, corporate_action: { status: "unconfirmed" } } }, "x"), null, "price history not comparable");
assert.equal(priceLine({ price: { last_price: 130, week52_high: 120, week52_low: 80 } }, "As of 14 Nov close"), "At ₹130, 0.0% below its 52-week high (₹130) and 62.5% above its 52-week low (₹80). At 14 Nov close.", "a price above the stored high is the new high");

// ---- a broken payload never throws
const broken = buildChecklist({ fundamentals: { annual: { series_5y: "nope" as never } }, insider_trades: "x" as never, red_flags: { coverage: { total_chunks: 1 }, categories: "x" as never } }, { today: TODAY, priceLabel: "" });
assert.equal(broken.length, 7);

// ---- wording: no judgement words in anything the templates or the page print
const printed = [
  ...lines.map((l) => `${l.question} ${l.answer} ${l.why}`),
  readFileSync(new URL("../src/components/app/stock/SimpleChecklist.tsx", import.meta.url), "utf8"),
  readFileSync(new URL("../src/components/app/stock/StockTabs.tsx", import.meta.url), "utf8"),
  readFileSync(new URL("../src/app/(app)/shortlist-lab/page.tsx", import.meta.url), "utf8").replace(/no buy or sell advice/gi, ""),
  readFileSync(new URL("../src/lib/start-here.ts", import.meta.url), "utf8"),
  readFileSync(new URL("../src/lib/read-company.ts", import.meta.url), "utf8"),
  readFileSync(new URL("../src/components/app/stock-check/LearnTab.tsx", import.meta.url), "utf8"),
  readFileSync(new URL("../src/lib/learn.ts", import.meta.url), "utf8"),
]
  .join("\n")
  // code, not display text: comments, event targets and link targets
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|\s)\/\/.*$/gm, "$1")
  .replace(/e\.target|target="_blank"|Pick</g, "");
const hits = printed.match(/\b(best|top|picks?|buy|sell|targets?|recommended|safe|good|bad|cheap|expensive|clean|likely|expected|bullish|bearish|predict\w*)\b/gi) ?? [];
assert.deepEqual(hits.filter((h) => !/^(buy|sell)$/i.test(h)), [], `judgement words: ${hits.join(", ")}`);
// "buying or selling" appears only in the insider question and the share-trade explanation, which name the disclosed action, not advice
assert.ok(hits.every((h) => /^(buy|sell)$/i.test(h)) && hits.length <= 2, `buy/sell only as the disclosed action: ${hits.join(", ")}`);

console.log("simple view tests: ok");
