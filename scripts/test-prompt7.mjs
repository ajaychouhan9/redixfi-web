/* Prompt 7 guard (14 Nov 2026): one footer sentence everywhere, the registration statement on ONE page, no owner name or address outside the
 * four legal/about pages, no registration/approval claims, the strict refund wording. Fails the build (it is part of check:wording). */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8");
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const files = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? files(p) : /\.(tsx?|mjs)$/.test(n) ? [p] : []; });
const all = files(SRC).map((p) => ({ rel: relative(SRC, p).replace(/\\/g, "/"), text: readFileSync(p, "utf8") }));

const ONE = "RedixFi shows market data for information only. It gives no buy or sell advice or predictions.";
const FULL = "RedixFi is not a SEBI-registered Research Analyst or Investment Adviser. It provides measured market data and analytics only: not investment advice, recommendations or predictions.";

// ---- the sentence constants
const std = read("lib/compliance/standard-line.ts");
assert.ok(std.includes(`STANDARD_LINE = "${ONE}"`), "STANDARD_LINE is the one sentence");
assert.ok(std.includes(FULL), "the full statement exists in one constant");

// ---- the full statement: only the Disclaimer page may import or print it
const LEGAL_SOURCES = ["app/(app)/more/disclaimer/page.tsx", "app/(app)/more/terms/page.tsx", "app/(app)/more/privacy/page.tsx", "app/(app)/more/refund-policy/page.tsx", "app/(app)/more/about-us/page.tsx", "lib/legal.ts", "lib/compliance/standard-line.ts"];
for (const f of all) {
  if (f.rel === "lib/compliance/standard-line.ts") continue;
  assert.ok(!f.text.includes("SEBI-registered Research Analyst"), `${f.rel}: the full statement may only live in standard-line.ts and be shown on /more/disclaimer`);
  if (f.rel !== "app/(app)/more/disclaimer/page.tsx") assert.ok(!f.text.includes("FULL_DISCLAIMER_LINE"), `${f.rel}: FULL_DISCLAIMER_LINE is for the Disclaimer page only`);
}
const disclaimer = read("app/(app)/more/disclaimer/page.tsx");
assert.ok(disclaimer.includes("{FULL_DISCLAIMER_LINE}"), "the Disclaimer page prints the full statement");
for (const need of ["information only", "not advice to buy or sell any stock", "no predictions", "delayed or incomplete"]) assert.ok(disclaimer.replace(/\s+/g, " ").includes(need) || disclaimer.includes(need), `disclaimer: ${need}`);
const terms = read("app/(app)/more/terms/page.tsx");
assert.ok(terms.includes("/more/disclaimer") && !terms.includes("STANDARD_LINE") && !terms.includes("FULL_DISCLAIMER_LINE") && !terms.includes("Research Analyst"), "Terms links to the disclaimer and does not repeat the sentence");
assert.ok(read("app/sitemap.xml/route.ts").includes('"/more/disclaimer"'), "disclaimer in the sitemap");

// ---- words that claim status or approval: forbidden outside the Disclaimer page and the legal-page sources
const CLAIMS = [/SEBI[- ]registered/i, /\bregulated\b/i, /approved by/i, /SEBI[- ]compliant/i, /SEBI[- ]approved/i, /trusted by/i, /not registered/i];
for (const f of all) {
  if (LEGAL_SOURCES.includes(f.rel) || f.rel.endsWith(".mjs")) continue;
  const body = strip(f.text);
  for (const re of CLAIMS) assert.ok(!re.test(body), `${f.rel}: forbidden status/approval wording ${re}`);
}
for (const f of LEGAL_SOURCES) { // even the legal pages never say "regulated", "approved by" or "SEBI compliant"
  if (f === "lib/compliance/standard-line.ts") continue;
  const body = strip(read(f));
  for (const re of [/\bregulated\b/i, /approved by/i, /SEBI[- ]compliant/i, /SEBI[- ]approved/i, /trusted by/i]) assert.ok(!re.test(body), `${f}: ${re}`);
}

// ---- the owner's name and address: only legal.ts defines them, only the four legal/about pages use them
const FOUR = ["app/(app)/more/terms/page.tsx", "app/(app)/more/privacy/page.tsx", "app/(app)/more/refund-policy/page.tsx", "app/(app)/more/about-us/page.tsx"];
for (const f of all) {
  if (f.rel === "lib/legal.ts") continue;
  assert.ok(!/Ajay Chouhan|PB-197|BPTP Pride|Faridabad/.test(f.text), `${f.rel}: the owner's name or address is spelled out outside lib/legal.ts`);
  if (!FOUR.includes(f.rel)) assert.ok(!/LEGAL\.(operator|address|grievanceOfficer|court)/.test(f.text), `${f.rel}: uses the owner's name/address, which belong on the four legal/about pages only`);
}
assert.ok(!existsSync(join(SRC, "components/layout/TrustStrip.tsx")), "no trust strip");

// ---- the footer: exactly four lines, one component for every layout
const footer = read("components/layout/FooterDisclaimer.tsx");
assert.ok(footer.includes('"© 2026 RedixFi"') && footer.includes("{STANDARD_LINE}") && footer.includes('"Data: NSE and company filings. NSE prices are delayed by 15 minutes."'), "footer lines 1 to 3");
const order = ["/more/about-us", "Support:", "mailto:", "/more/terms", "/more/privacy", "/more/refund-policy", "/more/disclaimer"].map((s) => footer.indexOf(s));
assert.ok(order.every((n) => n > 0) && order.every((n, i) => i === 0 || n > order[i - 1]), "footer links in order: About, Support, Terms, Privacy, Refund policy, Disclaimer");
assert.equal((footer.match(/<p[ >]/g) ?? []).length, 4, "footer has exactly four lines");
assert.ok(!/SEBI|Ajay|Faridabad|LEGAL\.(operator|address)/.test(strip(footer)), "footer has no name, address or SEBI text");
assert.ok(read("app/(app)/layout.tsx").includes("<FooterDisclaimer />") && read("app/(seo)/layout.tsx").includes("<FooterDisclaimer />"), "app and public layouts both use the footer");
for (const f of all) assert.ok(!f.text.includes("StandardLineNote"), `${f.rel}: no per-page standard line block`);

// ---- Ask AI, CSV, alerts, llms.txt carry the sentence
assert.ok(read("components/app/ask/AskRedixFi.tsx").includes("COMPLIANCE_LINE = STANDARD_LINE"), "Ask AI surface carries the sentence");
assert.ok(read("lib/screener-columns.ts").includes("STANDARD_LINE"), "CSV first row is the sentence");
assert.ok(read("lib/alertFooter.ts").includes(ONE), "alert footer");
assert.ok(read("app/llms.txt/route.ts").includes(ONE), "llms.txt");

// ---- refund wording: the strict policy, and none of the old pro-rata wording anywhere in displayed text
const refund = read("app/(app)/more/refund-policy/page.tsx");
for (const need of ["not refunded once the plan is active", "Cancelling does not refund", "stays active until the end of the period you paid for", "does not renew automatically", "5-day free Pro trial", "charged more than once", "not activated", "payment id", "original payment method", "5 to 7 working days", "Top-ups and add-ons"]) assert.ok(refund.includes(need), `refund policy: ${need}`);
for (const f of all) {
  if (f.rel.endsWith(".mjs")) continue;
  assert.ok(!/pro-?rata|days left|unused part|Cancel anytime|cancel anytime/i.test(strip(f.text)), `${f.rel}: old refund wording`);
}
for (const rel of ["app/(app)/more/terms/page.tsx", "components/app/billing/CheckoutView.tsx"]) assert.ok(read(rel).includes("not refunded once the plan is active"), `${rel}: strict refund wording`);
const card = read("components/app/account/SubscriptionStatusCard.tsx");
assert.ok(card.includes("stays active until") && card.includes("does not renew automatically") && !/refunded/.test(strip(card).replace("Cancelling does not refund", "")), "account: cancel shows the end date, never a refund");
assert.ok(read("components/app/HomePricingSection.tsx").includes("No automatic renewal"), "home pricing: no cancel-anytime promise");

console.log("prompt 7 guard: ok");
