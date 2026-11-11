import assert from "node:assert/strict";
import { personCategory, sideLabel, NO_CATEGORY } from "../src/lib/insider-display.ts";

assert.equal(personCategory({ raw_data: { personCategory: "Promoters" } }), "Promoter");
assert.equal(personCategory({ raw_data: { personCategory: "Promoters & Promoter Group" } }), "Promoter Group");
assert.equal(personCategory({ raw_data: { personCategory: "Key Managerial Personnel" } }), "KMP");
assert.equal(personCategory({ raw_data: { personCategory: "Director" } }), "Director");
assert.equal(personCategory({ raw_data: { personCategory: "Employee/Designated Person" } }), "Employee");
assert.equal(personCategory({ raw_data: { personCategory: "Immediate relative" } }), "Immediate relative");
assert.equal(personCategory({ raw_data: { personCategory: "-" } }), NO_CATEGORY);
assert.equal(personCategory({}), NO_CATEGORY);
assert.equal(personCategory({ person_category: "Promoter Group" }), "Promoter Group");
assert.equal(sideLabel("BUY"), "Bought (as disclosed)");
assert.equal(sideLabel("sell"), "Sold (as disclosed)");
assert.equal(sideLabel("Pledge"), "Pledge");
console.log("insider-display tests ok");
