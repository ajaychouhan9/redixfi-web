// Conversion fixes of 16 Nov 2026 that are still live after the 17 Nov restructure: the analytics beacon, the time-basis labels, the robots
// rules, the Basic card wording, the logged-out Ask AI tabs and the sign-up offers on the stock page. (The hero, the home order and the stock
// page structure moved on 17 Nov; their checks are in scripts/test-restructure.ts.)
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

// ---- 2. time-basis labels
{
  assert.equal(LIVE_LABEL, "Live (15 min delayed)");
  assert.equal(DELAYED_FEED_LABEL, "Feed delayed");
  assert.equal(atCloseLabel("2026-11-13"), "At 13 Nov close");
  assert.equal(readingsLabel("Readings as of 13 Nov close"), "Readings at 13 Nov close");
  assert.equal(readingsLabel("something else"), "something else");
  assert.equal(readingsLabel(null), null);
  assert.equal(briefSessionLabel("morning", "2026-11-16T02:40:00+00:00"), "Before the open");
  assert.equal(briefSessionLabel("morning", "2026-11-16T04:00:00+00:00"), "Morning session");
  assert.equal(briefSessionLabel("close", "2026-11-16T11:00:00+00:00"), "After the close");
  assert.equal(briefSessionLabel("morning", null), "Morning brief");
  const pulse = read("components/app/MarketPulseCard.tsx");
  assert.ok(pulse.includes("change against the") && pulse.includes("NSE sector indices") && pulse.includes("sectors_up.toLocaleString"), "pulse: VIX window, sector label, separators");
  const act = read("components/app/MarketActivityCard.tsx");
  assert.ok(act.includes("total_findings.toLocaleString") && act.includes("distinct_filings.toLocaleString") && act.includes("count.toLocaleString"), "activity counts carry separators");
  assert.ok(!strip(read("components/ui/FreshnessDot.tsx")).includes("Market feed live"), "no bare 'Market feed live'");
}

// ---- 3. robots
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
  assert.deepEqual(search!.disallow, general.disallow, "AI search agents get the same disallow list");
  assert.deepEqual(search!.allow, general.allow);
  assert.equal(search!.crawlDelay, 5);
  assert.equal(general.crawlDelay, 5);
  const dis = general.disallow as string[];
  assert.ok(dis.includes("/signals/") && dis.includes("/research/"), "/signals/ and /research/ rules kept");
}

// ---- 4. small fixes
{
  assert.ok(!/\bin Free\b/.test(BASIC_FEATURES[0]), `Basic does not refer to a Free plan card: ${BASIC_FEATURES[0]}`);
  const ask = strip(read("components/app/ask/AskRedixFi.tsx"));
  assert.equal((ask.match(/Log in to see this\./g) ?? []).length, 2, "History and Usage tabs say 'Log in to see this' when logged out");
  assert.ok(ask.includes("{!user ? (") && ask.includes("{user ? <AskQuota usage={usage} detailed />"), "tabs gated on user");
}

// ---- 5. sign-up offers on the one stock page: client component, logged-out only, two on the page (Overview and the foot)
{
  const offer = strip(read("components/app/StockSignupOffer.tsx"));
  assert.ok(offer.includes('"use client"') && offer.includes("useAuth()") && offer.includes("if (user) return null"), "offer is a client component for logged-out visitors");
  assert.ok(offer.includes("Get the full {companyName} report free.") && offer.includes("-day Pro trial, no payment details.") && offer.includes("Start free"), "offer text");
  assert.ok(offer.includes("/login?mode=signup&next="), "returns to the same page");
  const t = strip(read("app/(app)/stocks/[symbol]/page.tsx"));
  assert.equal((t.match(/<StockSignupOffer /g) ?? []).length, 2, "one offer in the Overview and one at the foot of the page");
}

// ---- 6. compliance of the strings added since 16 Nov
{
  const added = [
    "Live (15 min delayed) At 13 Nov close Readings at 13 Nov close Before the open Morning session After the close Feed delayed",
    "NSE sector indices higher and lower than their previous close change against the previous close",
    "read for this session; none listed here yet. Free plans see headlines after a 24-hour delay. Log in to see this. Everything a free account has, and:",
  ].join("\n");
  const hits = added.match(/\b(buy|sell|target|likely|expected|bullish|bearish|recommend\w*|predict\w*|picks?|tips?|outlook|red flags?)\b/gi) ?? [];
  assert.deepEqual(hits, [], "no recommendation language in the strings");
}

console.log("conversion fixes: ok");
