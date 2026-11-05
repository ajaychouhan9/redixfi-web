/**
 * Pure checks for the Signals table's two date groups, the 52-week-high
 * current-price rule and the 3-stock Industry standing minimum.
 *
 * Run: node scripts/test-signals-grouping.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function loadTs(rel, mocks = {}) {
  const src = readFileSync(new URL(rel, import.meta.url), "utf8");
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  const req = (id) => mocks[id] ?? {};
  new Function("require", "module", "exports", js)(req, mod, mod.exports);
  return mod.exports;
}

const format = {
  formatObservationDate: (d) => {
    if (!d) return null;
    const [y, m, day] = d.slice(0, 10).split("-");
    return `${Number(day)} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]} ${y}`;
  },
  formatTimeIst: (iso) => iso.slice(11, 16) + " am",
};
const { signalsListLabels } = loadTs("../src/lib/signals-list-labels.ts", { "@/lib/format": format });
const { from52Display } = loadTs("../src/lib/from52-display.ts");
const { qualifyingIndustries, INDUSTRY_MIN_STOCKS } = loadTs("../src/lib/industry-standing.ts");

const base = {
  state: "pre_market",
  phase: "pre_market",
  today: "2026-11-05",
  latest_completed_session: "2026-11-04",
  score_date: "2026-11-04",
};

// Before 9:15 and on weekends/holidays both groups use the previous close.
let l = signalsListLabels(base, "2026-11-05T09:04:00+05:30");
assert.equal(l.priceHeading, "As of 4 Nov 2026 close");
assert.equal(l.readingsHeading, "As of 4 Nov 2026 close");
for (const phase of ["weekend", "holiday"]) {
  l = signalsListLabels({ ...base, state: phase, phase }, null);
  assert.equal(l.priceHeading, "As of 4 Nov 2026 close");
  assert.equal(l.readingsHeading, "As of 4 Nov 2026 close");
}

// Live: the price group carries the latest 15-minute bar; readings keep their close.
l = signalsListLabels({ ...base, state: "live", phase: "live" }, "2026-11-05T10:15:00+05:30");
assert.equal(l.priceHeading, "Today, as of 10:15 am IST (delayed)");
assert.equal(l.readingsHeading, "As of 4 Nov 2026 close");
assert.equal(l.priceIsLive, true);
assert.equal(l.priceAsOf, "2026-11-05T10:15:00+05:30");

// A stale live feed must not look current.
l = signalsListLabels({ ...base, state: "live_stale", phase: "live" }, "2026-11-05T10:15:00+05:30");
assert.equal(l.priceHeading, "As of 4 Nov 2026 close");
assert.equal(l.priceIsLive, false);

// After the close before the score run: price is today's close, readings remain the previous close.
l = signalsListLabels({ ...base, state: "closing_data_updating", phase: "post_market" }, null);
assert.equal(l.priceHeading, "As of 5 Nov 2026 close");
assert.equal(l.readingsHeading, "As of 4 Nov 2026 close");

// After today's score exists: both groups are today's close.
l = signalsListLabels({ ...base, state: "closed_scored", phase: "post_market", score_date: "2026-11-05" }, null);
assert.equal(l.priceHeading, "As of 5 Nov 2026 close");
assert.equal(l.readingsHeading, "As of 5 Nov 2026 close");

// The reported mismatch: a -5% day must use the current price, not the old close.
const live = from52Display(63.74, 0, 60.55);
assert.equal(live.high, 63.74);
assert.equal(live.belowPct, 5.0);
assert.equal(live.atHigh, false);
assert.deepEqual(from52Display(null, null, 60.56), { high: null, belowPct: null, atHigh: false });
const newHigh = from52Display(63.74, 0, 70);
assert.equal(newHigh.high, 70);
assert.equal(newHigh.belowPct, 0);
assert.equal(newHigh.atHigh, true);
const atHigh = from52Display(63.74, 0, 63.74);
assert.equal(atHigh.belowPct, 0);
assert.equal(atHigh.atHigh, true);

// Highest/Lowest lists never include an industry below the configured minimum.
assert.equal(INDUSTRY_MIN_STOCKS, 3);
const industries = [{ count: 2 }, { count: 3 }, { count: 5 }];
assert.deepEqual(qualifyingIndustries(industries).map((r) => r.count), [3, 5]);

console.log("test-signals-grouping: ok");
