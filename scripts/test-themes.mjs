// Phase 1c (18 Nov 2026): three themes, the picker, the footer links, the top-up information card, the pricing rows and the preview page.
import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const css = read("app/globals.css");
const layout = read("app/layout.tsx");
const ctx = read("lib/theme/ThemeContext.tsx");

// contrast helper (WCAG)
const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
function block(selector) {
  const i = css.indexOf(selector);
  assert.ok(i >= 0, `${selector} exists`);
  return css.slice(i, css.indexOf("\n}", i));
}
const v = (b, name) => b.match(new RegExp(`${name}:[ ]*(#[0-9a-fA-F]{6})`))[1];

// 1. all three themes are defined, and the page applies a stored choice before first paint
for (const t of ["light", "dark", "premium"]) {
  assert.ok(css.includes(`:root[data-theme="${t}"]`), `${t} theme block`);
  assert.ok(css.includes(`[data-preview="${t}"]`), `${t} preview scope`);
}
assert.ok(layout.includes('t!=="premium"'), "the first-paint script accepts premium");
assert.ok(layout.includes("matchMedia"), "default still follows the device setting");
assert.ok(ctx.includes('"premium"') && ctx.includes("redixfi:theme"), "stored choice includes premium");

// 2. text pairs of the premium theme (and the two fixed light values) are at least 4.5:1
const P = block(':root[data-theme="premium"]');
const bg = v(P, "--background");
const surf = v(P, "--surface");
for (const [name, on] of [["--foreground", bg], ["--foreground", surf], ["--foreground-muted", bg], ["--foreground-muted", surf], ["--foreground-faint", bg], ["--foreground-faint", surf], ["--accent", bg], ["--up", bg], ["--up", surf], ["--down", bg], ["--down", surf], ["--amber", surf], ["--hx-up", bg], ["--hx-down", bg]]) {
  assert.ok(ratio(v(P, name), on) >= 4.5, `premium ${name} on ${on} is ${ratio(v(P, name), on).toFixed(2)}`);
}
assert.ok(ratio(v(P, "--accent-foreground"), v(P, "--accent")) >= 4.5, "premium button text on the accent");
const L = block('[data-preview=' + String.fromCharCode(34) + 'light' + String.fromCharCode(34) + '] {');
assert.ok(ratio(v(L, "--foreground-faint"), v(L, "--background")) >= 4.5, "light faint text on the page background");
assert.ok(ratio(v(L, "--down"), v(L, "--background")) >= 4.5, "light down colour on the page background");
assert.ok(P.includes("Georgia") || css.includes("Georgia"), "premium has serif headings");

// 3. the picker: three choices, in the dropdown and as a header icon for a visitor
const toggle = read("components/ui/ThemeToggle.tsx");
const menu = read("components/layout/AccountMenu.tsx");
assert.ok(ctx.includes('"light"') && ctx.includes('"dark"') && ctx.includes('"premium"'));
assert.ok((menu.match(/<ThemeChoice \/>/g) ?? []).length === 2, "theme choice in both the logged-in and the logged-out panel");
assert.ok(menu.includes("<ThemeToggle />"), "header icon for a logged-out visitor");
assert.ok(toggle.includes('data-testid="theme-button"'));

// 4. footer links
const footer = read("components/layout/FooterDisclaimer.tsx");
for (const h of ["/news", "/volatility", "/sample-report", "/more/about-us", "/more/terms", "/more/privacy", "/more/refund-policy"]) assert.ok(footer.includes(`href="${h}"`), `footer links ${h}`);
for (const h of ["/news", "/volatility", "/sample-report"]) assert.ok(existsSync(new URL(`../src/app/(app)${h}/page.tsx`, import.meta.url)), `${h} page exists`);
const nav = read("lib/nav-items.ts");
for (const h of ["/volatility", "/sample-report", "/news"]) assert.ok(!nav.includes(`"${h}"`), `${h} is not added to the menu`);

// 5. labels
const mo = read("lib/market-overview.ts");
assert.ok(mo.includes('LIVE_TAG = "Live · 15 min delayed"'));
assert.ok(read("lib/home-movers.ts").includes('return "Live · 15 min delayed"'));

// 6. pricing: the prices are unchanged, the Rewind row is right, and the top-up information shows to those who cannot buy
const pf = read("data/plan-features.ts");
assert.ok(!pf.includes("Example filters, 5 rows"), "stale Rewind row gone");
assert.ok(pf.includes("choose the move size"), "Rewind row matches the free Rewind tab");
for (const [id, q, p] of [["ask_topup_50", 50, 99], ["ask_topup_150", 150, 199], ["ask_topup_500", 500, 499], ["ask_topup_1000", 1000, 749]]) {
  assert.ok(pf.includes(`{ id: "${id}", questions: ${q}, priceRupees: ${p} }`), `price of ${id} unchanged`);
}
const co = read("components/app/billing/CheckoutView.tsx");
assert.ok(co.includes("<TopupCard />") && co.includes("<TopupInfo />") && co.includes('profile.tier !== "free" && !profile.is_pro_trial'), "buy button only for paying users");
const tc = read("components/app/billing/TopupCard.tsx");
assert.ok(tc.includes("Log in to buy") && tc.includes("Available on Basic and Pro"));
assert.ok(co.includes('data-testid="plan-matrix-cards"') && co.includes('data-testid="plan-matrix-table"'), "stacked cards on a phone, a table from md");
assert.ok(!co.includes("min-w-[640px]"), "no fixed-width table on a phone");

// 7. the preview page: not indexed, not linked, not in the sitemap
const prev = read("app/(app)/theme-preview/page.tsx");
assert.ok(prev.includes("index: false"));
assert.ok(!read("app/sitemap.xml/route.ts").includes("theme-preview"), "not in the sitemap");
assert.ok(!nav.includes("theme-preview") && !footer.includes("theme-preview"), "not linked");

console.log("themes: all checks passed");
