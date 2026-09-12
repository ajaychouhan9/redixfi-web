/**
 * Regression test — Telegram app-less web fallback
 * (`src/lib/telegram.ts`).
 *
 * WHY THIS EXISTS: the desktop bug was that `https://t.me/<bot>?start=<code>`
 * dead-ends when Telegram Desktop isn't installed (the t.me START button fires
 * an unregistered `tg://` URL). The fix routes the SAME payload through
 * Telegram Web's `tgaddr` parameter, and the encoding is load-bearing: left
 * un-encoded, Telegram Web treats `&start=…` as a separate hash parameter and
 * silently DROPS the linking code. That is exactly the kind of thing that
 * regresses without a test.
 *
 * This repo has no JS/TS test framework installed, so this exercises the REAL
 * exported functions via Node's own TypeScript support (same pattern as
 * scripts/test-ask-fresh-start.ts).
 *
 * Run: node --experimental-strip-types scripts/test-telegram-web-link.ts
 */
import { telegramBotUsername, telegramStartCommand, telegramWebLink } from "../src/lib/telegram.ts";

let pass = 0;
let fail = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "[PASS]" : "[FAIL]"} ${label}${ok ? "" : `\n        expected: ${String(expected)}\n        actual:   ${String(actual)}`}`);
}

// --- normal case: exact, hardcoded expected URL (guards the encoding) ------
const deepLink = "https://t.me/RedixFiMarketBot?start=ABC234";
check("bot username extracted from a t.me link", telegramBotUsername(deepLink), "RedixFiMarketBot");
check(
  "web link is the exact Telegram Web A tgaddr URL",
  telegramWebLink(deepLink, "ABC234"),
  "https://web.telegram.org/a/#?tgaddr=tg%3A%2F%2Fresolve%3Fdomain%3DRedixFiMarketBot%26start%3DABC234"
);

// --- the payload must survive Telegram Web's own parsing -------------------
const web = telegramWebLink(deepLink, "ABC234")!;
const encoded = web.slice(web.indexOf("tgaddr=") + "tgaddr=".length);
check(
  "decoded tgaddr is the tg:// deep link with the SAME start payload",
  decodeURIComponent(encoded),
  "tg://resolve?domain=RedixFiMarketBot&start=ABC234"
);
check("the '&' between domain and start is encoded (not a raw hash separator)", encoded.includes("%26") && !encoded.includes("&start="), true);
check("the code is present in the encoded link", encoded.includes("ABC234"), true);

// --- start command (the always-works fallback) -----------------------------
check("start command preserves the code", telegramStartCommand("ABC234"), "/start ABC234");
check("start command carries the same payload as the deep link", telegramStartCommand("ABC234"), `/start ${decodeURIComponent(encoded).split("start=")[1]}`);

// --- tolerances / edge cases ----------------------------------------------
check("http:// and trailing slash still resolve the username", telegramBotUsername("http://t.me/Some_Bot_2/"), "Some_Bot_2");
check("username with digits/underscores", telegramBotUsername("https://t.me/Bot_99"), "Bot_99");
check("null deep link -> no username", telegramBotUsername(null), null);
check("empty deep link -> no username", telegramBotUsername(""), null);
check("non-telegram URL -> no username", telegramBotUsername("https://example.com/x"), null);
check("no deep link -> no web link", telegramWebLink(null, "ABC234"), null);
check("no deep link -> no web link (empty string)", telegramWebLink("", "ABC234"), null);
check("garbage deep link -> no web link", telegramWebLink("not a url", "ABC234"), null);

// --- real link-code alphabet (no 0/O/1/I) is URL-safe ----------------------
const code = "H7K9XZ";
const w2 = telegramWebLink("https://t.me/RedixFiMarketBot?start=" + code, code)!;
check("full-alphabet code round-trips unchanged", decodeURIComponent(w2.slice(w2.indexOf("tgaddr=") + 7)), `tg://resolve?domain=RedixFiMarketBot&start=${code}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
