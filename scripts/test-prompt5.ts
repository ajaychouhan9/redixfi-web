// Prompt 5 (13 Nov 2026): billing truth wording, screener filters, My screens, industry median section, data-coverage line, data sources.
//   node --experimental-strip-types --import ./scripts/ts-alias.mjs scripts/test-prompt5.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { coverageLine, fundamentalsCoverage } from "../src/lib/seo/data-coverage.ts";
import { EMPTY_FUND, fundChips, fundParams } from "../src/components/app/signals/fund-filter-model.ts";

const root = new URL("../src/", import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root), "utf8");
const FORBIDDEN = /\b(buy|sell|hold|target|targets|recommend\w*|breakout|oversold|overbought|bullish|bearish|outlook|better than|worse than)\b/i;
const STANDARD = "RedixFi shows market data for information only. It gives no buy or sell advice or predictions.";
const stripStandard = (t: string) => t.split(STANDARD).join("");

// ---- billing wording says what the code does
{
  const checkout = read("components/app/billing/CheckoutView.tsx");
  assert.ok(checkout.includes("One-time payment for the period. It does not renew automatically; you can renew when it ends."));
  assert.ok(checkout.includes("payment receipt"));
  assert.ok(!/invoice/i.test(checkout), "checkout does not mention an invoice");
  assert.ok(!/renew automatically and|Subscriptions renew automatically/i.test(checkout), "checkout does not claim auto-renewal");
  const terms = read("app/(app)/more/terms/page.tsx");
  assert.ok(terms.includes("does not renew automatically"), "terms: no auto-renewal");
  assert.ok(!/invoice/i.test(terms) && !/renews automatically at the end/i.test(terms), "terms: no invoice / auto-renew claim");
  const privacy = read("app/(app)/more/privacy/page.tsx");
  assert.ok(!/invoice/i.test(privacy), "privacy: receipt records, not invoice records");
  assert.ok(read("components/app/account/SubscriptionStatusCard.tsx").includes("Plan ends"), "account shows 'Plan ends' not 'Renews'");
}

// ---- screener filters
{
  assert.deepEqual(fundParams(EMPTY_FUND), {
    pe_max: undefined, roe_min: undefined, eps_positive: undefined, profit_growth_min: undefined, sales_growth_min: undefined,
    ema200_state: undefined, de_max: undefined, promoter_min: undefined, dividend_yield_min: undefined, pledge_max: undefined,
    delivery_pct_min: undefined, insider_30d: undefined, deal_30d: undefined,
  });
  const f = { ...EMPTY_FUND, deMax: "0.5", promoterMin: "50", dividendYieldMin: "2", pledgeMax: "10", deliveryMin: "60", insider: "net_buying" as const, deal30d: true };
  const p = fundParams(f);
  assert.equal(p.de_max, 0.5);
  assert.equal(p.promoter_min, 50);
  assert.equal(p.dividend_yield_min, 2);
  assert.equal(p.pledge_max, 10);
  assert.equal(p.delivery_pct_min, 60);
  assert.equal(p.insider_30d, "net_buying");
  assert.equal(p.deal_30d, true);
  const chips = fundChips(f, () => undefined).map((c) => c.text).join(" | ");
  for (const t of ["Debt-to-equity ≤ 0.5", "Promoter holding ≥ 50%", "Dividend yield ≥ 2%", "Promoter pledge ≤ 10%", "Delivery ≥ 60%", "Insider net buying (disclosed, 30 days)", "Bulk/block deal disclosed (30 days)"]) {
    assert.ok(chips.includes(t), `chip: ${t}`);
  }
  assert.ok(!FORBIDDEN.test(chips), "chips use no forbidden word");
  const src = read("components/app/signals/FundamentalFilters.tsx");
  assert.ok(src.includes("ROCE is not stored"), "the filters panel says ROCE cannot be filtered");
  assert.ok(src.includes("is not matched by it"), "the panel says a stock missing the figure is not matched");
}

// ---- My screens
{
  const src = read("components/app/signals/MyScreens.tsx");
  assert.ok(src.includes("added since your last view"), "neutral wording for the difference");
  assert.ok(src.includes("First time you open"), "first view shows no difference");
  assert.ok(src.includes("{STANDARD_LINE}"), "the panel carries the one-sentence line");
  assert.ok(!FORBIDDEN.test(stripStandard(src.replace(/e\.target\./g, "e.t.").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""))), "My screens text has no forbidden word");
  assert.ok(read("components/app/signals/SignalsExplorer.tsx").includes("<MyScreens"), "the Screener shows My screens");
}

// ---- data-coverage line
{
  const full = {
    fetched_on: "2026-11-11",
    valuation: { pe_ttm: 20, roe_ttm: 12, pb: 3, debt_to_equity: 0.4 },
    quarterly: { latest_quarter_end: "2026-09-30", revenue: 100, pat: 10, eps: 2 },
    shareholding: { promoter_pct: 55 },
  } as never;
  assert.equal(coverageLine(full), "Fundamentals: 30 Sep 2026 quarter, fetched 11 Nov; 8 of 8 figures available.");
  const part = { fetched_on: "2026-11-11", valuation: { pe_ttm: null, roe_ttm: 12, pb: null, debt_to_equity: 0.4 }, quarterly: { latest_quarter_end: "2026-09-30", revenue: 100, pat: 10, eps: 2 }, shareholding: { promoter_pct: 55 } } as never;
  assert.equal(coverageLine(part), "Fundamentals: 30 Sep 2026 quarter, fetched 11 Nov; 6 of 8 figures available (not available: P/E, price to book).");
  assert.equal(fundamentalsCoverage(null).available, 0);
  assert.equal(coverageLine(null), "Fundamentals: no reported figures are stored for this stock.");
  const page = read("app/(seo)/stocks/[symbol]/page.tsx");
  assert.ok(page.includes("coverageLine(f)") && page.includes('data-testid="data-coverage"'));
  assert.ok(page.includes('id="industry-median"') && page.includes("Against the industry median"));
  assert.ok(page.includes("An industry needs at least"), "the median section explains the five-stock minimum");
  assert.ok(!/\b(better|worse)\b/i.test(page.match(/id="industry-median"[\s\S]*?<\/Section>/)?.[0] ?? ""), "industry section: no better/worse");
}

// ---- data sources page
{
  const page = read("app/(app)/more/data-sources/page.tsx");
  assert.ok(page.includes("getDataStatus") && page.includes("Newest data:"), "as-of dates come from the data");
  assert.ok(page.includes("How many stocks have each field") && page.includes("What “Not available” means"));
  assert.ok(!page.includes("StandardLineNote"), "the footer carries the sentence; no per-page block");
  assert.ok(!/UNRESOLVED, flagged not fixed/.test(page), "the stale cadence comment is gone");
  assert.ok(!FORBIDDEN.test(stripStandard(page.replace(/\/\/.*$/gm, ""))), "data-sources page has no forbidden word");
}

// ---- account alerts: the digest switch is off until turned on, with an unsubscribe note
{
  const alerts = read("app/(app)/account/alerts/page.tsx");
  assert.ok(alerts.includes("watchlist_digest") && alerts.includes("Off until you turn it on; every email has an unsubscribe link."));
}

console.log("prompt 5 tests: ok");
