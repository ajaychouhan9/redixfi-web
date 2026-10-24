import assert from "node:assert/strict";
process.argv = [process.argv[0], "test-sitemap-url-rules.mjs"];
const { urlProblems } = await import("./check-sitemap-live.mjs");
const H = "www.redixfi.com";
for (const ok of ["https://www.redixfi.com/", "https://www.redixfi.com/stocks/M%26M", "https://www.redixfi.com/stocks/BAJAJ-AUTO", "https://www.redixfi.com/more/about-us"])
  assert.deepEqual(urlProblems(ok, H), [], ok);
for (const bad of ["https://www.redixfi.com/stocks/$%7Bsymbol%7D", "https://www.redixfi.com/stocks/undefined", "https://www.redixfi.com/signals//TCS",
  "https://redixfi.com/stocks/TCS", "http://www.redixfi.com/", "https://www.redixfi.com/account", "https://www.redixfi.com/stocks/[object%20Object]",
  "https://www.redixfi.com/stocks/TCS/", "https://www.redixfi.com/stocks/%E0%A4"])
  assert.ok(urlProblems(bad, H).length > 0, bad);
console.log("sitemap URL rules: ok");

// Renamed stocks: every old link must reach the new symbol with a permanent redirect.
import ts from "typescript";
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../src/lib/seo/renamed-symbols.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", js)(mod, mod.exports);
const rules = mod.exports.renamedSymbolRedirects();
assert.equal(rules.length, 3 * 4 * 2, "3 stocks x 4 pages x (page, sub-page)");
assert.ok(rules.every((r) => r.statusCode === 301), "all permanent");
const hit = (path) => {
  for (const r of rules) {
    const re = new RegExp("^" + r.source.replace(/:old\(([^)]*)\)/, "($1)").replace("/:rest*", "(?:/(.*))?") + "$");
    const m = re.exec(path);
    if (m) return r.destination.replace(":rest*", m[2] ?? "").replace(/\/$/, "");
  }
  return null;
};
assert.equal(hit("/stocks/SILLYMONKS"), "/stocks/CRESTO");
assert.equal(hit("/signals/sillymonks"), "/signals/CRESTO");
assert.equal(hit("/research/HEG"), "/research/HEGAM");
assert.equal(hit("/track-record/MANBRO"), "/track-record/KDGREEN");
assert.equal(hit("/stocks/HEG/concall-summary"), "/stocks/HEGAM/concall-summary");
assert.equal(hit("/stocks/HEGAM"), null, "the new symbol is not redirected");
assert.equal(hit("/signals/ICICIPRULI"), "/signals/ICICILIFE");
assert.equal(hit("/research/icicipruli"), "/research/ICICILIFE");
assert.equal(hit("/stocks/ICICILIFE"), null, "the new symbol is not redirected");
assert.equal(hit("/stocks/HEGDE"), null, "a symbol that only starts the same way is not redirected");
for (const [o, n] of Object.entries(mod.exports.RENAMED_SYMBOLS)) assert.notEqual(o, n);
console.log("renamed-symbol redirects: ok");
