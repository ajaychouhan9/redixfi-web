import assert from "node:assert/strict";
import type { AskScreenResult } from "../src/lib/api/types.ts";
// Node's type-stripping runner requires the explicit extension; production
// TypeScript imports remain extensionless through the Next.js resolver.
// @ts-expect-error TS5097 -- intentional for this direct Node test entrypoint.
import { restoreAskMessage, restoreAskMessages } from "../src/lib/ask-panel/historyMessage.ts";

const columns = [{ key: "symbol", label: "Stock" }, { key: "score", label: "Score" }];
const rows = Array.from({ length: 10 }, (_, index) => ({ symbol: `S${index + 1}`, score: 90 - index }));
const screen = { parsed_filters: null, results: rows, result_count: 10 } as unknown as AskScreenResult;
const table = { columns, rows, row_count: 10, total_count: 28 };
const sources = [{ type: "signals", label: "Measured signals", detail: "2026-09-14" }];
const base = { role: "assistant" as const, content: "Ten stocks shown.", created_at: "2026-09-14T00:00:00Z" };

const restoredScreen = restoreAskMessage({ ...base, screen, source_citations: sources, follow_ups: ["Show more"] }, null);
assert.equal(restoredScreen.role, "ai");
assert.equal(restoredScreen.text, base.content);
assert.deepEqual(restoredScreen.screen, screen);
assert.equal(restoredScreen.screen?.results.length, 10);
assert.deepEqual(restoredScreen.sourceCitations, sources);
assert.deepEqual(restoredScreen.followUps, ["Show more"]);

const restoredTable = restoreAskMessage({ ...base, table }, "TCS");
assert.deepEqual(restoredTable.table, table);
assert.equal(restoredTable.table?.total_count, 28);
assert.equal(restoredTable.resolvedSymbol, "TCS");

const blocks = restoreAskMessage({
  ...base,
  compare: { symbols: ["TCS", "INFY"] } as never,
  score_history: [{ date: "2026-09-14", composite_score: 72 }],
  web_sourced: true,
  web_source_label: "Wikidata",
  web_source_url: "https://www.wikidata.org/",
  quota_unchanged: true,
}, null);
assert.equal(blocks.compare?.symbols.length, 2);
assert.equal(blocks.scoreHistory?.length, 1);
assert.equal(blocks.webSourced, true);
assert.equal(blocks.webSourceLabel, "Wikidata");
assert.equal(blocks.quotaUnchanged, true);

const countOnly = restoreAskMessage(base, null);
assert.equal(countOnly.table, null);
assert.equal(countOnly.screen, null);

const legacy = restoreAskMessages([
  { role: "user", content: "Old question", created_at: "2026-08-01T00:00:00Z" },
  { role: "assistant", content: "Stored text only", created_at: "2026-08-01T00:00:01Z" },
], null);
assert.equal(legacy.length, 2);
assert.equal(legacy[1].text, "Stored text only");
assert.equal(legacy[1].table, null);
assert.equal(legacy[1].screen, null);

console.log("ask history message restoration: 18 assertions passed");
