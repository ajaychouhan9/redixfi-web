// Display-name mapping tests (display only: stored names, symbols and search matching are never touched).
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/lib/company-name.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", js)(mod, mod.exports);
const { displayName, shortName } = mod.exports;

const cases = [
  ["TATA CONSULTANCY SERV LT", "Tata Consultancy Services Ltd"],
  ["AADHAR HOUSING FINANCE L", "Aadhar Housing Finance Ltd"],
  ["ICICI BANK LIMITED", "ICICI Bank Ltd"],
  ["HDFC BANK LTD", "HDFC Bank Ltd"],
  ["ABB INDIA LIMITED", "ABB India Ltd"],
  ["LARSEN & TOUBRO LTD.", "Larsen & Toubro Ltd"],
  ["3M INDIA LIMITED", "3M India Ltd"],
  ["360 ONE WAM LIMITED", "360 One WAM Ltd"],
  ["ADITYA BIRLA MONEY LTD", "Aditya Birla Money Ltd"],
  ["CAPRI GLOBAL MGMT LTD", "Capri Global Management Ltd"],
  ["Tata Steel Limited", "Tata Steel Limited"],     // already mixed case: left as it is
  ["", ""],
  [null, ""],
];
for (const [raw, want] of cases) assert.equal(displayName(raw), want, String(raw));
assert.equal(shortName("TATA CONSULTANCY SERV LT"), "Tata Consultancy Services");
assert.equal(displayName("  RELIANCE   INDUSTRIES LTD "), "Reliance Industries Ltd");
assert.equal(displayName("ZEE ENTERTAINMENT ENTERPRISES LTD"), "Zee Entertainment Enterprises Ltd");

// the real list from the exchange master file, when a copy is provided
const file = process.argv[2];
if (file) {
  const names = JSON.parse(readFileSync(file, "utf8"));
  const changed = names.filter(([, n]) => displayName(n) !== n);
  const lines = changed.filter((_, i) => i % Math.max(1, Math.floor(changed.length / 40)) === 0).slice(0, 40).map(([s, n]) => `${s.padEnd(12)} ${n.padEnd(28)} -> ${displayName(n)}`);
  console.log(lines.join("\n"));
  console.log(`${changed.length} of ${names.length} names change`);
}
console.log("company display names: ok");
