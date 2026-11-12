/* The legal pages, their links and the consent step exist (11 Nov 2026). Source-level checks; the pages themselves are text. */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8");

for (const p of ["terms", "privacy", "refund-policy"]) {
  assert.ok(existsSync(join(SRC, `app/(app)/more/${p}/page.tsx`)), `${p} page missing`);
  assert.ok(read("app/sitemap.xml/route.ts").includes(`"/more/${p}"`), `${p} missing from the sitemap`);
  assert.ok(read("lib/legal.ts").includes(`/more/${p}`), `${p} missing from LEGAL_LINKS`);
}
// every footer and the Subscribe button carry the three links
assert.ok(read("components/app/billing/PlanCard.tsx").includes("LegalLinks"), "PlanCard: legal links missing");
for (const href of ["/more/about-us", "/more/terms", "/more/privacy", "/more/refund-policy", "/more/disclaimer"]) assert.ok(read("components/layout/FooterDisclaimer.tsx").includes(href), `footer: ${href}`);
assert.ok(read("app/(seo)/layout.tsx").includes("<FooterDisclaimer />") && read("app/(app)/layout.tsx").includes("<FooterDisclaimer />"), "both layouts use the one footer");
// About & Contact shows who operates the site
const about = read("app/(app)/more/about-us/page.tsx");
for (const need of ["LEGAL.operator", "LEGAL.address", "LEGAL.grievanceOfficer"]) assert.ok(about.includes(need), `about-us: ${need}`);
const legal = read("lib/legal.ts");
for (const need of ["Ajay Chouhan", "PB-197-SF, BPTP Pride, Sector 77, Faridabad, Haryana 121004", "support@redixfi.com", "Faridabad, Haryana"]) assert.ok(legal.includes(need), `legal.ts: ${need}`);
// sign-up: an unticked box, required before an account is made
const login = read("app/(app)/login/page.tsx");
assert.ok(login.includes('useState(false)') && login.includes("I agree to the") && login.includes('(mode === "signup" && !agree)'), "login: unticked consent box that gates sign-up");
// the consent step for Google, phone and existing accounts, mounted for every page
assert.ok(read("components/app/ConsentGate.tsx").includes("terms_accepted !== false"), "ConsentGate: asks only when the server says false");
assert.ok(read("app/layout.tsx").includes("<ConsentGate />"), "ConsentGate is not mounted");
// Subscribe stays behind the consent: the button is the trial until the terms are accepted
assert.ok(read("components/app/billing/PlanCard.tsx").includes("user.terms_accepted === true"), "PlanCard: Subscribe needs accepted terms");
console.log("legal pages and consent step: ok");
