import assert from "node:assert/strict";
import { resolve52Week, formatPrice52 } from "../src/lib/week52.ts";
import { sourceName } from "../src/lib/news-source.ts";

// ICICIBANK, 11 Nov 2026: price 1,592.2 above the stored high 1,592 -> the price is the new high, 100% of the way up
const r = resolve52Week(1592, 1186, 1592.2)!;
assert.equal(r.high, 1592.2);
assert.equal(Math.round(r.positionPct), 100);
assert.equal(r.belowHighPct, 0);
// inside the range nothing changes
const q = resolve52Week(1814.1, 728, 1637)!;
assert.equal(q.high, 1814.1);
assert.equal(q.low, 728);
assert.equal(Math.round(q.positionPct), 84);
// a price under the stored low is the new low
assert.equal(resolve52Week(100, 50, 40)!.low, 40);
assert.equal(resolve52Week(null, 50, 40), null);
assert.equal(formatPrice52(1592.2), "1,592.2");
assert.equal(formatPrice52(1592), "1,592");

assert.equal(sourceName("livemint.com"), "Mint");
assert.equal(sourceName("www.rediff.com"), "Rediff");
assert.equal(sourceName("economictimes.indiatimes.com"), "Economic Times");
assert.equal(sourceName("english.mubasher.info"), "Mubasher");
assert.equal(sourceName("somesite.co.in"), "Somesite");
assert.equal(sourceName(""), "");
console.log("trust-fixes tests ok");
