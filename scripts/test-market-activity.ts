// Market Activity must never crash on a row with missing numbers (production, 2026-11-05: filing 4054 had null quantity and value_amount).
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { safeNumber, safeRupees } from "../src/lib/safe-format.ts";

const row = JSON.parse(readFileSync(new URL("../src/lib/__fixtures__/insider-null-row.json", import.meta.url), "utf8"));
assert.equal(safeNumber(row.quantity), "n/a");
assert.equal(safeRupees(row.value_amount), "n/a");
assert.equal(safeNumber(undefined), "n/a");
assert.equal(safeNumber(NaN), "n/a");
assert.equal(safeNumber("abc"), "n/a");
assert.equal(safeNumber(170000), "1,70,000");
assert.equal(safeRupees(170000), "₹1,70,000");
assert.equal(safeNumber("2500"), "2,500");

for (const f of ["CategoryTables.tsx", "MarketActivityHub.tsx"]) {
  const src = readFileSync(new URL(`../src/components/app/market-activity/${f}`, import.meta.url), "utf8");
  assert.ok(!/\b(?:row|t)\.(?:quantity|value_amount)\.toLocaleString/.test(src), `${f}: unguarded insider number formatting`);
}
const hub = readFileSync(new URL("../src/components/app/market-activity/MarketActivityHub.tsx", import.meta.url), "utf8");
assert.ok(hub.includes("<TabBoundary key={tab}>"), "every tab body sits in its own error boundary");
const tb = readFileSync(new URL("../src/components/app/market-activity/TabBoundary.tsx", import.meta.url), "utf8");
assert.ok(tb.includes("This tab could not load. Other tabs still work.") && tb.includes("Reload"));
console.log("market-activity tests ok");
