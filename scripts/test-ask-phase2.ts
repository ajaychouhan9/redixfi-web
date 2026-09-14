import assert from "node:assert/strict";
import {
  ASK_PANEL_WIDTHS,
  DEFAULT_ASK_PANEL_MODE,
  restoreAskPanelMode,
} from "../src/lib/ask-panel/panelMode.ts";
import {
  MARKET_STARTER_QUESTIONS,
  getStarterQuestions,
  isSafeAskSuggestion,
} from "../src/lib/ask-panel/starterQuestions.ts";
import { resolveVisibleChatSymbol } from "../src/lib/ask-panel/contextHeader.ts";
import { readFileSync } from "node:fs";

let checks = 0;
function check(condition: unknown, message: string) {
  checks += 1;
  assert.ok(condition, message);
}

check(DEFAULT_ASK_PANEL_MODE === "half", "desktop default is Half");
check(restoreAskPanelMode("compact") === "compact", "Compact preference restores");
check(restoreAskPanelMode("full") === "full", "Full preference restores across navigation");
check(restoreAskPanelMode("invalid") === "half", "invalid storage falls back to Half");
check(ASK_PANEL_WIDTHS.half.includes("48vw"), "Half targets 48% viewport width");
check(ASK_PANEL_WIDTHS.full.includes("100vw - 14rem"), "Full preserves the desktop navigation rail");

const generic = getStarterQuestions(null);
const tcs = getStarterQuestions("TCS");
check(generic.length === 16, "generic fresh chat has 16 starters");
check(tcs.length === 16, "stock fresh chat has 16 starters");
check(generic.join("|") !== tcs.join("|"), "generic and stock sets materially differ");
check(generic.some((q) => /sector/i.test(q)), "generic set teaches market-wide discovery");
check(generic.some((q) => /TCS|INFY|RELIANCE/.test(q)), "generic set includes explicit-stock examples");
check(tcs.every((q) => q.includes("TCS")), "stock templates substitute the resolved symbol");
check([...generic, ...tcs].every(isSafeAskSuggestion), "all starters pass policy filtering");
check(MARKET_STARTER_QUESTIONS.length === 16, "catalogue stays at the designed count");

for (const unsafe of [
  "Should I buy TCS?",
  "Should I sell RELIANCE?",
  "Should I hold INFY?",
  "What is the target price?",
  "Will TCS rise tomorrow?",
  "Which stock has the highest investment return?",
]) check(!isSafeAskSuggestion(unsafe), `policy rejects: ${unsafe}`);
check(isSafeAskSuggestion("What does XYZ's latest Annual Report say about capex?"), "missing evidence is not a policy failure");

check(resolveVisibleChatSymbol({ chatContextSymbol: null, selectedSymbol: null, pageSymbol: null, conversationId: "generic" }) === null, "generic chat displays Market-wide");
check(resolveVisibleChatSymbol({ chatContextSymbol: "TCS", selectedSymbol: "TCS", pageSymbol: "TCS", conversationId: "tcs" }) === "TCS", "TCS chat displays TCS");
check(resolveVisibleChatSymbol({ chatContextSymbol: "INFY", selectedSymbol: "INFY", pageSymbol: "TCS", conversationId: "infy" }) === "INFY", "page TCS + chat INFY displays INFY");
check(resolveVisibleChatSymbol({ chatContextSymbol: null, selectedSymbol: null, pageSymbol: "TCS", conversationId: "generic" }) === null, "page TCS + generic History remains Market-wide");
check(resolveVisibleChatSymbol({ chatContextSymbol: null, selectedSymbol: null, pageSymbol: "TCS", conversationId: null }) === "TCS", "fresh chat may inherit TCS page context");
check(resolveVisibleChatSymbol({ chatContextSymbol: null, selectedSymbol: null, pageSymbol: "TCS", conversationId: null, pageContextSuppressed: true }) === null, "explicit Clear makes a fresh stock-page chat Market-wide");

const componentSource = readFileSync(new URL("../src/components/app/ask/AskRedixFi.tsx", import.meta.url), "utf8");
const shellSource = readFileSync(new URL("../src/components/layout/AiDockShell.tsx", import.meta.url), "utf8");
const newChatBody = componentSource.slice(componentSource.indexOf("function startNewConversation"), componentSource.indexOf("async function openHistoryList"));
const historyBody = componentSource.slice(componentSource.indexOf("async function openConversation"), componentSource.indexOf("function copyMessage"));
check(!newChatBody.includes("setMode("), "New Chat does not reset workspace size");
check(!historyBody.includes("setMode("), "History selection does not reset workspace size");
check(componentSource.includes('updateAskContext(token, { conversation_id: conversationId, action: "set"'), "Change uses the explicit Phase 1 context action");
check(componentSource.includes('updateAskContext(token, { conversation_id: conversationId, action: "clear"'), "Clear uses the explicit Phase 1 context action");
check(componentSource.includes('md:w-[420px]') && componentSource.includes('lg:w-[var(--ask-panel-width)]'), "mobile/tablet sizing ignores desktop mode width");
check(shellSource.includes('mode !== "full"'), "Full research mode overlays instead of crushing page content");

console.log(`ALL PASS (${checks} checks)`);
