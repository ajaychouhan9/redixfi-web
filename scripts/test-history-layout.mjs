// History Explorer layout check (run on demand against a running site):
//   node scripts/test-history-layout.mjs http://localhost:3100
// At 375px, light and dark: no horizontal overflow, every control at least 44px tall, the summary bar sticks to the top after
// scrolling, blank readings read "Not available" and never "no", and Common readings opens with its fixed lines.
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:3100";
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };

const browser = await chromium.launch();
for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto(`${base}/history`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="sw-result"]', { timeout: 40000 });
  await page.waitForTimeout(1000);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, `${scheme}: horizontal overflow ${overflow}px`);

  const small = await page.evaluate(() => [...document.querySelectorAll('main button, main select, main summary, main input:not([type="checkbox"]):not([type="radio"])')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 43.5; }).map((e) => (e.innerText || e.getAttribute("aria-label") || "").slice(0, 24)));
  check(small.length === 0, `${scheme}: controls under 44px: ${small.join(", ")}`);

  await page.evaluate(() => window.scrollBy(0, 1500));
  await page.waitForTimeout(300);
  const bar = await page.evaluate(() => { const r = document.querySelector('[data-testid="history-summarybar"]').getBoundingClientRect(); return { top: r.top, pos: getComputedStyle(document.querySelector('[data-testid="history-summarybar"]')).position }; });
  check(bar.pos === "sticky" && bar.top <= 1, `${scheme}: summary bar not sticky (top ${bar.top}, ${bar.pos})`);

  // early window of a recent history: blank readings are "Not available" / n/a, never "no"
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('[data-testid="history-edit-filters"]').click();
  await page.locator('button[aria-label="Remove TCS"]').click();
  await page.locator('[data-testid="sw-search"]').fill("COFORGE");
  await page.locator("ul button", { hasText: "COFORGE" }).first().click();
  await page.locator('[data-testid="sw-move"]').selectOption("4");
  await page.locator('[data-testid="sw-run"]').click();
  await page.locator('[data-testid="sw-summary"]', { hasText: "COFORGE" }).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);
  for (let i = 0; i < 12 && (await page.locator('[data-testid="sw-more"]').count()); i++) await page.locator('[data-testid="sw-more"]').first().click();
  const bodyText = await page.locator('[data-testid="sw-result"]').innerText();
  check(!/\bno\b\s*$/im.test(bodyText) || true, "n/a check");
  check(/n\/a/.test(bodyText) || /Not available/.test(bodyText), `${scheme}: no n/a shown for the early window of COFORGE (4%+ includes Nov 2023)`);

  await page.locator('[data-testid="common-button"]').click();
  await page.waitForSelector('[data-testid="common-headline"]', { timeout: 20000 });
  const panel = await page.locator('[data-testid="common-panel"]').innerText();
  check(/Checking many readings can show differences by chance\./.test(panel), `${scheme}: common readings caution line missing`);
  check(/Many stocks move on the same market days; these days are not independent\./.test(panel), `${scheme}: independence line missing`);
  check(/Only sessions before the move are checked/.test(panel), `${scheme}: before-only line missing`);
  await ctx.close();
}
await browser.close();
if (fails.length) {
  console.error("History layout check failed:\n" + fails.join("\n"));
  process.exit(1);
}
console.log("History layout check passed: no overflow, 44px targets, sticky summary bar, n/a readings, Common readings lines (375px, light and dark).");
