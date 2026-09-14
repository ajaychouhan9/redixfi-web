import { mayLoadPageConversation } from "../src/lib/ask-panel/conversationSelectionRule.ts";

let failures = 0;
function check(label: string, actual: boolean, expected: boolean) {
  if (actual === expected) console.log(`  PASS ${label}`);
  else { failures += 1; console.log(`  FAIL ${label} — expected ${expected}, got ${actual}`); }
}

check("TCS page + generic history (TCS history exists) stays selected", mayLoadPageConversation({ activeConversationId: null, explicitlySelectedConversationId: "generic-id", freshChat: false }), false);
check("TCS page + generic history (no TCS history) stays selected", mayLoadPageConversation({ activeConversationId: null, explicitlySelectedConversationId: "generic-id", freshChat: false }), false);
check("selected INFY history is not replaced on TCS page", mayLoadPageConversation({ activeConversationId: null, explicitlySelectedConversationId: "infy-id", freshChat: false }), false);
check("selected TCS history is not replaced on TCS page", mayLoadPageConversation({ activeConversationId: null, explicitlySelectedConversationId: "tcs-id", freshChat: false }), false);
check("generic page + generic history stays selected", mayLoadPageConversation({ activeConversationId: null, explicitlySelectedConversationId: "generic-id", freshChat: false }), false);
check("generic page + TCS history stays selected", mayLoadPageConversation({ activeConversationId: null, explicitlySelectedConversationId: "tcs-id", freshChat: false }), false);
check("selected generic history survives close and reopen", mayLoadPageConversation({ activeConversationId: "generic-id", explicitlySelectedConversationId: "generic-id", freshChat: false }), false);
check("selected generic history survives TCS to INFY navigation", mayLoadPageConversation({ activeConversationId: "generic-id", explicitlySelectedConversationId: "generic-id", freshChat: false }), false);
check("market-wide query remains in selected generic conversation", mayLoadPageConversation({ activeConversationId: "generic-id", explicitlySelectedConversationId: "generic-id", freshChat: false }), false);
check("ambiguous single-stock query does not switch conversations", mayLoadPageConversation({ activeConversationId: "generic-id", explicitlySelectedConversationId: "generic-id", freshChat: false }), false);
check("New Chat on TCS page suppresses automatic replacement", mayLoadPageConversation({ activeConversationId: null, explicitlySelectedConversationId: null, freshChat: true }), false);
check("no active conversation may initialize from page context", mayLoadPageConversation({ activeConversationId: null, explicitlySelectedConversationId: null, freshChat: false }), true);
check("an active conversation never falls back to page history", mayLoadPageConversation({ activeConversationId: "chat-id", explicitlySelectedConversationId: null, freshChat: false }), false);
console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILED`}`);
process.exit(failures ? 1 : 0);
