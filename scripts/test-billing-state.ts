import assert from "node:assert/strict";
import { cardButtonLabel, cardNotice, orderRefusalMessage, runningPlan } from "../src/lib/billing-state.ts";

const NOW = new Date("2026-11-15T10:00:00Z");
const inDays = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();
const profile = (tier: string, plan: string | null, renews: string | null, status = "active") => ({ tier, subscription: { plan, renews, status } });

// Free, trial, no stored plan and an ended plan are NOT running.
assert.equal(runningPlan(null, NOW), null);
assert.equal(runningPlan(profile("free", null, null, "none"), NOW), null);
assert.equal(runningPlan(profile("pro", null, null), NOW), null);                    // trial / internal account: no stored plan
assert.equal(runningPlan(profile("pro", "pro_399", inDays(-2)), NOW), null);          // ended
assert.equal(runningPlan(profile("free", "pro_399", inDays(10)), NOW), null);         // read as Free

// Pro annual running, far from the end: every card shows a notice, nobody gets a Renew button.
const pro = runningPlan(profile("pro", "pro_annual_3999", inDays(300)), NOW)!;
assert.equal(pro.label, "Pro Annual");
assert.equal(pro.renewOpen, false);
const own = cardNotice(pro, "pro_annual_3999")!;
assert.match(own, /^You are on Pro Annual until \d{1,2} \w+ 2027\./);
assert.match(own, /Renewal opens on /);
assert.equal(cardButtonLabel(pro, "pro_annual_3999"), undefined);
const other = cardNotice(pro, "basic_annual_2399")!;
assert.match(other, /^You are on Pro Annual until /);
assert.match(other, /support@redixfi\.com/);
assert.notEqual(other, null);
assert.equal(cardButtonLabel(pro, "basic_annual_2399"), undefined);

// Renewal window: the same plan keeps its button and says "Renew"; other plans still show the notice.
const soon = runningPlan(profile("pro", "pro_399", inDays(7)), NOW)!;
assert.equal(soon.renewOpen, true);
assert.equal(cardNotice(soon, "pro_399"), null);
assert.equal(cardButtonLabel(soon, "pro_399"), "Renew");
assert.ok(cardNotice(soon, "pro_annual_3999"));
const eight = runningPlan(profile("pro", "pro_399", inDays(8)), NOW)!;
assert.equal(eight.renewOpen, false);
assert.equal(cardButtonLabel(eight, "pro_399"), undefined);

// A Basic user is pointed to support for Pro.
const basic = runningPlan(profile("basic", "basic_249", inDays(15)), NOW)!;
assert.match(cardNotice(basic, "pro_399")!, /To move from Basic to Pro, write to support@redixfi\.com/);
assert.match(cardNotice(basic, "basic_249")!, /Renewal opens on /);

// The API's refusal text reaches the user; other errors do not.
const refused = { status: 409, detail: { detail: { code: "PLAN_ALREADY_ACTIVE", message: "You are on Pro, annual until 10 Nov 2027. A new plan cannot be bought while a plan is running." } } };
assert.equal(orderRefusalMessage(refused), "You are on Pro, annual until 10 Nov 2027. A new plan cannot be bought while a plan is running.");
assert.match(orderRefusalMessage({ status: 409, detail: { detail: { code: "PLAN_ALREADY_ACTIVE" } } })!, /support@redixfi\.com/);
assert.match(orderRefusalMessage({ status: 409, detail: { detail: "duplicate_recent_payment" } })!, /paid for a moment ago/);
assert.equal(orderRefusalMessage({ status: 400, detail: { detail: "unknown plan" } }), null);
assert.equal(orderRefusalMessage(new Error("x")), null);
assert.equal(orderRefusalMessage(null), null);

console.log("billing-state tests passed");
