// Phone-sized UI test for Ask AI clarification buttons + scope chip
// (2026-10-09 UI findings, item 1e). Runs the REAL production build
// (`npm run build && npx next start -p 3123`) in a 390x844 viewport with
// every /api/v1/ call mocked, so no account or live API is needed:
//   1. "Tata Motors composite score" -> server asks "did you mean?" with two
//      choices -> both render as tappable buttons (>= 40px tall, inside the
//      viewport, stacked);
//   2. tapping one re-sends with `selected_symbol` (the ORIGINAL question is
//      answered server-side) and the answer shows its scope chip;
//   3. buttons disappear once answered; a market-wide answer shows
//      "Market-wide".
// Run: node scripts/ask_choices_phone_ui_test.mjs [baseUrl]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3123";
const fails = [];
const check = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${cond ? "" : ` -- ${detail}`}`);
  if (!cond) fails.push(name);
};

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "ui-test", exp: Math.floor(Date.now() / 1000) + 86400 })}.sig`;
const user = { user_id: "ui-test", email: "ui-test@example.invalid", tier: "pro", display_name: "UI Test" };

const base = {
  sources_used: [], source_citations: [], refused: false, conversation_id: "c-ui-test",
  compare: null, screen: null, table: null, web_sourced: false, web_source_label: null,
  web_source_url: null, score_history: null, follow_ups: [], question_weight: 0, quota_unchanged: true,
};
const choices = [
  { symbol: "TMCV", company_name: "TATA MOTORS COMM VEH LTD", label: "Tata Motors Comm Veh Ltd (TMCV)", action: "select" },
  { symbol: "TMPV", company_name: "TATA MOTORS PASS VEH LTD", label: "Tata Motors Pass Veh Ltd (TMPV)", action: "select" },
];
const askBodies = [];

function askResponse(body) {
  if (body.selected_symbol) {
    return { ...base, answer: `${body.selected_symbol}'s composite score is 61, sector rank 3, as of 2026-10-08.`,
      mode: "symbol", resolved_symbol: body.selected_symbol, model: "signal-template",
      chat_context: { type: "SINGLE_STOCK", primary_symbol: body.selected_symbol, source: "USER_SELECTED" },
      choices: [], scope: { type: "company", symbol: body.selected_symbol, exchange: "NSE" } };
  }
  if (/gainers/i.test(body.question)) {
    return { ...base, answer: "Top gainers today: ...", mode: "general", resolved_symbol: null, model: "fake",
      chat_context: { type: "SINGLE_STOCK", primary_symbol: "TMCV", source: "USER_SELECTED" },
      choices: [], scope: { type: "market" } };
  }
  return { ...base, answer: "Did you mean one of these?", mode: "clarify", resolved_symbol: null,
    model: "clarify-choice", chat_context: null, choices, scope: { type: "pending" } };
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await ctx.addInitScript(([t, u]) => {
  window.localStorage.setItem("redixfi:auth", JSON.stringify({ access_token: t, refresh_token: t, user: u }));
}, [token, user]);
const page = await ctx.newPage();
await page.route(/\/api\/v1\//, async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const ok = (data) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data }) });
  if (url.pathname.endsWith("/ask") && req.method() === "POST") {
    const body = req.postDataJSON();
    askBodies.push(body);
    return ok(askResponse(body));
  }
  if (url.pathname.endsWith("/ask/history")) return ok({ conversation: null, initial_suggestions: [] });
  if (url.pathname.endsWith("/me") || url.pathname.includes("/auth/")) return ok(user);
  if (url.pathname.includes("/ask")) return ok(null);
  // Everything else is a public read the page makes anyway: pass it
  // through to the real API, without the fake token.
  const headers = { ...req.headers() };
  delete headers.authorization;
  return route.continue({ headers });
});
page.on("pageerror", (e) => console.log("pageerror:", e.message.slice(0, 160)));

await page.goto(`${BASE}/news`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "RedixFi AI" }).first().click();
const input = page.getByPlaceholder(/Ask anything/);
await input.waitFor({ timeout: 20000 });
await input.fill("Tata Motors composite score");
await page.getByRole("button", { name: "Send" }).click();

const group = page.getByRole("group", { name: "Choose a company" });
await group.waitFor({ timeout: 15000 });
const buttons = group.getByRole("button");
check("two choice buttons rendered", (await buttons.count()) === 2, String(await buttons.count()));
for (let i = 0; i < (await buttons.count()); i++) {
  const box = await buttons.nth(i).boundingBox();
  check(`button ${i + 1} is >= 40px tall (tappable)`, box && box.height >= 40, JSON.stringify(box));
  check(`button ${i + 1} fits inside the 390px viewport`, box && box.x >= 0 && box.x + box.width <= 390, JSON.stringify(box));
}
const b0 = await buttons.nth(0).boundingBox();
const b1 = await buttons.nth(1).boundingBox();
check("buttons stack vertically on a phone", b0 && b1 && b1.y > b0.y + b0.height - 1, JSON.stringify([b0, b1]));
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("no horizontal page scroll", overflow <= 1, String(overflow));
await page.screenshot({ path: "ask_choices_phone_before_tap.png" });

await buttons.filter({ hasText: "TMCV" }).click();
await page.getByText("TMCV's composite score is 61").waitFor({ timeout: 15000 });
const tapBody = askBodies.at(-1);
check("tap re-sends with selected_symbol", tapBody?.selected_symbol === "TMCV", JSON.stringify(tapBody));
check("buttons disappear once answered", (await page.getByRole("group", { name: "Choose a company" }).count()) === 0);
check("answer shows its company scope tag", (await page.getByText(/About TMCV/i).count()) > 0);
check("chat pin chip updated in the same response", (await page.getByText(/TMCV\s*·\s*NSE/).count()) > 0);
await page.screenshot({ path: "ask_choices_phone_after_tap.png" });

await input.fill("top gainers today");
await page.getByRole("button", { name: "Send" }).click();
await page.getByText("Top gainers today: ...", { exact: true }).waitFor({ timeout: 15000 });
check("market-wide answer shows a market-wide scope chip", (await page.getByText(/market-wide/i).count()) > 0);

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nALL PASSED");
process.exit(fails.length ? 1 : 0);
