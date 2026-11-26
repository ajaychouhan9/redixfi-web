// Funnel, sign-up, trial and yearly plans (26 Nov 2026): source-level checks of what must stay true.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");

// analytics: our own events, no vendor package, no cookie, scripts do not count as visitors
const a = read("lib/analytics.ts");
assert.ok(!a.includes("@vercel/analytics") && a.includes("sendFunnelEvent") && a.includes("navigator.webdriver") && read("lib/api/mutations.ts").includes('"/events", "POST"') && read("lib/lookup-grants.ts").includes("events|ask"), "own events endpoint, no Vercel");
for (const pair of ['trial_cta_click: "start_free_click"', 'signup_started: "signup_started"', 'pricing_viewed: "pricing_view"']) assert.ok(a.includes(pair), pair);
assert.ok(a.includes("utm_source") && a.includes("entry"), "UTM and entry page");

// Clarity: only with an id, every input masked, private pages masked
const si = read("components/app/SiteInsights.tsx");
assert.ok(si.includes("NEXT_PUBLIC_CLARITY_ID") && si.includes("data-clarity-mask") && si.includes('"/account"') && si.includes("clarity.ms/tag/") && si.includes("if (!CLARITY_ID) return null"), "Clarity gated by id and masked");
assert.ok(read("app/layout.tsx").includes("<SiteInsights />") && read("app/layout.tsx").includes("cloudflareinsights"), "mounted on every page, Cloudflare beacon kept");
const privacy = read("app/(app)/more/privacy/page.tsx");
assert.ok(privacy.includes("Microsoft Clarity") && privacy.includes("Cloudflare Web Analytics") && privacy.includes("random browser id") && !privacy.includes("Vercel Web Analytics"), "Privacy page describes the analytics");

// sign-up: one screen, Google first, one-tap, lands on the stock
const login = read("app/(app)/login/page.tsx");
assert.ok(login.includes("GoogleOneTap") && login.includes("redixfi:last-stock") && login.includes('track("signup_started")'), "one-tap, last stock, funnel step");
assert.ok(read("components/app/GoogleOneTap.tsx").includes("NEXT_PUBLIC_GOOGLE_CLIENT_ID") && read("components/app/GoogleOneTap.tsx").includes("if (!CLIENT_ID) return;"), "one-tap needs the owner's client id");
assert.ok(read("components/app/CurrentSymbolSync.tsx").includes("redixfi:last-stock"), "the stock page remembers itself");

// visitor Ask AI, inline prompts, no wall
const anon = read("components/app/ask/AnonAsk.tsx");
assert.ok(read("lib/api/mutations.ts").includes("/ask/anon") && anon.includes("askAnonymous") && anon.includes("Sign up free to ask more and start your 5-day Pro trial."), "one free question, then sign up");
assert.ok(read("components/app/ask/AskRedixFi.tsx").includes("<AnonAsk symbol={pageSymbol}"), "the panel offers it to a visitor");
for (const f of ["components/app/stock/StockActions.tsx", "components/app/stock/QuickReads.tsx", "components/app/signals/MyScreens.tsx"]) assert.ok(read(f).includes("InlineSignup"), `${f} has an inline prompt`);
assert.ok(read("components/app/InlineSignup.tsx").includes("if (user) return null"), "the prompt hides for a signed-in visitor");

// trial: day-4 banner, guide, exit question
assert.ok(read("components/layout/TrialStatusBar.tsx").includes("Your Pro trial ends tomorrow"), "day-4 banner");
const tg = read("components/app/TrialGuides.tsx");
assert.ok(tg.includes("Search a stock") && tg.includes("Read Points to watch") && tg.includes("Ask AI one question") && tg.includes("What stopped you?"), "guide and question");
assert.ok(read("components/app/billing/CheckoutView.tsx").includes("checkoutClosed") && read("components/app/billing/PlanCard.tsx").includes("ondismiss"), "question after closing checkout");

// yearly plans
const cv = read("components/app/billing/CheckoutView.tsx");
assert.ok(cv.includes('useState<"monthly" | "annual">("annual")') && cv.includes("basic_annual_1499") && cv.includes("pro_annual_2499"), "yearly first, new plan ids");
assert.ok(read("components/app/billing/PlanCard.tsx").includes("/month, billed yearly"), "per-month line");
assert.equal(Math.round(1499 / 12), 125);
assert.equal(Math.round(2499 / 12), 208);
assert.ok(read("lib/seo/page-meta.ts").includes("Rs 1,499 a year") && read("lib/seo/page-meta.ts").includes("Rs 2,499 a year"), "pricing meta");
console.log("funnel tests: ok");
