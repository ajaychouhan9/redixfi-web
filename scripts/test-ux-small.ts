/**
 * Scan volume filter and Stock Condition history line helpers (2026-11-01).
 * Run: node --experimental-strip-types scripts/test-ux-small.ts
 */
import assert from "node:assert/strict";

import { VOLUME_STEPS, filterByVolume, volumeCountText, volumePillLabel, volumeStepLabel } from "../src/lib/intraday-volume-filter.ts";
import { CONDITION_LINE_MIN_POINTS, conditionLineCaption, conditionLinePath, usableConditionPoints } from "../src/lib/condition-line.ts";

const row = (symbol: string, vr: number | null) => ({ symbol, vr });
const rows = [row("A", 12.4), row("B", 5), row("C", 3.2), row("D", 0.9), row("E", null), row("F", 10)];

// steps and wording
assert.deepEqual([...VOLUME_STEPS], [3, 5, 10]);
assert.equal(volumeStepLabel(5), "Volume 5x or more than its usual level");
assert.equal(volumePillLabel(10), "10x or more");

// the filter keeps the order and only drops rows
assert.equal(filterByVolume(rows, null), rows);
assert.deepEqual(filterByVolume(rows, 3).map((r) => r.symbol), ["A", "B", "C", "F"]);
assert.deepEqual(filterByVolume(rows, 5).map((r) => r.symbol), ["A", "B", "F"]);         // the boundary value (exactly 5) is included
assert.deepEqual(filterByVolume(rows, 10).map((r) => r.symbol), ["A", "F"]);
assert.deepEqual(filterByVolume(rows, 3).map((r) => r.symbol), rows.map((r) => r.symbol).filter((s) => ["A", "B", "C", "F"].includes(s)));
assert.deepEqual(filterByVolume([row("X", null)], 3), []);                                  // no ratio never matches
assert.equal(rows.length, 6);                                                                // the input is not changed
assert.equal(volumeCountText(3, 25, 5), "3 of 25 listed rows match.");
assert.equal(volumeCountText(25, 25, null), "Showing 25.");

// history line: caption, minimum, path
assert.equal(conditionLineCaption(30), "Stock Condition, last 30 sessions");
assert.equal(conditionLineCaption(12), "Stock Condition, last 12 sessions (all stored so far)");
const pts = (n: number) => Array.from({ length: n }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, "0")}`, value: 40 + (i % 7) }));
assert.equal(CONDITION_LINE_MIN_POINTS, 5);
assert.equal(usableConditionPoints(pts(4)).length, 0);
assert.equal(usableConditionPoints(pts(5)).length, 5);
assert.equal(usableConditionPoints(undefined).length, 0);
assert.equal(usableConditionPoints([...pts(5), { date: "x", value: NaN }]).length, 5);
const { d, min, max } = conditionLinePath([10, 20, 15], 100, 40);
assert.ok(d.startsWith("M4.0 ") && d.split("L").length === 3 && min === 10 && max === 20);
assert.ok(conditionLinePath([50, 50, 50], 100, 40).d.includes("20.0"));                      // a flat series is drawn in the middle


// price-first: the difference line (Task 3)
import { priceGapNote } from "../src/lib/price-gap.ts";
const gap = { pct: 20, readingsDate: "2026-10-30", today: "2026-11-02", marketOpen: true };
assert.equal(priceGapNote(gap), "The price has moved +20.0% from the last close (30 Oct). The readings below were measured at the 30 Oct close and update after today’s close.");
assert.equal(priceGapNote({ ...gap, pct: 4.9 }), null);                 // smaller than the configured 5 percent
assert.equal(priceGapNote({ ...gap, pct: -5 })?.includes("-5.0%"), true);
assert.equal(priceGapNote({ ...gap, marketOpen: false }), null);        // after the close
assert.equal(priceGapNote({ ...gap, readingsDate: "2026-11-02" }), null); // readings already for the current session
assert.equal(priceGapNote({ ...gap, pct: null }), null);

console.log("test-ux-small: ok");
