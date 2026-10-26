// Add to Home Screen, the service worker's limits, trial texts and the free-lookup helpers.
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync, existsSync } from "node:fs";

const rd = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
const load = (rel) => {
  const js = ts.transpileModule(rd(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", js)(mod, mod.exports, () => ({}));
  return mod.exports;
};

// ---- install decisions ----
const P = load("../src/lib/pwa.ts");
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36";
assert.equal(P.installKind({ ua: ANDROID, hasPrompt: true, standalone: false }), "prompt");
assert.equal(P.installKind({ ua: IPHONE, hasPrompt: false, standalone: false }), "ios");
assert.equal(P.installKind({ ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X)", maxTouchPoints: 5, hasPrompt: false, standalone: false }), "ios", "iPad that reports as a Mac");
assert.equal(P.installKind({ ua: ANDROID, hasPrompt: true, standalone: true }), "none", "never when already installed");
assert.equal(P.installKind({ ua: IPHONE, hasPrompt: false, standalone: true }), "none");
assert.equal(P.installKind({ ua: "Mozilla/5.0 (Windows NT 10.0) Firefox/120", hasPrompt: false, standalone: false }), "none");
const T = 1_800_000_000_000;
assert.equal(P.shouldShowBanner({ kind: "prompt", visits: 1, dismissedUntil: null, nowMs: T }), false, "not on the first visit");
assert.equal(P.shouldShowBanner({ kind: "prompt", visits: 2, dismissedUntil: null, nowMs: T }), true, "from the second visit");
assert.equal(P.shouldShowBanner({ kind: "ios", visits: 3, dismissedUntil: null, nowMs: T }), true);
assert.equal(P.shouldShowBanner({ kind: "none", visits: 9, dismissedUntil: null, nowMs: T }), false);
const until = P.dismissUntil(T);
assert.equal(until - T, 30 * 86_400_000, "a dismissal lasts 30 days");
assert.equal(P.shouldShowBanner({ kind: "prompt", visits: 5, dismissedUntil: until, nowMs: T + 29 * 86_400_000 }), false);
assert.equal(P.shouldShowBanner({ kind: "prompt", visits: 5, dismissedUntil: until, nowMs: T + 31 * 86_400_000 }), true);
assert.equal(P.IOS_HINT, "Tap Share, then Add to Home Screen");
assert.equal(P.INSTALL_TITLE, "Add RedixFi to your home screen");

// ---- the service worker only ever touches the static shell ----
const sw = rd("../public/sw.js");
const code = sw.replace(/\/\/.*$/gm, "");
assert.ok(/const CACHE_VERSION = "[^"]+"/.test(code) && code.includes('k.startsWith("redixfi-") && k !== CACHE'), "versioned cache, old ones deleted on activate");
assert.ok(!/cache\.put|cache\.add\(|addAll\(req|\.put\(/.test(code.replace("cache.addAll(SHELL)", "")), "nothing but the shell list is ever stored");
assert.ok(code.includes("cache.addAll(SHELL)") && code.includes("SHELL.includes(url.pathname)"));
assert.ok(code.includes("url.origin !== self.location.origin") && code.includes('req.method !== "GET"'), "other hosts (the API) and non-GET are not touched");
const shell = [...code.match(/const SHELL = \[([\s\S]*?)\]/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
assert.deepEqual(shell, ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png", "/icons/apple-touch-icon.png", "/branding/redixfi-icon.png"]);
assert.ok(!shell.some((p) => /api|signals|research|news|price|sitemap|login|checkout|billing|account/i.test(p)), "no data, login, payment or SEO paths in the shell");
for (const p of shell) assert.ok(existsSync(new URL(`../public${p}`, import.meta.url)), `shell file exists: ${p}`);
// a page request goes to the network first; the cache answers only when the network fails
assert.ok(/req\.mode === "navigate"[\s\S]*fetch\(req\)\.catch\(\(\) => caches\.match\("\/offline\.html"\)\)/.test(code));

// ---- manifest ----
const mf = rd("../src/app/manifest.ts");
for (const needle of ['name: "RedixFi"', 'short_name: "RedixFi"', 'start_url: "/?utm_source=pwa&utm_medium=homescreen"', 'display: "standalone"', '"#0b0f1a"', "192x192", "512x512", 'purpose: "maskable"'])
  assert.ok(mf.includes(needle), needle);

// ---- wording: never "download our app" ----
const files = ["../src/components/app/pwa/InstallBanner.tsx", "../src/components/app/pwa/InstallRow.tsx", "../src/lib/pwa.ts", "../public/offline.html"].map(rd).join("\n");
assert.ok(!/download (our|the) app|download app/i.test(files));
assert.ok(files.includes("Add RedixFi to your home screen") && files.includes("Install app"));

// ---- trial texts follow one value ----
const { trialLabel, DISPLAY_FALLBACK_DAYS } = load("../src/lib/trial.ts");
assert.equal(trialLabel(5), "5 days");
assert.equal(trialLabel(1), "1 day");
assert.equal(DISPLAY_FALLBACK_DAYS, 5);
for (const f of ["../src/app/(app)/login/page.tsx", "../src/components/app/VisitorIntroStrip.tsx"]) {
  const t = rd(f);
  assert.ok(t.includes("trialLabel(trialDays)") && !/\b2 days\b|\b48 hours?\b|two days/i.test(t), `${f} reads the length from the config`);
}
const gate = rd("../src/components/app/signals/SignalUnlockGate.tsx");
assert.ok(gate.includes("{trialDays}-day Pro trial") && gate.includes("Sign up free") && gate.includes("Log in") && gate.includes("View plans"));
assert.ok(gate.includes("You have used today&apos;s free stock views. Sign up free (one tap with Google) and get a"));
assert.ok(!/Analytics Pro|fixed set of stocks by name/.test(gate));

// ---- free-lookup header rules ----
const L = load("../src/lib/lookup-grants.ts");
for (const [p, want] of [["/signals/TCS", true], ["/signals/TCS/score-history", true], ["/signals/TCS/volatility", true], ["/lookups/TCS", true],
  ["/signals", false], ["/signals/movers", false], ["/market/overview", false], ["/research/TCS", false], ["/ask", false]])
  assert.equal(L.needsLookupHeaders(p), want, p);

// ---- no "Analytics Pro" anywhere user-visible ----
for (const f of ["../src/app/(app)/pricing/page.tsx", "../src/components/app/billing/PlanCard.tsx", "../src/components/ui/Locked.tsx", "../src/components/app/research/ResearchViewGate.tsx"])
  assert.ok(!/Analytics Pro/.test(rd(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")), f);

// ---- forbidden words in the new strings ----
const added = [files, gate, "You have used today's free stock views. Sign up free (one tap with Google) and get a 5-day Pro trial."].join("\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
assert.deepEqual(added.match(/\b(buy|sell|target|likely|expected|bullish|bearish|recommend\w*|predict\w*)\b/gi) ?? [], []);
console.log("pwa, trial and lookup checks: ok");
