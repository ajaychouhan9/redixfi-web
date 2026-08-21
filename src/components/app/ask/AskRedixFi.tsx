"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X, Send, Search, Globe, Maximize2, Minimize2, RotateCcw, History, ChevronLeft, Copy, Check } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";
import { ApiError } from "@/lib/api/client";
import { searchResearch } from "@/lib/api/endpoints";
import { askRedixfi, getAskConversations, getAskHistory, getUsage, updateAskPreferences } from "@/lib/api/mutations";
import { getCurrentSymbol } from "@/lib/current-symbol";
import { shouldStartFreshOnReopen } from "@/lib/ask-panel/freshStartRule";
import { CompareResultCard } from "@/components/app/signals/CompareResultCard";
import { ScoreHistoryChart } from "@/components/app/ask/ScoreHistoryChart";
import { MarkdownAnswer } from "@/components/app/ask/MarkdownAnswer";
import { SourcesSection } from "@/components/app/ask/SourcesSection";
import { SignalTableRow, type VisibleColumns } from "@/components/app/signals/SignalTableRow";
import { filterChips } from "@/components/app/signals/SmartScreenerBox";
import { Chip } from "@/components/ui/Chip";
import { ExportButton } from "@/components/ui/ExportButton";
import { downloadCsv } from "@/lib/csv";
import type {
  AskConversationListItem,
  AskLimitDetail,
  AskScreenResult,
  AskTableResult,
  AskUsageInfo,
  CompareResult,
  ResearchSearchRow,
  ScoreHistoryPoint,
  SourceCitation,
} from "@/lib/api/types";
import { estimateQuestionWeight } from "@/lib/ask-panel/estimateQuestionWeight";

/**
 * Persistent "RedixFi AI" entry point, per the locked design system: lives
 * ONLY in the top ribbon on every page.
 *
 * TASK 22 PHASE 1 — the "select a stock first" gate is gone. POST /ask
 * (core/ask.py::run_ask_open, Task 22) now extracts a symbol from free
 * text server-side, or answers directly with no symbol at all, whenever
 * this panel opens with no current-page context (Home, Signals list,
 * Watchlist). Signal detail and Research detail pages still register the
 * obvious current symbol via CurrentSymbolSync and preset straight into
 * that conversation, unchanged — see openPanel() below.
 *
 * TASK 22 PHASE 3 — wider panel (was 380px), and a compare/screen-shaped
 * answer renders with the EXACT SAME components the Signals page uses
 * (CompareResultCard, SignalTableRow) rather than a new table.
 *
 * ASK PANEL UI REDESIGN SESSION — three changes on top of everything
 * above: (1) the page-context symbol (`symbol` state, still set exactly
 * the same way — CurrentSymbolSync/getCurrentSymbol on open, or the
 * user picking one from the inline search) is now SILENT — no "Ask
 * about {symbol}" title, no symbol-named placeholder, anywhere, in
 * either panel state. It still drives which stock a symbol-less
 * question implicitly answers about (unchanged backend behavior,
 * confirmed live this session — a symbol NAMED in the question text
 * still overrides it per-question); it's just never displayed. (2) a
 * real chat-history LIST (GET /ask/conversations, new) — the panel's
 * pre-existing `GET /ask/history` only ever resumed the SINGLE most
 * recent conversation per symbol, no way to browse back to an older one
 * once "New chat" moved past it. Reuses `expanded` (the existing
 * full-overlay mode) as its surface, per the task's explicit "don't
 * build a new modal type" instruction — a left column inside the same
 * dialog, not a second UI. (3) staged status text during a live
 * request (`STATUS_STAGES`/`STATUS_STAGES_WITH_CONCALL` below) — a
 * client-side visual sequence timed to loosely match real response
 * latency, since this backend has no streaming/progress-reporting
 * transport (confirmed unchanged this session) — NOT real backend
 * progress, and the copy is deliberately generic enough not to claim
 * otherwise.
 */
interface AskMessage {
  role: "user" | "ai";
  text: string;
  sourceCitations?: SourceCitation[];
  createdAt?: string;
  compare?: CompareResult | null;
  screen?: AskScreenResult | null;
  // Task 22 Phase 4 — narrow web fallback (company-profile facts read from
  // an external source, e.g. Wikidata, when RedixFi's own DB doesn't have
  // it). Rendered as its own visibly distinct badge below, never mixed
  // into the AI-generated framing — this content wasn't LLM-authored.
  webSourced?: boolean;
  webSourceLabel?: string | null;
  webSourceUrl?: string | null;
  // Additive (2026-08-06) — inline trend/comparison chart data (null/empty
  // for a plain single-fact answer, which stays text-only by design) and
  // deterministic follow-up suggestion chips.
  scoreHistory?: ScoreHistoryPoint[] | null;
  resolvedSymbol?: string | null;
  followUps?: string[];
  // RedixFi AI backend upgrade — multi-day/multi-field tabular answer
  // (mode="tabular"), Pro tier only. Null for every other answer shape.
  table?: AskTableResult | null;
  // Weighted-credit system — the ACTUAL weight this turn cost (from the
  // server, result.question_weight / the persisted conversation turn's
  // own field), rendered as a small per-message tag (requirement 4).
  // Undefined only for a turn that predates this field.
  questionWeight?: number;
}

const QUICK_PROMPTS_SYMBOL = [
  "What's driving today's score change?",
  "How does this compare to its sector peers?",
  "What does the composite score measure?",
];

const QUICK_PROMPTS_GENERAL = [
  "Which sectors are strongest today?",
  "What does the composite score measure?",
  "Show me stocks with rising delivery and above-average volume",
];

// volume kept off here — this is a compact in-chat ranking table, out of
// scope for the 2026-08-08 Signals column changes (explicitly scoped to
// the Signals list table). Symbol/Price/Score render unconditionally now
// (VisibleColumns no longer has price/marketCap/vwap fields).
const SCREEN_COLUMNS: VisibleColumns = { sector: true, delivery: true, volume: false, chips: true, eventRisk: false };

// Ask panel UI redesign session — client-side staged status text, played
// while `busy` is true. This is a UX device, NOT real backend progress —
// this backend has no streaming/progress-reporting transport (confirmed
// this session: POST /ask is one synchronous JSON request end to end), so
// there is no genuine stage boundary to report. Copy is deliberately
// generic ("Searching...", "Analyzing...") rather than naming a specific
// backend step, so it never asserts a technical claim that isn't true.
// Timing (~1.3s/stage) is a reasonable estimate calibrated against this
// backend's own LLM_TIMEOUT_SEC=8s request budget (core/ask.py) — there
// is no per-request latency actually logged anywhere in this codebase to
// calibrate against more precisely (checked ask_log's schema first,
// confirmed absent, reported honestly rather than inventing a number).
// The sequence stops advancing at its last stage rather than looping or
// disappearing — a slower-than-usual real answer just sits on "Composing
// answer..." until it lands, never implies a stall or restart.
const STATUS_STAGE_INTERVAL_MS = 1300;
const STATUS_STAGES = ["Searching signals...", "Analyzing data...", "Composing answer..."];
// Extra stage shown only when this symbol is known (client-side, no new
// fetch) to have real concall/investor-transcript data — reuses the exact
// suggestion string core/ask.py::compute_initial_suggestions already
// emits for that case (see CONCALL_SUGGESTION_MARKER below), already
// fetched as part of this panel's existing GET /ask/history request —
// not a new signal or a new backend request, per the task's "determine
// client-side from context" instruction.
const STATUS_STAGES_WITH_CONCALL = ["Searching signals...", "Reading concall transcript...", "Analyzing data...", "Composing answer..."];
// Quotes core/ask.py::compute_initial_suggestions' own real emitted
// suggestion string verbatim (for a string-equality match, not
// marketing/UI copy) — rewording it would break the match.
const CONCALL_SUGGESTION_MARKER = "What did management say on the last call?"; // compliance-ignore

export function AskRedixFi() {
  const { user, getToken, updateCachedUser } = useAuth();
  const { open, setOpen, expanded, setExpanded } = useAskPanel();
  const pathname = usePathname();
  // UI polish batch, Item 4 — LOCKED DECISION, overrides rule 2b's old
  // "always auto-resume the most recent conversation on open" default.
  // `closedAtPathRef` records which route the panel was on the last time
  // the user explicitly closed it (X button); `hasClosedRef` distinguishes
  // "never closed yet this session" (first-ever open — no prior close to
  // compare against, falls back to the old resume behavior, unaffected)
  // from "closed at least once." The reopen effect below compares the
  // CURRENT route against this to decide fresh-vs-resume.
  const closedAtPathRef = useRef<string | null>(null);
  const hasClosedRef = useRef(false);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [results, setResults] = useState<ResearchSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState<AskLimitDetail | null>(null);
  // Weighted-credit system — live "N remaining today/this month" figures
  // from GET /me/usage (core/metering.py::ask_usage_snapshot), which
  // already sums WEIGHTED consumption server-side — this is a read-only
  // mirror, no client-side arithmetic. Refetched on open and after every
  // successful send so it reflects the answer that was just charged.
  const [usage, setUsage] = useState<AskUsageInfo | null>(null);
  // Weighted-credit follow-up session, Enhancement 2 — Pro-tier explicit
  // confirm-before-send for a heavy (weight >=2) question. `null` means
  // no confirmation pending (normal composer flow); set on a Send click/
  // Enter press that estimates >=2 for a Pro caller, cleared on either
  // "Send anyway" (proceeds) or "Cancel" (returns to the input, nothing
  // sent, nothing consumed) — see handleSendClick below.
  const [pendingConfirm, setPendingConfirm] = useState<{ text: string; weight: number } | null>(null);
  // "Always allow" opt-out session (2026-08-21) — local checkbox state for
  // the confirm dialog's "Don't ask me again," reset to unchecked every
  // time a NEW confirmation is raised (see the effect just below
  // pendingConfirm's own setup) so a stale check from a PRIOR dialog can
  // never silently carry over and opt someone out without them checking
  // it on the one they're actually looking at.
  const [dontAskAgain, setDontAskAgain] = useState(false);
  // Phase 3 — persistent chat history. `initialSuggestions` are the
  // context-tailored empty-state chips for THIS symbol (core/ask.py::
  // compute_initial_suggestions, via GET /ask/history) — falls back to
  // the generic QUICK_PROMPTS_SYMBOL set until/unless the server returns
  // something more specific.
  const [initialSuggestions, setInitialSuggestions] = useState<string[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  // Ask panel UI redesign session — real chat-history list state. `null`
  // means "not fetched yet" (distinct from `[]`, "fetched, genuinely
  // none within the retention window"), so the list view can show a
  // loading state rather than a false "no history" flash.
  const [historyList, setHistoryList] = useState<AskConversationListItem[] | null>(null);
  const [showHistoryList, setShowHistoryList] = useState(false);
  // UI polish batch, Item 6 — which section the history drawer shows.
  // Resets to "history" (not persisted) each time the drawer reopens via
  // openHistoryList() below, so it never silently reopens on a stale tab.
  const [historyDrawerTab, setHistoryDrawerTab] = useState<"history" | "usage">("history");
  const [statusStageIndex, setStatusStageIndex] = useState(0);
  // Item 4 (2026-08-21) — copy-to-clipboard feedback for a user's own past
  // question bubble. Index into `messages`, not a boolean, so only the
  // bubble actually clicked shows the brief "copied" checkmark swap —
  // never all of them at once. Cleared on a timer, and also implicitly
  // reset on every fresh copy click (the index just moves).
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyFetchKey = useRef<string | null>(null);
  // BUG 1 fix (2026-08-21) — see the fresh-start effect's own comment below
  // for the full race condition this closes: `startNewConversation()` (a
  // fresh-start reopen) and the loadHistory effect are two SEPARATE effects
  // that both fire in the SAME commit when `open` flips true; the
  // loadHistory effect's closure still sees the PRE-fresh-start `symbol`
  // value (React doesn't re-run a sibling effect mid-flush just because an
  // earlier effect in the same pass called setState), so it was fetching
  // history for the OLD symbol — recreating the "old conversation" the
  // fresh-start was supposed to prevent. This ref, set only when a fresh
  // start just fired, tells the loadHistory effect to skip exactly ONE
  // pass (the stale one) and let the FOLLOWING commit — where `symbol` has
  // actually become the fresh value `startNewConversation()` set — run
  // normally instead.
  const skipNextLoadRef = useRef(false);

  // Symbol-search suggestions — only relevant while no symbol context is set
  // yet; the same box doubles as "ask anything" once ≥2 chars are typed, so
  // this is a convenience overlay, not a gate (Phase 1).
  useEffect(() => {
    if (symbol || input.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const id = setTimeout(() => {
      searchResearch(input.trim(), 6)
        .then((env) => !cancelled && setResults(env.data))
        .finally(() => !cancelled && setSearching(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [input, symbol]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // Ask panel UI redesign session — staged status text, see STATUS_STAGES'
  // own comment for why this is timed rather than real progress. Resets
  // to stage 0 the instant `busy` goes false (the real answer replaces it
  // immediately) and advances on a plain timer while `busy` is true,
  // stopping at the last stage rather than looping.
  const hasConcallSignal = initialSuggestions.includes(CONCALL_SUGGESTION_MARKER);
  useEffect(() => {
    if (!busy) {
      setStatusStageIndex(0);
      return;
    }
    const stages = hasConcallSignal ? STATUS_STAGES_WITH_CONCALL : STATUS_STAGES;
    const timers = stages.slice(1).map((_, i) => setTimeout(() => setStatusStageIndex(i + 1), (i + 1) * STATUS_STAGE_INTERVAL_MS));
    return () => timers.forEach(clearTimeout);
  }, [busy, hasConcallSignal]);

  function close() {
    setOpen(false);
    setExpanded(false);
    setShowHistoryList(false);
    // UI polish batch, Item 4 — arms the fresh-vs-resume check for the
    // NEXT open: if the route changes before then, reopening starts a
    // fresh conversation instead of resuming this one.
    hasClosedRef.current = true;
    closedAtPathRef.current = pathname;
  }

  function pickSymbol(sym: string) {
    setSymbol(sym);
    setResults([]);
    setInput("");
    setMessages([]);
    setConversationId(null);
    setLimit(null);
    setInitialSuggestions([]);
    setHistoryLoaded(false);
    setShowHistoryList(false);
    historyFetchKey.current = null;
  }

  // Phase 3 — resumable history. Loads the caller's most recent
  // conversation for the current symbol (or "_general" server-side) and,
  // for symbol mode, the context-tailored initial suggestion chips —
  // fired once per distinct symbol context per panel-open, not on every
  // render (historyFetchKey guards that).
  //
  // Ask AI symbol-resolution session, locked spec rule 2b — `sym` here is
  // ONLY ever a real value when a page (Research/Signal detail) preset it
  // (rule 2a); a Home/no-page-context open calls this with `sym=null`, in
  // which case the backend now resumes the single most-recently-active
  // conversation across EVERY symbol (core/users_repo.py::get_most_
  // recent_conversation), not one bucketed under "_general" — that
  // resumed conversation's OWN `symbol` field (silently, never displayed
  // — see this file's top docstring) becomes this session's implicit
  // context for the next symbol-less question, per the locked spec's own
  // example (a session that drifted from TCS to INFY mid-thread must
  // resume as INFY, not its starting symbol). Never overrides a REAL
  // page-context `sym` — rule 2a's page-context priority always wins
  // over whatever a resumed conversation says.
  // Weighted-credit system — read-only refresh of the live remaining-count
  // figures; never mutates anything, safe to call as often as needed (on
  // open, and again after each answer so the count reflects the just-
  // charged weight). Silently no-ops on failure — the header falls back to
  // the static per-tier label below when `usage` is still null.
  async function refreshUsage() {
    try {
      const token = await getToken();
      if (!token) return;
      const env = await getUsage(token);
      setUsage(env.ask_redixfi);
    } catch {
      // stays null — header falls back to the static label
    }
  }

  async function loadHistory(sym: string | null) {
    const key = sym ?? "_general";
    if (historyFetchKey.current === key) return;
    historyFetchKey.current = key;
    try {
      const token = await getToken();
      if (!token) return;
      const history = await getAskHistory(token, sym);
      setInitialSuggestions(history.initial_suggestions ?? []);
      const convo = history.conversation;
      if (convo && convo.messages.length > 0) {
        setConversationId(convo.conversation_id);
        const resumedSymbol = !sym && convo.symbol && convo.symbol !== "_general" ? convo.symbol : sym;
        if (!sym && resumedSymbol) setSymbol(resumedSymbol);
        setMessages(
          convo.messages.map((m) => ({
            role: m.role === "user" ? "user" : "ai",
            text: m.content,
            createdAt: m.created_at,
            sourceCitations: m.source_citations,
            followUps: m.role === "assistant" ? m.follow_ups : undefined,
            resolvedSymbol: resumedSymbol,
            questionWeight: m.role === "assistant" ? m.question_weight : undefined,
          }))
        );
      }
    } finally {
      setHistoryLoaded(true);
    }
  }

  // "New conversation" — starts fresh. Re-derives the symbol from PAGE
  // context only (rule 2a — a fresh session opened/continued from a
  // stock's page always starts on that stock again), dropping whatever
  // the previous conversation may have silently drifted to via an
  // explicit mid-thread mention (rule 2c) — that drift belongs to the
  // conversation that's being left behind, not carried into a new one.
  function startNewConversation() {
    setMessages([]);
    setConversationId(null);
    setLimit(null);
    setShowHistoryList(false);
    const pageSymbol = getCurrentSymbol();
    setSymbol(pageSymbol);
    // A fresh key lets the NEXT loadHistory (e.g. a later reopen) run
    // again — but this conversation itself starts empty immediately.
    historyFetchKey.current = pageSymbol ?? "_general";
  }

  // Ask panel UI redesign session — real chat-history list. Reuses
  // `expanded` (the existing full-overlay mode) as its surface, per the
  // task's explicit "don't build a new modal type" instruction.
  // UI polish batch, Item 3 — no longer forces `setExpanded(true)`. History
  // now opens as an in-panel slide-in drawer (see the JSX below) that
  // works within WHATEVER panel mode (floating or expanded) was already
  // active, rather than forcing a full-overlay mode switch just to view
  // it — a real drawer, not a disguised second modal.
  async function openHistoryList() {
    setShowHistoryList(true);
    setHistoryDrawerTab("history");
    const token = await getToken();
    if (!token) return;
    try {
      const list = await getAskConversations(token);
      setHistoryList(list);
    } catch {
      setHistoryList([]);
    }
  }

  // Reopens a PAST conversation from the list — sets the panel's
  // (silent, never displayed) symbol context to that conversation's own
  // stored symbol, so a follow-up sent into it resolves the same way the
  // original conversation did, not whatever page the panel happens to be
  // open from right now. `historyFetchKey` is pre-set to the same key
  // the symbol-context effect below would compute, BEFORE `setSymbol`
  // runs — this suppresses that effect's own "load the latest
  // conversation for this symbol" fetch, which would otherwise
  // immediately overwrite the exact specific conversation just loaded
  // here with the newest one instead.
  async function openConversation(item: AskConversationListItem) {
    const resolvedSymbol = item.symbol === "_general" ? null : item.symbol;
    historyFetchKey.current = resolvedSymbol ?? "_general";
    setShowHistoryList(false);
    setSymbol(resolvedSymbol);
    setResults([]);
    setInput("");
    setLimit(null);
    const token = await getToken();
    if (!token) return;
    try {
      const history = await getAskHistory(token, null, item.conversation_id);
      setConversationId(item.conversation_id);
      setMessages(
        (history.conversation?.messages ?? []).map((m) => ({
          role: m.role === "user" ? "user" : "ai",
          text: m.content,
          createdAt: m.created_at,
          sourceCitations: m.source_citations,
          followUps: m.role === "assistant" ? m.follow_ups : undefined,
          resolvedSymbol,
          questionWeight: m.role === "assistant" ? m.question_weight : undefined,
        }))
      );
      setInitialSuggestions(history.initial_suggestions ?? []);
    } finally {
      setHistoryLoaded(true);
    }
  }

  // Item 4 (2026-08-21) — copies a past question's exact text. Works
  // identically for a live in-progress conversation and a conversation
  // reopened from history: both populate the SAME `messages` state (see
  // loadHistory/openConversation above), so this one handler, reading
  // straight off that state, already covers both surfaces without any
  // extra branching.
  function copyMessage(index: number, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((cur) => (cur === index ? null : cur)), 1500);
    });
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setInput("");
    setResults([]);
    setMessages((prev) => [...prev, { role: "user", text }]);
    try {
      const token = await getToken();
      if (!token) return;
      const result = await askRedixfi(token, { symbol, question: text, conversation_id: conversationId });
      setConversationId(result.conversation_id);
      // Locked spec rule 2c — a symbol NAMED in this question always
      // overrides whatever was current (page context or a prior resolved
      // symbol) AND becomes the new current symbol for the rest of this
      // session going forward, until overridden again. Unconditional now
      // (previously gated on `!symbol`, which meant an explicit mid-
      // session mention while a page-context/prior symbol was already
      // set never actually updated anything — the real gap behind the
      // locked spec's "session must reflect the MOST RECENT stock, not
      // just the one it started with"). A compare/screen/general answer
      // (`resolved_symbol` null) correctly leaves whatever was current
      // unchanged — those don't establish a new single-stock context,
      // same reasoning core/users_repo.py::start_conversation's own
      // evolving-symbol fix uses server-side.
      if (result.mode === "symbol" && result.resolved_symbol) {
        setSymbol(result.resolved_symbol);
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "ai", text: result.answer, sourceCitations: result.source_citations,
          compare: result.compare, screen: result.screen, table: result.table,
          webSourced: result.web_sourced, webSourceLabel: result.web_source_label, webSourceUrl: result.web_source_url,
          scoreHistory: result.score_history, resolvedSymbol: result.resolved_symbol, followUps: result.follow_ups,
          questionWeight: result.question_weight,
        },
      ]);
      // Weighted-credit system — this answer was just charged server-side
      // (core/routers/ask.py, only on confirmed successful delivery); pull
      // the fresh remaining-count now rather than computing it locally, so
      // it can never drift from what the server actually deducted.
      refreshUsage();
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setLimit(e.detail as AskLimitDetail);
        setMessages((prev) => prev.slice(0, -1));
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: "Something went wrong reaching RedixFi AI — try again in a moment." },
        ]);
      }
    } finally {
      setBusy(false);
    }
  }

  // Weighted-credit follow-up session, Enhancement 2 — same founding->pro
  // capability equivalence this file already applies for the daily-limit
  // label just below (a founding member paid a premium and gets Pro's
  // capabilities), reused here rather than re-deriving a second notion of
  // "is this a Pro caller." Still used for the TABULAR-mode gate
  // specifically (tabular is genuinely Pro-only, core/tabular_ask.py's own
  // module docstring) — passed into estimateQuestionWeight() below.
  const isPro = user?.tier === "pro" || user?.tier === "founding";
  // BUG 2 fix (2026-08-21) — "is this caller's Ask usage charged by
  // WEIGHT at all." Basic and Pro both draw from a weighted daily/monthly
  // bucket (core/metering.py::enforce_ask_usage's aggregate branch, weight
  // 1-3 per question); Free draws from a flat per-symbol gate that
  // IGNORES weight entirely (same function's `daily_limit_per_symbol`
  // branch — confirmed by reading it directly: `increment_usage(...)`
  // with no weight argument at all). A "this uses up to N of your daily
  // questions" prompt is accurate for Basic/Pro and actively WRONG for
  // Free (their one question always costs exactly 1, regardless of N) —
  // so the confirm-before-send flow below applies to Basic+Pro only,
  // never Free, matching what each tier is ACTUALLY charged for.
  const isWeightedTier = !!user && user.tier !== "free";

  // Weighted-credit follow-up session, Enhancement 2 — the ONLY entry
  // point the composer's Send button and Enter key now go through
  // (replacing direct invocations of send()). Weight-1 questions send
  // immediately exactly as before — no added friction.
  //
  // BUG 2 fix (2026-08-21) — was `isPro && weight >= 2`, showing this
  // confirmation ONLY for Pro; Basic instead got a passive, non-blocking
  // hint line (now removed, see the composer JSX below) with no actual
  // confirm/cancel step. Founder-reported bug: Basic showed "uses up to 2"
  // but was charged 1 regardless of whether the user "confirmed" anything
  // — there was nothing to confirm. Now gated on `isWeightedTier`
  // (Basic+Pro alike, never Free) — SAME component, SAME logic, for both
  // billed tiers, per the task's explicit "this should not be tier-
  // different UI" instruction. `send()` itself is not invoked until the
  // user explicitly clicks "Send" — nothing is charged before that.
  //
  // "Always allow" opt-out session (2026-08-21) — `user?.ask_skip_confirm`
  // (per-account, persisted server-side, see AuthContext's own comment on
  // how it stays fresh mid-session) skips straight to `send()` even for a
  // weight>=2 question, exactly like a weight-1 one — no dialog, no click
  // required, per the locked spec's own "must not require a click to
  // proceed" requirement once opted in. Tier-independent by construction:
  // this check is ADDITIONAL to `isWeightedTier`, never a replacement for
  // it — a Free caller still never reaches this branch at all (their
  // charge doesn't depend on weight either way), and a Basic/Pro caller
  // who hasn't opted in still gets the normal dialog.
  function handleSendClick(text: string) {
    if (!text.trim() || busy) return;
    const weight = estimateQuestionWeight(text, isPro);
    if (isWeightedTier && weight >= 2 && !user?.ask_skip_confirm) {
      setPendingConfirm({ text, weight });
      setDontAskAgain(false);
      return;
    }
    send(text);
  }

  // Editing the question while a confirmation is pending invalidates it —
  // the confirmed weight/text no longer matches what's in the box, so
  // silently re-confirming on a stale estimate would be wrong. Clears
  // back to the normal composer; the next Send/Enter re-evaluates fresh.
  useEffect(() => {
    if (pendingConfirm && input !== pendingConfirm.text) {
      setPendingConfirm(null);
    }
  }, [input, pendingConfirm]);

  // Correction session (2026-08-21) — the immediately prior session's Item
  // 2 removed the header count entirely and moved it into the Usage tab
  // ONLY; corrected THIS session back to showing real daily/monthly/addon
  // numbers directly in the panel header (see the header JSX below), per
  // the founder's explicit reversal. Reads the SAME `usage` state (GET
  // /me/usage, via refreshUsage() below) the Usage tab itself already
  // renders from — not a second calculation, so these two displays can
  // never disagree (the exact bug class the 2026-08-20 header/subtitle
  // session had to fix once already for the OLD badge/subtitle pair).
  // `null` usage (not yet fetched) renders a plain loading string rather
  // than a placeholder "0" that could misread as a real exhausted count.
  const usageHeaderLine = !usage
    ? "Loading usage…"
    : usage.daily_limit_per_symbol !== null
      ? `Free tier: ${usage.daily_limit_per_symbol}/symbol/day · Addon: ${usage.topup_questions_remaining} remaining`
      : `Daily: ${usage.daily_used ?? 0}/${usage.daily_limit} · Monthly: ${usage.monthly_used ?? 0}/${usage.monthly_limit} · Addon: ${usage.topup_questions_remaining} remaining`;
  // Context-tailored suggestions (Phase 3/GET /ask/history) win over the
  // generic per-mode fallback whenever the server had something specific
  // to say about this symbol; the generic set still covers open/general
  // mode (no per-symbol tailoring there) and the loading window before
  // history has resolved.
  const quickPrompts = symbol
    ? initialSuggestions.length > 0
      ? initialSuggestions
      : QUICK_PROMPTS_SYMBOL
    : QUICK_PROMPTS_GENERAL;

  // UI polish batch, Item 4 — the actual fresh-vs-resume decision. Fires
  // BEFORE the preset-symbol/loadHistory effects below (declaration
  // order — React runs a component's effects in the order they're
  // declared, within the same commit) so by the time they run, a
  // navigation-triggered reset has already cleared the stale state they'd
  // otherwise act on. Reuses startNewConversation() (the exact same
  // "clear + re-derive symbol from page context" logic the manual "New
  // chat" button already uses) rather than a second reset implementation
  // — this session's fresh-start behavior IS that same behavior, just
  // triggered automatically instead of by a click.
  //
  // Only fires when: the panel is open, it was explicitly closed at least
  // once before (`hasClosedRef` — an app's very first-ever open has
  // nothing to compare against and keeps the old resume behavior,
  // unaffected by this change), AND the route at that close differs from
  // the route right now. Toggling the panel open/closed on the exact same
  // page (no navigation in between) never reaches this branch — local
  // state (messages, symbol, conversationId) was never cleared for that
  // case, so the existing conversation naturally continues, matching the
  // task's own "ambiguous case, prefer resuming when nothing navigated"
  // guidance.
  // Regression-fix session (2026-08-21) — this exact condition now lives in
  // shouldStartFreshOnReopen() (src/lib/ask-panel/freshStartRule.ts),
  // extracted verbatim (same boolean expression, not re-derived) so
  // scripts/test-ask-fresh-start.ts can assert it directly — this rule has
  // regressed and needed re-fixing more than once (UI polish batch, Item 4,
  // 2026-08-20; this session again), and an inline-only condition had no
  // way to be tested outside a full React/DOM harness. Re-verified this
  // session against the live component: still fires in the correct
  // declaration-order position (before the preset-symbol/loadHistory
  // effects below), still reachable via every close() path (X button,
  // expanded-mode backdrop click — grepped, no `setOpen(false)` bypasses
  // close() anywhere in this file).
  //
  // BUG 1 fix (2026-08-21) — the regression-fix session confirmed this
  // exact condition and its reachability were intact, but missed a real
  // SAME-COMMIT race with the loadHistory effect below: both fire in the
  // SAME pass when `open` flips true; `startNewConversation()` here
  // invokes `setSymbol(pageSymbol)`, but the loadHistory effect's closure
  // — already created before this effect ran — still holds the PRE-update
  // `symbol` (React doesn't propagate a sibling effect's setState mid-
  // flush), so it was fetching and RESUMING the OLD symbol's conversation
  // the instant after this effect just cleared it. Root cause of the
  // "Pro-only fixed" report: this race exists for every tier equally (no
  // tier-conditional code anywhere in this mechanism — grepped), but Free
  // (genuinely B8-masked symbols) and Basic (needs the SAME async unlock-
  // correction round-trip to prove they're not free, even though B8 never
  // actually masks them — see `SignalUnlockGate.tsx`) hit the underlying
  // trigger — `getCurrentSymbol()` returning stale/null while that
  // correction is still in flight — on almost every realistic non-top-N
  // test symbol, while a Pro tester testing against an always-visible
  // top-N/watchlist symbol (no correction delay at all) can easily never
  // hit it. `skipNextLoadRef` (declared with this file's other refs
  // above) closes the race: armed here on every fresh start, consumed by
  // the loadHistory effect below, which skips exactly the one stale-
  // closure pass and adopts the CORRECT symbol on the very next commit
  // instead.
  useEffect(() => {
    if (shouldStartFreshOnReopen({ open, hasClosedBefore: hasClosedRef.current, closedAtPath: closedAtPathRef.current, currentPath: pathname })) {
      startNewConversation();
      hasClosedRef.current = false; // consumed — re-armed on the next close()
      skipNextLoadRef.current = true; // consumed by the loadHistory effect below
    }
  }, [open, pathname]);

  // Presets the current page's symbol into a fresh conversation whenever the
  // panel opens with none chosen yet — runs off `open` itself (not a local
  // click handler) so this fires the same way for EITHER real trigger: the
  // header button below, or Sidebar's "AI Assistant" nav item opening the
  // same shared panel via AskPanelContext.
  useEffect(() => {
    if (open && !symbol) {
      const preset = getCurrentSymbol();
      if (preset) pickSymbol(preset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Phase 3 — load resumable history (and, in symbol mode, the tailored
  // initial suggestions) once per distinct symbol context, whenever the
  // panel is open. Fires after the preset-symbol effect above so a page's
  // own current symbol is already resolved before history is fetched for
  // it, not for the stale "no symbol yet" state.
  //
  // BUG 1 fix (2026-08-21) — `skipNextLoadRef` (see the fresh-start effect
  // above for the full race this closes) skips exactly the ONE pass
  // immediately following a fresh start, where `symbol` here is still the
  // STALE pre-fresh-start value (same-commit closure, not yet re-rendered)
  // — without this, `loadHistory(symbol)` would fetch and resume the OLD
  // conversation the fresh start was just clearing. The very next commit
  // (symbol now the fresh value `startNewConversation()` set, `open`
  // unchanged) re-runs this effect normally — `historyFetchKey.current`
  // already matches that key by then (set by `startNewConversation()`
  // itself), so `loadHistory` correctly no-ops and the conversation stays
  // genuinely empty, not a phantom resume.
  useEffect(() => {
    if (open && user) {
      if (skipNextLoadRef.current) {
        skipNextLoadRef.current = false;
        return;
      }
      loadHistory(symbol);
      refreshUsage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, symbol, user]);

  return (
    <>
      {/* Font-size fix (2026-08-11): was text-xs (12px), task wants 14px.
          Mobile-header-overlap fix (2026-08-16): the "RedixFi AI" text
          label never collapsed at any width, contributing fixed
          non-shrinkable content to MarketRibbon's flex-wrap row on narrow
          phones — text hidden below sm (640px, this codebase's own
          breakpoint convention), icon-only trigger there; padding also
          tightens to square-ish at that width so the button reads as a
          compact icon button, not a wide pill with invisible label space. */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask RedixFi AI"
        className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-semibold transition-transform hover:scale-105 sm:px-3"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-dim))", color: "var(--accent-foreground)" }}
      >
        <Sparkles size={12} /> <span className="hidden sm:inline">RedixFi AI</span>
      </button>

      {/* Phase 5 — expanded mode dims the page behind it, same overlay
          posture as any modal in this codebase, but stays a dialog on TOP
          of the current page rather than navigating to a new route (task
          brief's explicit "not a new page/route" requirement). */}
      {open && expanded && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={close} aria-hidden />
      )}

      {open && (
        <div
          className={
            expanded
              ? "fixed inset-x-3 top-3 bottom-3 z-50 mx-auto flex max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl sm:inset-x-6 sm:top-6 sm:bottom-6"
              : "fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] w-full flex-col overflow-hidden border border-border bg-surface-raised shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[460px] sm:rounded-2xl lg:w-[560px]"
          }
          role="dialog"
          aria-label="Ask RedixFi AI"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border bg-accent/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-accent" />
              <div>
                {/* Ask panel UI redesign session — the page-context symbol is
                    never named here, in EITHER panel state (see this file's
                    top docstring). This line is now IDENTICAL regardless of
                    whether a page-context/picked symbol is silently active.
                    UI polish batch, Item 3 — the header no longer swaps to a
                    "Chat history" title at all: history now opens as a
                    drawer OVER the chat (see below), not a full content
                    replacement, so this header stays constant underneath it. */}
                <div className="text-sm font-semibold">RedixFi AI</div>
                {/* Correction session (2026-08-21) — Item 2 corrected: the
                    generic "Grounded in measured data only · ask about any
                    stock..." disclaimer line is OUT; a real, live
                    daily/monthly/addon counter line is IN, sourced from the
                    same `usage` state as the Usage tab (see
                    `usageHeaderLine` above) — never a second calculation.
                    Free tier has no daily/monthly aggregate (it's a
                    per-symbol gate, core/metering.py::enforce_ask_usage),
                    so its own line shows the per-symbol limit instead.
                    Still text-foreground/14px (unchanged from the prior
                    session's BUG B FIX contrast reasoning, still in git
                    history) — only the CONTENT of this line changed. */}
                <div className="text-[14px] text-foreground">{usageHeaderLine}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* BUG B FIX (UI-polish-batch bug-fix session) — icons were
                  ALREADY at size={16} from the prior session (History was
                  13px, RotateCcw was 11px, originally) — confirmed present
                  in source, but 16px is only +23% over History's original
                  13px, short of this bug's own 30-40% floor. Now
                  size={18}: +38% over History's original 13px, +64% over
                  RotateCcw's original 11px — comfortably past the
                  requested floor for BOTH icons, and visibly the largest
                  icons in this header (bigger than the neighboring
                  Maximize2/Minimize2/X at 14-16px, which is intentional —
                  these two needed to read as clearly, unmistakably
                  larger, not just "technically increased"). Labels/icons
                  also switched from text-foreground-muted to
                  text-foreground for the same reason as the subtitle
                  above, with an text-accent hover state (was text-
                  foreground, a same-shade-of-grey hover that gave no
                  visual feedback of its own). */}
              {messages.length > 0 && (
                <button
                  onClick={startNewConversation}
                  title="New conversation"
                  aria-label="New conversation"
                  className="flex items-center gap-1 text-[14px] text-foreground hover:text-accent"
                >
                  <RotateCcw size={18} /> New
                </button>
              )}
              <button
                onClick={openHistoryList}
                title="Chat history"
                aria-label="Chat history"
                className="flex items-center gap-1 text-[14px] text-foreground hover:text-accent"
              >
                <History size={18} />
              </button>
              {/* Ask AI symbol-resolution session, locked spec rule 1 —
                  NO "Change stock" UI anywhere, unconditionally. Stock
                  context is 100% backend-resolved (page context / session
                  drift / explicit mention, see this file's top docstring
                  and core/ask.py's priority order) — there is nothing
                  left for the user to manually toggle. */}
              <button
                onClick={() => setExpanded(!expanded)}
                aria-label={expanded ? "Collapse" : "Expand"}
                className="text-foreground-faint hover:text-foreground"
              >
                {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button onClick={close} aria-label="Close" className="text-foreground-faint hover:text-foreground">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* UI polish batch, Item 3 — this wrapper is the drawer's
              positioning context (`relative`); the drawer itself (added
              below, after the chat content) is `absolute inset-0` within
              it, sliding in over the chat area ONLY — the header above
              stays put, untouched by the drawer. */}
          <div className="relative flex flex-1 flex-col overflow-hidden">
          {!user ? (
            <div className="space-y-3 px-4 py-6 text-center">
              <p className="text-sm text-foreground-muted">Log in to ask RedixFi AI questions about any stock, grounded in today&apos;s measured data.</p>
              <Link
                href="/login"
                onClick={close}
                className="inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
              >
                Log in
              </Link>
            </div>
          ) : (
            <>
              <div
                ref={scrollRef}
                className={expanded ? "flex-1 space-y-3 overflow-y-auto px-4 py-3" : "space-y-3 overflow-y-auto px-4 py-3"}
                style={expanded ? undefined : { maxHeight: "58vh", minHeight: messages.length ? 200 : undefined }}
              >
                {!symbol && results.length > 0 && (
                  <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                    {results.map((r) => (
                      <li key={r.canonicalSymbol}>
                        <button
                          onClick={() => pickSymbol(r.canonicalSymbol)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-hover"
                        >
                          <span>
                            <span className="font-semibold">{r.canonicalSymbol}</span>{" "}
                            <span className="text-foreground-faint">{r.company_name}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!symbol && searching && <p className="px-1 text-xs text-foreground-faint">Searching…</p>}

                {messages.length === 0 && !historyLoaded && (
                  <p className="px-1 text-xs text-foreground-faint">Loading…</p>
                )}
                {messages.length === 0 && historyLoaded && (
                  <div>
                    <p className="mb-2 text-xs text-foreground-faint">Try asking:</p>
                    <div className="space-y-1.5">
                      {/* BUG FIX (2026-08-21, confirm-dialog-skipped
                          investigation) — was `onClick={() => send(p)}`,
                          calling send() DIRECTLY: a quick-prompt chip's
                          question skipped handleSendClick() (and therefore
                          the weight>=2 confirm gate) entirely, regardless
                          of its estimated weight, since it never went
                          through the one function that checks it. A
                          server-tailored suggestion CAN legitimately be a
                          heavy, document-grounded question (e.g. the
                          concall-aware initial-suggestion chip this file
                          already special-cases via CONCALL_SUGGESTION_
                          MARKER above) — a real, structural gap, not a
                          wrong-estimate problem (estimateQuestionWeight
                          itself already returns 3 for the exact reported
                          "ABB annual report and concall summary" text,
                          confirmed directly before this fix — see
                          estimateQuestionWeight.ts, unchanged this
                          session). Routed through handleSendClick()
                          instead — same gate, same dialog, regardless of
                          which UI element triggered the question. */}
                      {quickPrompts.map((p) => (
                        <button
                          key={p}
                          onClick={() => handleSendClick(p)}
                          className="w-full rounded-lg border border-border bg-hover px-3 py-2 text-left text-[12.5px] text-foreground-muted transition-colors hover:text-foreground"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i}>
                    <div className={m.role === "user" ? "group flex items-center justify-end gap-1.5" : ""}>
                      {/* Item 4 (2026-08-21) — copy a past question's exact text.
                          Hover-revealed (matches this panel's existing icon-button
                          convention, e.g. the header's History/New-conversation
                          buttons, none of which sit permanently visible inline with
                          content), but stays reachable via keyboard focus. Reads off
                          the SAME `messages` state that both a live conversation and
                          a reopened-from-history one populate (loadHistory/
                          openConversation above), so this one button already covers
                          both surfaces. */}
                      {m.role === "user" && (
                        <button
                          onClick={() => copyMessage(i, m.text)}
                          aria-label="Copy question"
                          title="Copy question"
                          className="shrink-0 text-foreground-faint opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          {copiedIndex === i ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      )}
                      <div
                        className="max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed break-words"
                        style={
                          m.role === "user"
                            ? { background: "var(--accent)", color: "var(--accent-foreground)", fontSize: "13px" }
                            : // Item 3 (2026-08-21) — the AI answer body specifically
                              // (not the subtitle, not icons, not the user's own
                              // question above): was text-foreground-muted/13px, now
                              // text-foreground (this codebase's established
                              // "maximum contrast" token — #1a2036 near-black on the
                              // light theme's near-white --hover bubble background,
                              // #e8eaf2 near-white on the dark theme's near-black one;
                              // see globals.css) at 14.3px (13 * 1.1, ~10% larger).
                              // Literal pure #ffffff was NOT used: this bubble's own
                              // background (var(--hover)) is itself near-white in the
                              // LIGHT theme, so white-on-white text would be
                              // unreadable there — text-foreground already gives
                              // near-white in the dark theme (this app's primary
                              // theme) while staying legible in light mode too.
                              { background: "var(--hover)", color: "var(--foreground)", border: "1px solid var(--border)", fontSize: "14.3px" }
                        }
                      >
                        {/* Phase 2 — structured markdown rendering for AI answers
                            (headers/bold/bullets, core/ask.py's ASK_SYSTEM_TEMPLATE
                            rule 7); a user's own question stays plain text. */}
                        {m.role === "ai" ? <MarkdownAnswer text={m.text} /> : m.text}
                        {/* Task 22 Phase 4 — MUST be visibly labeled, not just a backend
                            flag (task doc's explicit requirement): a distinct badge, never
                            folded into the source citations below (those imply RedixFi's
                            own measured data; this wasn't LLM-generated or RedixFi-sourced
                            at all — a structured fact read from an external source). */}
                        {m.webSourced && (
                          <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-[12px] text-foreground-faint">
                            <Globe size={11} className="shrink-0" />
                            {m.webSourceUrl ? (
                              <a href={m.webSourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                                Sourced from the web ({m.webSourceLabel ?? "external"}), not RedixFi&apos;s own data
                              </a>
                            ) : (
                              <span>Sourced from the web ({m.webSourceLabel ?? "external"}), not RedixFi&apos;s own data</span>
                            )}
                          </div>
                        )}
                        {/* Phase 1 — collapsible per-source citations, replaces the
                            old bare sources_used category chips entirely. */}
                        {m.role === "ai" && m.sourceCitations && <SourcesSection citations={m.sourceCitations} />}
                        {(m.createdAt || (m.role === "ai" && !!m.questionWeight)) && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-foreground-faint opacity-70">
                            {m.createdAt && (
                              <span>
                                {new Date(m.createdAt).toLocaleString(undefined, {
                                  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                                })}
                              </span>
                            )}
                            {/* Weighted-credit system, requirement 4 — per-message cost
                                tag. Only shown when this turn actually consumed quota
                                (>0; a locked-guard/clarify-symbol turn costs nothing and
                                shows no tag at all, matching it never being charged). */}
                            {m.role === "ai" && !!m.questionWeight && (
                              <span
                                className="rounded-full px-1.5 py-0.5 font-mono"
                                style={{ background: "var(--hover)", border: "1px solid var(--border)" }}
                                title={`This answer used ${m.questionWeight} of your daily/monthly questions`}
                              >
                                −{m.questionWeight}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Task 22 Phase 3 — comparative/tabular answers render as a
                        full-width block below the prose bubble, reusing the
                        EXACT Signals-page components, never a cramped in-bubble
                        table. */}
                    {m.compare && m.compare.symbols.length > 0 && <CompareResultCard compare={m.compare} />}
                    {m.screen && m.screen.results.length > 0 && (
                      <div className="mt-2">
                        {filterChips(m.screen).length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {filterChips(m.screen).map((c) => (
                              <Chip key={c} tone="accent">
                                {c}
                              </Chip>
                            ))}
                          </div>
                        )}
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full min-w-[560px] text-sm">
                            {/* Font-size audit (2026-08-11): was text-[11px],
                                bumped to text-[13px] per the task's 13px
                                "secondary labels" floor. */}
                            <thead>
                              <tr className="border-b border-border text-left font-mono text-[13px] uppercase tracking-wide text-foreground-faint">
                                <th className="px-3 py-2">Symbol</th>
                                <th className="px-3 py-2">Sector</th>
                                <th className="px-3 py-2">Score</th>
                                <th className="px-3 py-2">Delivery</th>
                                <th className="px-3 py-2">Signals</th>
                                <th className="px-3 py-2" />
                              </tr>
                            </thead>
                            <tbody>
                              {m.screen.results.map((row) => (
                                <SignalTableRow key={row.symbol} row={row} columns={SCREEN_COLUMNS} />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* RedixFi AI backend upgrade — multi-day/multi-field
                        tabular answer (mode="tabular", Pro tier only).
                        Same table markup/styling as the screen-result table
                        just above (border/overflow-x-auto wrapper, mono
                        uppercase header) — no existing component already
                        renders an arbitrary date x symbol×field grid
                        (SignalTableRow/CompareResultCard both have fixed,
                        signal-specific column shapes), so this reuses the
                        established VISUAL pattern rather than introducing a
                        new one, plus the shared ExportButton/downloadCsv
                        utilities already used by Signals/Research/Market
                        Activity exports for the CSV download. */}
                    {m.table && m.table.rows.length > 0 && (
                      <div className="mt-2">
                        <div className="mb-1.5 flex justify-end">
                          <ExportButton
                            canExport
                            onExport={() =>
                              downloadCsv(
                                "redixfi-ask-table.csv",
                                m.table!.rows.map((row) => {
                                  const out: Record<string, unknown> = { Date: row.date };
                                  for (const col of m.table!.columns) out[col.label] = row[col.key];
                                  return out;
                                })
                              )
                            }
                          />
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full min-w-[560px] text-sm">
                            <thead>
                              <tr className="border-b border-border text-left font-mono text-[13px] uppercase tracking-wide text-foreground-faint">
                                <th className="px-3 py-2">Date</th>
                                {m.table.columns.map((col) => (
                                  <th key={col.key} className="px-3 py-2">
                                    {col.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {m.table.rows.map((row) => (
                                <tr key={String(row.date)} className="border-b border-border last:border-0">
                                  <td className="px-3 py-2 text-foreground-muted">{row.date}</td>
                                  {m.table!.columns.map((col) => (
                                    <td key={col.key} className="px-3 py-2">
                                      {/* Backend now fills every column on every row (a
                                          genuine gap, e.g. price present but that date's
                                          composite_score doc doesn't exist yet, renders as
                                          "N/A" — see core/tabular_ask.py::build_tabular_
                                          answer) — this `??` is a defense-in-depth fallback
                                          only, kept consistent with that same string. */}
                                      {row[col.key] ?? "N/A"}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Additive (2026-08-06) — inline trend/comparison chart.
                        A compare answer's chart data lives on `compare.score_history`
                        (one series per resolved, unlocked symbol); a plain
                        per-symbol causal/trend answer carries its own single-
                        series `scoreHistory` directly. Plain single-fact
                        answers carry neither and render no chart, by design. */}
                    {m.compare && m.compare.symbols.length > 0 && Object.keys(m.compare.score_history ?? {}).length > 0 && (
                      <ScoreHistoryChart
                        series={m.compare.symbols
                          .filter((sym) => m.compare!.score_history[sym])
                          .map((sym) => ({ symbol: sym, points: m.compare!.score_history[sym] }))}
                      />
                    )}
                    {!m.compare && m.scoreHistory && m.scoreHistory.length > 0 && m.resolvedSymbol && (
                      <ScoreHistoryChart series={[{ symbol: m.resolvedSymbol, points: m.scoreHistory }]} />
                    )}

                    {/* Additive (2026-08-06) — deterministic follow-up chips,
                        reusing the SAME empty-state "Try asking" chip pattern
                        above (no new chip component), shown only under the
                        MOST RECENT answer.
                        BUG FIX (2026-08-21) — same confirm-dialog-skipped
                        fix as the quick-prompt chips above: was
                        `onClick={() => send(f)}` (direct), now routed
                        through handleSendClick() so a heavy follow-up
                        suggestion gets the same weight>=2 confirm gate a
                        typed-and-Sent question does. */}
                    {m.role === "ai" && i === messages.length - 1 && !busy && m.followUps && m.followUps.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.followUps.map((f) => (
                          <button
                            key={f}
                            onClick={() => handleSendClick(f)}
                            className="rounded-full border border-border bg-hover px-2.5 py-1 text-left text-[11.5px] text-foreground-muted transition-colors hover:text-foreground"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {busy && (
                  <p className="text-xs text-foreground-faint">
                    {(hasConcallSignal ? STATUS_STAGES_WITH_CONCALL : STATUS_STAGES)[statusStageIndex]}
                  </p>
                )}
              </div>

              {/* BUG D FIX (UI-polish-batch bug-fix session) — root cause:
                  the backend returns the SAME `cta: "topup"` for BOTH
                  Basic and Pro hitting their daily/monthly cap (confirmed
                  directly in core/metering.py::enforce_ask_usage — it
                  never distinguishes the two tiers at all), so the old
                  `limit.cta === "subscribe" ? "View plans" : "Manage
                  plan"` ternary rendered "Manage plan" for EVERY topup-cta
                  case, Pro included — even though Pro has no higher tier
                  to "manage" toward. `/pricing` is still the correct link
                  for a Pro caller too (confirmed: CheckoutView.tsx already
                  renders <TopupCard/> on that exact route for any
                  non-free tier, so this CTA lands the user exactly on the
                  real, already-built purchase widget — not a new route).
                  Label text reuses TopupCard's OWN existing button wording
                  ("Add 50 questions — ₹99") rather than inventing new
                  copy — "Add more questions" (not "Buy", which
                  scripts/check-compliance.mjs correctly forbids sitewide
                  as advice-shaped language, even here where it would
                  genuinely just mean a commerce action — the checker
                  doesn't special-case that, and this codebase's own
                  compliance posture is deliberately not to try). Basic
                  (cta="topup", !isPro) keeps "Manage plan" UNCHANGED, per
                  this bug's own explicit "don't break Basic" instruction
                  — upgrading to Pro genuinely helps a Basic caller, so
                  that CTA stays correct for them. */}
              {limit && (
                <div className="mx-4 mb-2 rounded-lg bg-amber-bg px-3 py-2 text-xs text-amber">
                  {limit.message}{" "}
                  <Link href="/pricing" className="font-semibold underline">
                    {limit.cta === "subscribe" ? "View plans" : isPro ? "Add more questions" : "Manage plan"}
                  </Link>
                </div>
              )}

              {/* BUG 2 fix (2026-08-21) — the old passive, non-blocking hint
                  line (shown to Basic/Free, no actual confirm/cancel step)
                  is REMOVED. It's no longer needed for Basic: a weight>=2
                  question now goes through the SAME active confirm dialog
                  Pro already had (see `isWeightedTier` above), so Basic
                  never reaches a state where a hint-only line would apply.
                  Free is correctly excluded entirely now (was previously
                  also shown this line, inaccurately — Free's one allowed
                  question always costs exactly 1 regardless of estimated
                  weight, so a "uses up to N" hint was never true for them;
                  see `isWeightedTier`'s own comment above). */}
              {/* Weighted-credit follow-up session, Enhancement 2 — active
                  confirm-before-send for a weight>=2 question. BUG 2 fix
                  (2026-08-21): was Pro-only (`isPro && pendingConfirm`); now
                  fires for Basic and Pro alike (`pendingConfirm` can only
                  ever be SET for a weighted tier at all — see
                  handleSendClick's `isWeightedTier` gate above — so no
                  separate tier check is needed here; one source of truth,
                  not two). Nothing has been sent yet: handleSendClick set
                  this state INSTEAD of calling send(), so "Cancel" costs
                  nothing and "Send anyway" is the first point this question
                  actually goes out. */}
              {pendingConfirm && (
                <div className="mx-3 mb-1.5 space-y-1.5 rounded-lg bg-accent/10 px-2.5 py-1.5 text-[11px] text-foreground-faint">
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      This detailed request uses up to {pendingConfirm.weight} of your daily questions. Send anyway?
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => setPendingConfirm(null)}
                        className="font-semibold text-foreground-muted hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const { text } = pendingConfirm;
                          setPendingConfirm(null);
                          // "Always allow" opt-out session (2026-08-21) —
                          // the preference is only ever PERSISTED here, on
                          // an explicit Send with the box checked (per the
                          // locked spec's own "if checked before clicking
                          // Send" wording) — checking the box and then
                          // Cancelling saves nothing, matching "nothing
                          // sent, nothing consumed, nothing changed" for
                          // Cancel everywhere else in this file. Fire-and-
                          // forget: the send itself must not wait on this
                          // PATCH landing — same fail-soft posture as
                          // refreshUsage() elsewhere in this file. Updates
                          // the cached `user` immediately (updateCachedUser)
                          // so the VERY NEXT weight>=2 question this
                          // session skips the dialog without waiting for
                          // AuthContext's own once-per-login GET /me.
                          if (dontAskAgain) {
                            updateCachedUser({ ask_skip_confirm: true });
                            getToken().then((token) => {
                              if (token) updateAskPreferences(token, true).catch(() => {});
                            });
                          }
                          send(text);
                        }}
                        className="rounded-full bg-accent px-2.5 py-1 font-semibold text-accent-foreground"
                      >
                        Send
                      </button>
                    </span>
                  </div>
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={dontAskAgain}
                      onChange={(e) => setDontAskAgain(e.target.checked)}
                      className="h-3 w-3 shrink-0 accent-accent"
                    />
                    Don&apos;t ask me again
                  </label>
                </div>
              )}
              <div className="flex items-center gap-2 border-t border-border p-3">
                {!symbol && (
                  <Search size={14} className="shrink-0 text-foreground-faint" aria-hidden />
                )}
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendClick(input)}
                  placeholder="Ask anything — a stock, a sector, or in general…"
                  disabled={busy}
                  className="flex-1 rounded-lg border border-border bg-hover px-3 py-2 text-sm outline-none disabled:opacity-60"
                />
                <button
                  onClick={() => handleSendClick(input)}
                  disabled={busy || !input.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground disabled:opacity-50"
                  aria-label="Send"
                >
                  <Send size={14} />
                </button>
              </div>
            </>
          )}

          {/* BUG A FIX (UI-polish-batch bug-fix session) — this was
              `absolute inset-0` (top/right/bottom/left all 0, i.e. 100%
              width AND height of the relative parent), which — even
              though the chat content behind it stayed genuinely mounted
              in the DOM, exactly as claimed — was VISUALLY indistinguishable
              from a full content swap: an opaque (`bg-surface-raised`),
              same-size panel completely covers the chat the instant
              `translate-x-0` applies. Confirmed by reading this exact
              class string, not assumed. Now `inset-y-0 right-0 w-2/5`
              (top/bottom 0, right-anchored, 40% width — the Tailwind
              NAMED fraction utility, not a new arbitrary value) — a TRUE
              partial-width side panel: the chat's own left ~60% stays
              visible and interactive beside it. Slides in from the RIGHT
              over the chat area above (never a new tab/window, never a
              full content swap forcing expanded mode — see
              openHistoryList()'s own comment), showing the SAME
              conversation list already built in the Ask-panel-upgrade
              session. Item 6 adds a second "Usage" section in the same
              drawer container, per the task's explicit "reuse its
              container rather than a new UI surface" instruction. */}
          <div
            className={`absolute inset-y-0 right-0 z-10 flex w-2/5 flex-col overflow-hidden border-l border-border bg-surface-raised shadow-2xl transition-transform duration-200 ${
              showHistoryList ? "translate-x-0" : "translate-x-full"
            }`}
            aria-hidden={!showHistoryList}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <button onClick={() => setShowHistoryList(false)} aria-label="Back to chat" className="text-foreground-muted hover:text-foreground">
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setHistoryDrawerTab("history")}
                  className={`text-[13px] font-semibold ${historyDrawerTab === "history" ? "text-accent" : "text-foreground-muted hover:text-foreground"}`}
                >
                  History
                </button>
                <button
                  onClick={() => setHistoryDrawerTab("usage")}
                  className={`text-[13px] font-semibold ${historyDrawerTab === "usage" ? "text-accent" : "text-foreground-muted hover:text-foreground"}`}
                >
                  Usage
                </button>
              </div>
            </div>

            {historyDrawerTab === "history" ? (
              // Ask panel UI redesign session — real chat-history list,
              // content unchanged from before Item 3; only its CONTAINER
              // changed (a sliding drawer instead of a full panel-body
              // swap). Grouped by symbol vs general so a long mixed list
              // still scans quickly; each row clickable via openConversation().
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {historyList === null ? (
                  <p className="px-1 text-xs text-foreground-faint">Loading…</p>
                ) : historyList.length === 0 ? (
                  <p className="px-1 text-xs text-foreground-faint">No past conversations within your plan&apos;s history window yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {historyList.map((c) => (
                      <li key={c.conversation_id}>
                        <button
                          onClick={() => openConversation(c)}
                          className="w-full rounded-lg border border-border bg-hover px-3 py-2 text-left transition-colors hover:border-accent"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-[13px] text-foreground">{c.preview}</span>
                            {c.symbol !== "_general" && (
                              <span className="shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">{c.symbol}</span>
                            )}
                          </div>
                          <div className="mt-1 text-[11px] text-foreground-faint">
                            {new Date(c.updated_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              // UI polish batch, Item 6 — usage tab. Every number here comes
              // from the SAME `usage` state (GET /me/usage, core/metering.py::
              // ask_usage_snapshot) already fetched for the ribbon badge/panel
              // subtitle — no new fetch, no new backend endpoint. Feasibility
              // (checked against the real backend before building this):
              // daily_used/daily_limit and monthly_used/monthly_limit are
              // real per-tier numbers straight from plan_limits.py via that
              // one endpoint; topup_questions_remaining is a genuinely
              // SEPARATE field (users.topup_questions_remaining, never mixed
              // into ask_daily/ask_monthly) — all three ARE independently
              // queryable right now, confirmed by reading core/metering.py
              // directly. The one deliberate deviation from the task's exact
              // "0/50 addon questions used" wording: the backend only ever
              // stores a running REMAINING balance, never a "total ever
              // purchased" figure, so a fixed "/50" denominator would be
              // silently WRONG for any user who has bought a second ₹99/50
              // topup pack (their real total is 100, not 50, but nothing
              // tracks that) — shown as a plain remaining count instead,
              // which stays accurate regardless of purchase history. See
              // docs/00_MASTER_CONTEXT.md's own writeup for the full
              // reasoning.
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {!usage ? (
                  <p className="px-1 text-xs text-foreground-faint">Loading…</p>
                ) : usage.daily_limit_per_symbol !== null ? (
                  <div className="space-y-2 text-[13px] text-foreground">
                    <p>Free tier: {usage.daily_limit_per_symbol} question per stock per day.</p>
                    <p>{usage.topup_questions_remaining} addon question{usage.topup_questions_remaining === 1 ? "" : "s"} remaining.</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-[13px] text-foreground">
                    <p>
                      {usage.daily_used ?? 0}/{usage.daily_limit} daily questions used
                    </p>
                    <p>
                      {usage.monthly_used ?? 0}/{usage.monthly_limit} monthly questions used
                    </p>
                    <p>{usage.topup_questions_remaining} addon question{usage.topup_questions_remaining === 1 ? "" : "s"} remaining</p>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      )}
    </>
  );
}
