// Web conversion fixes (16 Nov 2026): hero copy, home labels, stock-page sign-up offer, robots rules, analytics beacon,
// Ask panel logged-out tabs. Static checks of the source plus the pure label helpers.
// Run: npm run test:conversion   (part of check:wording)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import robots from "../src/app/robots.ts";
import { BASIC_FEATURES } from "../src/data/plan-features.ts";
import { LIVE_LABEL, DELAYED_FEED_LABEL, atCloseLabel, briefSessionLabel, readingsLabel } from "../src/lib/market-labels.ts";

const root = new URL("../src/", import.meta.url);
const read = (rel: string) => readFileSync(new URL(rel, root), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

// ---- 1. analytics: Cloudflare beacon only when the token is set; the dead Vercel component is gone
{
  const layout = read("app/layout.tsx");
  assert.ok(!layout.includes("@vercel/analytics"), "root layout no longer mounts Vercel Analytics");
  assert.ok(layout.includes("NEXT_PUBLIC_CF_BEACON_TOKEN"), "beacon is gated on NEXT_PUBLIC_CF_BEACON_TOKEN");
  assert.ok(layout.includes("static.cloudflareinsights.com/beacon.min.js") && layout.includes('strategy="lazyOnload"'), "beacon loads lazily");
  assert.ok(/\{CF_BEACON_TOKEN && \(/.test(layout), "with no token nothing is rendered");
}

// ---- 2. home labels
{
  assert.equal(LIVE_LABEL, "Live (15 min delayed)");
  assert.equal(DELAYED_FEED_LABEL, "Feed delayed");
  assert.equal(atCloseLabel("2026-11-13"), "At 13 Nov close");
  assert.equal(readingsLabel("Readings as of 13 Nov close"), "Readings at 13 Nov close");
  assert.equal(readingsLabel("something else"), "something else");
  assert.equal(readingsLabel(null), null);
  // 08:10 IST is before the open; 09:30 IST is the morning session; close is after the close
  assert.equal(briefSessionLabel("morning", "2026-11-16T02:40:00+00:00"), "Before the open");
  assert.equal(briefSessionLabel("morning", "2026-11-16T04:00:00+00:00"), "Morning session");
  assert.equal(briefSessionLabel("close", "2026-11-16T11:00:00+00:00"), "After the close");
  assert.equal(briefSessionLabel("morning", null), "Morning brief");

  const strip_ = read("components/app/MarketStatusStrip.tsx");
  assert.ok(strip_.includes("LIVE_LABEL") && strip_.includes("atCloseLabel(session.breadth_date)"), "status strip labels live and closing figures");
  assert.ok(!strip_.includes("Prices are delayed or as of the last update"), "old unlabelled line is gone from the strip");
  for (const f of ["components/ui/FreshnessDot.tsx", "components/layout/Sidebar.tsx"]) {
    assert.ok(!strip(read(f)).includes("Market feed live"), `${f}: no bare "Market feed live"`);
  }
  assert.ok(read("components/layout/MarketRibbon.tsx").includes("readingsLabel(signalsAsOf)"), "ribbon readings label");

  const brief = read("components/app/AiDailyBriefCard.tsx");
  assert.ok(brief.includes("briefSessionLabel(brief.period, brief.created_at)") && !strip(brief).includes('"Morning session"'), "brief label follows the time written");

  const pulse = read("components/app/MarketPulseCard.tsx");
  assert.ok(pulse.includes("change against the") && pulse.includes("NSE sector indices") && pulse.includes("sectors_up.toLocaleString"), "pulse: VIX window, sector label, separators");

  const news = read("components/app/EventRiskCard.tsx");
  assert.ok(news.includes("listed && readCount") && news.includes("none listed here yet"), "news card: one consistent state");

  const act = read("components/app/MarketActivityCard.tsx");
  assert.ok(act.includes("total_findings.toLocaleString") && act.includes("distinct_filings.toLocaleString") && act.includes("count.toLocaleString"), "activity counts carry separators");
}

// ---- 3. hero
{
  const hero = strip(read("components/app/VisitorIntroStrip.tsx"));
  assert.ok(hero.includes("Check any NSE stock in minutes: delivery, insider trades, governance disclosures and concall summaries."), "headline");
  assert.ok(hero.includes("Plain-language data for 2,000+ NSE stocks, updated daily. No buy or sell advice."), "sub-line");
  assert.ok(hero.includes("Start free") && hero.includes("See a sample report") && hero.includes('href="/sample-report"'), "buttons");
  assert.ok(hero.includes("-day free Pro trial. No payment details needed."), "trial line kept");
  assert.ok(!hero.includes("not an advisor") && !hero.includes("Screener-style"), "disclaimer box replaced by the sub-line");
  assert.ok(!/red flags?/i.test(hero), "no 'red flags' in the hero");
  assert.ok(hero.includes("if (user) return null"), "hero is logged-out only");
}

// ---- 4. home order
{
  const page = read("app/(app)/page.tsx");
  assert.ok(page.includes("<HomeSections") && page.includes("hero={<VisitorIntroStrip />}"), "home page renders through HomeSections");
  const sections = strip(read("components/app/HomeSections.tsx"));
  const guest = sections.slice(sections.lastIndexOf("return ("));
  const order = ["{hero}", "{priceMovers}", "{askSample}", "{sampleReport}", "{pricing}", "{marketStatus}"].map((k) => guest.indexOf(k));
  assert.ok(order.every((i, n) => i >= 0 && (n === 0 || i > order[n - 1])), `logged-out order: hero, movers, ask sample, sample report, pricing, then the rest (${order.join(",")})`);
  const member = sections.slice(sections.indexOf("if (user)"), sections.lastIndexOf("return ("));
  const old = ["{hero}", "{marketStatus}", "{priceMovers}", "{yourStocks}", "{brief}", "{pulse}", "{newsAndIntraday}", "{marketActivity}", "{sampleReport}", "{shortcuts}"].map((k) => member.indexOf(k));
  assert.ok(old.every((i, n) => i >= 0 && (n === 0 || i > old[n - 1])), "logged-in order unchanged");
  assert.ok(read("components/app/marketing/AskAiTeaserCard.tsx").includes("Dhruv Consultancy Services Ltd (DHRUV)"), "Ask sample names the company");
}

// ---- 5. stock-page sign-up offer
{
  const offer = strip(read("components/app/StockSignupOffer.tsx"));
  assert.ok(offer.includes('"use client"') && offer.includes("useAuth()") && offer.includes("if (user) return null"), "offer is a client component for logged-out visitors");
  assert.ok(offer.includes("Get the full {companyName} report free.") && offer.includes("-day Pro trial, no payment details.") && offer.includes("Start free"), "offer text");
  assert.ok(offer.includes("/login?mode=signup&next="), "returns to the same page");
  for (const f of ["app/(seo)/stocks/[symbol]/page.tsx", "app/(seo)/stocks/[symbol]/concall-summary/page.tsx", "app/(seo)/stocks/[symbol]/rewind/page.tsx"]) {
    const t = strip(read(f));
    assert.equal((t.match(/<StockSignupOffer /g) ?? []).length, 2, `${f}: offer after the first data block and near the end`);
    assert.ok(!t.includes("<TrialCta") && !t.includes("Sign up free"), `${f}: the old sign-up blocks are replaced`);
    assert.ok(/export const revalidate = \d+/.test(t) && t.includes("generateStaticParams"), `${f}: still ISR`);
    assert.ok(!/\b(cookies|headers)\(\)|searchParams/.test(t), `${f}: no request-bound API`);
  }
}

// ---- 6. robots
{
  const r = robots();
  const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
  const general = rules[0];
  const search = rules.find((x) => Array.isArray(x.userAgent) && x.userAgent.includes("OAI-SearchBot"));
  const training = rules.find((x) => Array.isArray(x.userAgent) && x.userAgent.includes("GPTBot"));
  assert.ok(search && training, "search and training rule blocks exist");
  for (const ua of ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Claude-SearchBot", "Claude-User"]) {
    assert.ok((search!.userAgent as string[]).includes(ua) && !(training!.userAgent as string[]).includes(ua), `${ua} is allowed`);
  }
  for (const ua of ["GPTBot", "CCBot", "Bytespider", "ClaudeBot", "Amazonbot", "Meta-ExternalAgent"]) {
    assert.ok((training!.userAgent as string[]).includes(ua), `${ua} stays blocked`);
  }
  assert.equal(training!.disallow, "/");
  assert.deepEqual(search!.disallow, general.disallow, "AI search agents get the same disallow list (incl. /signals/ and /research/)");
  assert.deepEqual(search!.allow, general.allow);
  assert.equal(search!.crawlDelay, 5);
  assert.equal(general.crawlDelay, 5);
  const dis = general.disallow as string[];
  assert.ok(dis.includes("/signals/") && dis.includes("/research/"), "/signals/ and /research/ rules kept");
}

// ---- 7. small fixes
{
  assert.ok(!/\bin Free\b/.test(BASIC_FEATURES[0]), `Basic does not refer to a Free plan card: ${BASIC_FEATURES[0]}`);
  const ask = strip(read("components/app/ask/AskRedixFi.tsx"));
  assert.equal((ask.match(/Log in to see this\./g) ?? []).length, 2, "History and Usage tabs say 'Log in to see this' when logged out");
  assert.ok(ask.includes("{!user ? (") && ask.includes("{user ? <AskQuota usage={usage} detailed />"), "tabs gated on user");
}

// ---- 8. compliance of the new strings
{
  const added = [
    "Check any NSE stock in minutes: delivery, insider trades, governance disclosures and concall summaries.",
    "Plain-language data for 2,000+ NSE stocks, updated daily.",
    "Get the full report free. Pro trial, no payment details. Start free See a sample report",
    "Live (15 min delayed) At 13 Nov close Readings at 13 Nov close Before the open Morning session After the close Feed delayed",
    "NSE sector indices higher and lower than their previous close change against the previous close",
    "read for this session; none listed here yet. Free plans see headlines after a 24-hour delay. Log in to see this. Everything a free account has, and:",
  ].join("\n");
  const hits = added.match(/\b(buy|sell|target|likely|expected|bullish|bearish|recommend\w*|predict\w*|picks?|tips?|outlook|red flags?)\b/gi) ?? [];
  assert.deepEqual(hits, [], "no recommendation language in the new strings");
}

console.log("conversion fixes: ok");
