import assert from "node:assert/strict";
import { formatDateIst, formatDateSafe } from "../src/lib/format.ts";

// A real date is formatted exactly like formatDateIst.
assert.equal(formatDateSafe("2026-11-13T00:00:00Z"), formatDateIst("2026-11-13T00:00:00Z"));
// Values that are not dates must not throw; they show a dash.
for (const bad of ["-", "", "n/a", "-T00:00:00Z", "13-Feb-26x", null, undefined]) {
  assert.equal(formatDateSafe(bad as never), "-", `value ${String(bad)}`);
}
// The old formatter still throws on "-" (this is the crash the safe one prevents).
assert.throws(() => formatDateIst("-"), RangeError);
console.log("safe-date tests passed");
