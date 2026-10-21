import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/sitemap.xml/route.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const transpile = (p) => ts.transpileModule(readFileSync(new URL(p, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const sectorsMod = { exports: {} };
vm.runInNewContext(transpile("../src/data/sectors.ts"), { module: sectorsMod, exports: sectorsMod.exports, require: () => ({}) });
const screensMod = { exports: {} };
vm.runInNewContext(transpile("../src/data/canned-screens.ts"), {
  module: screensMod, exports: screensMod.exports, require: (id) => (id === "@/data/sectors" ? sectorsMod.exports : {}),
});
const SCREENS = screensMod.exports.CANNED_SCREENS.length;
assert.equal(SCREENS, 38);
const CORE = 13 + SCREENS;
const symbols = Array.from({ length: 2302 }, (_, i) => `S${String(i + 1).padStart(4, "0")}`);
symbols.push("M&M");

class ApiError extends Error {
  constructor(status) { super(`HTTP ${status}`); this.status = status; }
}

async function scenario(name, behavior, expectedCount, warningExpected) {
  const calls = new Map();
  const warnings = [];
  let cached;
  const getSignals = async ({ page, size }) => {
    const attempt = (calls.get(page) ?? 0) + 1;
    calls.set(page, attempt);
    const failure = behavior(page, attempt);
    if (failure) {
      if (typeof failure === "number") throw new ApiError(failure);
      if (failure === "timeout") {
        const error = new Error("The operation timed out");
        error.name = "TimeoutError";
        throw error;
      }
      return failure;
    }
    return {
      page_info: { page, size, total: symbols.length },
      data: symbols.slice((page - 1) * size, page * size).map((symbol) => ({ symbol })),
    };
  };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, require(id) {
      if (id === "@/lib/api/endpoints") return { getSignals };
      if (id === "@/lib/api/client") return { ApiError };
      if (id === "@/data/canned-screens") return screensMod.exports;
      if (id === "next/cache") return { unstable_cache: (fn) => async () => {
        if (cached) return cached;
        cached = await fn();
        return cached;
      } };
      throw new Error(`Unexpected module: ${id}`);
    },
    Response, setTimeout, console: { warn: (message) => warnings.push(message) },
  });
  assert.equal(module.exports.dynamic, "force-dynamic");
  const response = await module.exports.GET();
  assert.equal(response.status, 200, name);
  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(urls.length, expectedCount, name);
  assert.equal(new Set(urls).size, urls.length, `${name}: duplicate URLs`);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset '), name);
  assert.ok(xml.endsWith("</urlset>"), name);
  assert.ok(urls.every((url) => url.startsWith("https://www.redixfi.com/") || url === "https://www.redixfi.com"), name);
  assert.ok(urls.includes("https://www.redixfi.com/screens"), name);
  assert.ok(urls.includes("https://www.redixfi.com/screens/high-delivery-in-nifty-auto"), name);
  assert.ok(!urls.some((url) => url.includes("/market-brief")), name);
  assert.ok(urls.every((url) => !/\/(account|admin|api)(\/|$)|\/(\$|&|100)$/.test(url)), name);
  assert.equal(urls.includes("https://www.redixfi.com/stocks/M%26M"), !warningExpected, name);
  assert.equal(warnings.length, warningExpected ? 1 : 0, name);
  assert.equal(response.headers.get("Cache-Control"), warningExpected ? "no-store" : "public, s-maxage=3600, stale-while-revalidate=86400", name);
  if (warningExpected) assert.ok(!urls.some((url) => url.includes("/stocks/")), name);
  if (!warningExpected) {
    const before = [...calls.values()].reduce((sum, count) => sum + count, 0);
    assert.equal(await (await module.exports.GET()).text(), xml, `${name}: cached response differs`);
    assert.equal([...calls.values()].reduce((sum, count) => sum + count, 0), before, `${name}: cache refetched pages`);
  }
  process.stdout.write(`${name}: ${urls.length} URLs, ${warnings.length} warning(s)\n`);
  return { calls, warnings, request: module.exports.GET };
}

await scenario("normal", () => null, 2303 + CORE, false);
let outage = false;
const cachedDuringOutage = await scenario("cached before outage", () => outage ? 503 : null, 2303 + CORE, false);
outage = true;
const callsBeforeOutage = [...cachedDuringOutage.calls.values()].reduce((sum, count) => sum + count, 0);
assert.equal((await (await cachedDuringOutage.request()).text()).match(/<loc>/g)?.length, 2303 + CORE);
assert.equal([...cachedDuringOutage.calls.values()].reduce((sum, count) => sum + count, 0), callsBeforeOutage);
const recovered = await scenario("transient 504", (page, attempt) => page === 3 && attempt === 1 ? 504 : null, 2303 + CORE, false);
assert.equal(recovered.calls.get(3), 2);
const timeoutRecovered = await scenario("transient timeout", (page, attempt) => page === 3 && attempt === 1 ? "timeout" : null, 2303 + CORE, false);
assert.equal(timeoutRecovered.calls.get(3), 2);
const persistent = await scenario("persistent 504", (page) => page === 3 ? 504 : null, CORE, true);
assert.equal(persistent.calls.get(3), 2);
const permanent = await scenario("permanent 404", (page) => page === 1 ? 404 : null, CORE, true);
assert.equal(permanent.calls.get(1), 1);
await scenario("malformed pagination", (page) => page === 2 ? { page_info: { page: 2, total: symbols.length }, data: [] } : null, CORE, true);
await scenario("midstream 503", (page) => page === 8 ? 503 : null, CORE, true);

// A malformed symbol is skipped on its own; the rest of the stock list stays.
{
  const bad = (page) => page === 2 ? {
    page_info: { page: 2, size: 200, total: symbols.length },
    data: symbols.slice(200, 400).map((symbol, i) => (i === 0 ? { symbol: "BAD$" } : i === 1 ? { symbol: null } : { symbol })),
  } : null;
  const warnings = [];
  const mod = { exports: {} };
  const calls = new Map();
  const getSignals = async ({ page, size }) => {
    calls.set(page, (calls.get(page) ?? 0) + 1);
    return bad(page) ?? { page_info: { page, size, total: symbols.length }, data: symbols.slice((page - 1) * size, page * size).map((symbol) => ({ symbol })) };
  };
  vm.runInNewContext(code, {
    module: mod, exports: mod.exports, require(id) {
      if (id === "@/lib/api/endpoints") return { getSignals };
      if (id === "@/lib/api/client") return { ApiError };
      if (id === "@/data/canned-screens") return screensMod.exports;
      if (id === "next/cache") return { unstable_cache: (fn) => fn };
      throw new Error(`Unexpected module: ${id}`);
    },
    Response, setTimeout, console: { warn: (message) => warnings.push(message) },
  });
  const xml = await (await mod.exports.GET()).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(urls.length, 2301 + CORE, "malformed symbol skipped alone");
  assert.ok(!xml.includes("BAD"), "malformed symbol not listed");
  assert.ok(urls.includes("https://www.redixfi.com/stocks/M%26M"));
  assert.equal(warnings.length, 1);
  process.stdout.write(`malformed symbol skipped: ${urls.length} URLs, ${warnings.length} warning(s)\n`);
}
