/**
 * Regression test — Public RedixFi Morning Brief channels, frontend side
 * (2026-09-12 task).
 *
 * Two kinds of checks:
 *
 *  1. PURE LOGIC of src/lib/publicChannels.ts — the discovery-notification
 *     visibility rules and action mapping (the locked behavior: max once/day,
 *     permanent suppression for both opt-out actions, no snooze).
 *
 *  2. PLACEMENT GUARD (static file scan) — the product rules that are easy to
 *     break by accident:
 *       * channel details/links live ONLY inside Account → Alerts
 *         (MorningBriefChannelsCard is imported by the alerts page alone);
 *       * no public-channel promotion in the header, footer, home/SEO pages
 *         or pricing;
 *       * the discovery banner is rendered by the app shell (not the header/
 *         footer/home) and carries no channel URL itself;
 *       * the public-channel card is NOT tier-gated, while the personalized
 *         DeliveryChannelsCard keeps its existing Pro gate.
 *
 * This repo has no JS/TS test framework, so this runs the REAL module through
 * Node's own TypeScript support (same pattern as
 * scripts/test-telegram-web-link.ts / test-daily-brief-split.mjs).
 *
 * Run: node scripts/test-public-channels.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CHANNEL_DISCOVERY_ACTIONS,
  CHANNEL_DISCOVERY_TEXT,
  MORNING_BRIEF_CHANNELS_HREF,
  discoveryActionFor,
  shouldShowChannelDiscovery,
} from "../src/lib/publicChannels.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
let pass = 0;
let fail = 0;

function check(label, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`[PASS] ${label}`);
  } else {
    fail += 1;
    console.log(`[FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---------------------------------------------------------------------------
// 1. PURE LOGIC
// ---------------------------------------------------------------------------
const base = { should_show: true, already_subscribed: false, dismissed: false, last_shown_date: null };
check("fresh account -> notification may show", shouldShowChannelDiscovery(base) === true);
check("already shown today -> hidden", shouldShowChannelDiscovery({ ...base, should_show: false, last_shown_date: "2026-09-12" }) === false);
check("NO ACTION the previous day -> may show again", shouldShowChannelDiscovery({ ...base, last_shown_date: "2026-09-11" }) === true);
check("already_subscribed -> permanently hidden", shouldShowChannelDiscovery({ ...base, should_show: false, already_subscribed: true }) === false);
check("dismissed -> permanently hidden", shouldShowChannelDiscovery({ ...base, should_show: false, dismissed: true }) === false);
check("already_subscribed hides even if the server still says should_show", shouldShowChannelDiscovery({ ...base, already_subscribed: true }) === false);
check("dismissed hides even if the server still says should_show", shouldShowChannelDiscovery({ ...base, dismissed: true }) === false);
check("null/undefined state -> hidden (never a client-side guess)", shouldShowChannelDiscovery(null) === false && shouldShowChannelDiscovery(undefined) === false);

check("exactly three discovery actions", CHANNEL_DISCOVERY_ACTIONS.length === 3);
check("action labels match the locked copy", JSON.stringify(CHANNEL_DISCOVERY_ACTIONS.map((a) => a.label)) === JSON.stringify(["View channels", "Already subscribed", "Don't show again"]));
check("no snooze action exists", !CHANNEL_DISCOVERY_ACTIONS.some((a) => /snooze|week|month|later/i.test(a.key)));
check("'View channels' performs NO server write", discoveryActionFor("view_channels") === null);
check("'Already subscribed' -> already_subscribed", discoveryActionFor("already_subscribed") === "already_subscribed");
check("'Don't show again' -> dismissed", discoveryActionFor("dismissed") === "dismissed");
check("discovery copy is the locked sentence", CHANNEL_DISCOVERY_TEXT.startsWith("Get the RedixFi Morning Brief — Follow our WhatsApp or Telegram channel"));
check("'View channels' points at the Alerts delivery-channels anchor", MORNING_BRIEF_CHANNELS_HREF === "/account/alerts#morning-brief-channels");

// ---------------------------------------------------------------------------
// 2. PLACEMENT GUARD
// ---------------------------------------------------------------------------
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(relative(ROOT, full).replace(/\\/g, "/"));
  }
  return out;
}

const files = walk(join(ROOT, "src"));
const read = (f) => readFileSync(join(ROOT, f), "utf8");
const mentioning = (needle) => files.filter((f) => read(f).includes(needle));

const cardUsers = mentioning("MorningBriefChannelsCard").sort();
check(
  "channel links live ONLY in the Alerts page (+ the card itself)",
  JSON.stringify(cardUsers) === JSON.stringify(["src/app/(app)/account/alerts/page.tsx", "src/components/app/account/MorningBriefChannelsCard.tsx"]),
  cardUsers.join(", "),
);

const bannerUsers = mentioning("ChannelDiscoveryBanner").sort();
check(
  "discovery banner is rendered by the app shell only (+ the component itself)",
  JSON.stringify(bannerUsers) === JSON.stringify(["src/app/(app)/layout.tsx", "src/components/app/ChannelDiscoveryBanner.tsx"]),
  bannerUsers.join(", "),
);

// No public-channel promotion in header/footer/home/SEO/pricing.
const forbiddenPaths = files.filter(
  (f) => f.startsWith("src/components/layout/") || f.startsWith("src/app/(seo)/") || f === "src/app/(app)/pricing/page.tsx",
);
const leaked = [];
for (const f of forbiddenPaths) {
  const body = read(f);
  for (const needle of ["MorningBriefChannelsCard", "ChannelDiscoveryBanner", "public-channels", "whatsapp.com/channel", "whatsapp://"]) {
    if (body.includes(needle)) leaked.push(`${f}: ${needle}`);
  }
}
check("no public-channel promotion in header/footer/home/SEO/pricing", leaked.length === 0, leaked.join(" | "));

// The channel URL must come from the API — never hardcoded in the app.
const hardcodedWhatsapp = files.filter((f) => /whatsapp\.com\/channel/.test(read(f)));
check("no hardcoded public WhatsApp channel URL anywhere in src", hardcodedWhatsapp.length === 0, hardcodedWhatsapp.join(", "));

// The discovery banner must not carry a channel URL itself.
const bannerBody = read("src/components/app/ChannelDiscoveryBanner.tsx");
check("banner carries no channel URL", !/t\.me\/|whatsapp\.com|https?:\/\//.test(bannerBody));
check("banner implements all three actions", ["view_channels", "already_subscribed", "dismissed"].every((k) => bannerBody.includes(`"${k}"`) || bannerBody.includes(`choose("${k}")`)));

// Public card is not tier-gated; the personalized one keeps its Pro gate.
const cardBody = read("src/components/app/account/MorningBriefChannelsCard.tsx");
check("public channel card is NOT tier-gated", !cardBody.includes("isProEntitled"));
const personalized = read("src/components/app/account/DeliveryChannelsCard.tsx");
check("personalized delivery card keeps its Pro gate", personalized.includes("isProEntitled(user)"));
check("personalized Telegram linking is untouched by this feature", personalized.includes("getTelegramLinkCode") && personalized.includes("getTelegramStatus"));

// The public card never calls Ask AI.
check("public channel card makes no Ask AI call", !cardBody.includes("/ask"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
