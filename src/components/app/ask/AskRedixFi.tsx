"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, X, Send, Search, Globe, Maximize2, Minimize2, RotateCcw, History, ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";
import { ApiError } from "@/lib/api/client";
import { searchResearch } from "@/lib/api/endpoints";
import { askRedixfi, getAskConversations, getAskHistory, getUsage } from "@/lib/api/mutations";
import { getCurrentSymbol } from "@/lib/current-symbol";
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
import { estimateQuestionWeight, questionWeightLabel } from "@/lib/ask-panel/estimateQuestionWeight";

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
  const { user, getToken } = useAuth();
  const { open, setOpen, expanded, setExpanded } = useAskPanel();
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
  const [statusStageIndex, setStatusStageIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyFetchKey = useRef<string | null>(null);

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
  async function openHistoryList() {
    setExpanded(true);
    setShowHistoryList(true);
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
  // "is this a Pro caller."
  const isPro = user?.tier === "pro" || user?.tier === "founding";

  // Weighted-credit follow-up session, Enhancement 2 — the ONLY entry
  // point the composer's Send button and Enter key now go through
  // (replacing direct invocations of send()). Weight-1 questions, and
  // any question from a non-Pro caller, send immediately exactly as
  // before — no added friction. A Pro caller's weight>=2 question is
  // intercepted BEFORE the request goes out: send() itself is not
  // invoked yet, so nothing is charged until the user explicitly
  // confirms.
  function handleSendClick(text: string) {
    if (!text.trim() || busy) return;
    const weight = estimateQuestionWeight(text);
    if (isPro && weight >= 2) {
      setPendingConfirm({ text, weight });
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

  // Multi-tier restructure (2026-08-08) — was a binary
  // `tier === "free" ? "1/symbol/day" : "25/day"`, which silently showed
  // Pro's number to Basic subscribers too. Mirrors core/plan_limits.py's
  // AskLimits table exactly (kept in sync manually, same established
  // cross-file-duplication convention as this codebase's other
  // backend/frontend constant pairs) — "founding"/"paid" resolve the
  // same way core/plan_limits.py::resolve_tier() does server-side
  // (founding -> Pro's number, paid -> Basic's), so this label never
  // disagrees with what enforce_ask_usage actually enforces.
  const DAILY_LIMIT_LABEL: Record<string, string> = {
    free: "1/symbol/day",
    basic: "10/day",
    pro: "25/day",
    founding: "25/day",
    paid: "10/day",
  };
  const dailyLimitLabel = DAILY_LIMIT_LABEL[user?.tier ?? "free"] ?? "1/symbol/day";
  // Weighted-credit system — once GET /me/usage has loaded, replace the
  // static per-tier label with the caller's ACTUAL remaining count (which
  // already reflects weighted consumption — a Basic user who asked 3 heavy
  // tabular questions shows fewer remaining than one who asked 3 simple
  // ones, with zero client-side math beyond a subtraction of two server-
  // reported numbers). Free tier's per-symbol gate isn't an aggregate
  // count (daily_limit_per_symbol set, daily_limit null) so it keeps the
  // static label — nothing to subtract there.
  const remainingLabel =
    usage && usage.daily_limit_per_symbol === null && usage.daily_limit != null
      ? `${Math.max(0, usage.daily_limit - (usage.daily_used ?? 0))}/${usage.daily_limit} left today`
      : dailyLimitLabel;
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
  useEffect(() => {
    if (open && user) {
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
              {showHistoryList && (
                <button onClick={() => setShowHistoryList(false)} aria-label="Back to chat" className="text-foreground-faint hover:text-foreground">
                  <ChevronLeft size={16} />
                </button>
              )}
              <Sparkles size={14} className="text-accent" />
              <div>
                {/* Ask panel UI redesign session — the page-context symbol is
                    never named here, in EITHER panel state (see this file's
                    top docstring). This line is now IDENTICAL regardless of
                    whether a page-context/picked symbol is silently active. */}
                <div className="text-sm font-semibold">{showHistoryList ? "Chat history" : "RedixFi AI"}</div>
                {!showHistoryList && (
                  <div className="text-[11px] text-foreground-faint">
                    Grounded in measured data only · {remainingLabel} · ask about any stock, sector, or in general
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!showHistoryList && (
                <button
                  onClick={openHistoryList}
                  title="Chat history"
                  aria-label="Chat history"
                  className="flex items-center gap-1 text-[12px] text-foreground-faint hover:text-foreground"
                >
                  <History size={13} />
                </button>
              )}
              {!showHistoryList && messages.length > 0 && (
                <button
                  onClick={startNewConversation}
                  title="New conversation"
                  className="flex items-center gap-1 text-[12px] text-foreground-faint hover:text-foreground"
                >
                  <RotateCcw size={11} /> New
                </button>
              )}
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
          ) : showHistoryList ? (
            // Ask panel UI redesign session — real chat-history list,
            // reusing `expanded` (the existing full-overlay mode) as its
            // surface rather than a new modal type. Grouped by symbol vs
            // general so a long mixed list still scans quickly; each row
            // clickable via openConversation().
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
                      {quickPrompts.map((p) => (
                        <button
                          key={p}
                          onClick={() => send(p)}
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
                    <div className={m.role === "user" ? "flex justify-end" : ""}>
                      <div
                        className="max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed"
                        style={
                          m.role === "user"
                            ? { background: "var(--accent)", color: "var(--accent-foreground)" }
                            : { background: "var(--hover)", color: "var(--foreground-muted)", border: "1px solid var(--border)" }
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
                        MOST RECENT answer. */}
                    {m.role === "ai" && i === messages.length - 1 && !busy && m.followUps && m.followUps.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.followUps.map((f) => (
                          <button
                            key={f}
                            onClick={() => send(f)}
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

              {limit && (
                <div className="mx-4 mb-2 rounded-lg bg-amber-bg px-3 py-2 text-xs text-amber">
                  {limit.message}{" "}
                  <Link href="/pricing" className="font-semibold underline">
                    {limit.cta === "subscribe" ? "View plans" : "Manage plan"}
                  </Link>
                </div>
              )}

              {/* Weighted-credit system, requirement 3 — pre-send cost estimate.
                  Client-side heuristic (estimateQuestionWeight), not a backend
                  call — see that module's docstring for why. compliance-ignore
                  Only shown once the question looks like it'll cost more than
                  the 1-question floor, so a plain question shows nothing extra
                  here. Pro-tier only: a Pro caller gets the ACTIVE confirm-
                  before-send step below instead (Enhancement 2) — showing
                  both would be redundant. Non-Pro tiers keep this passive
                  line unchanged, since Enhancement 2 is Pro-only per its own
                  spec. */}
              {!isPro && input.trim() && estimateQuestionWeight(input) > 1 && (
                <div className="mx-3 mb-1.5 rounded-lg bg-accent/10 px-2.5 py-1.5 text-[11px] text-foreground-faint">
                  {questionWeightLabel(estimateQuestionWeight(input))}
                </div>
              )}
              {/* Weighted-credit follow-up session, Enhancement 2 — Pro-tier
                  explicit confirm-before-send for a weight>=2 question.
                  Nothing has been sent yet: handleSendClick set this state
                  INSTEAD of calling send(), so "Cancel" costs nothing and
                  "Send anyway" is the first point this question actually
                  goes out. */}
              {isPro && pendingConfirm && (
                <div className="mx-3 mb-1.5 flex items-center justify-between gap-2 rounded-lg bg-accent/10 px-2.5 py-1.5 text-[11px] text-foreground-faint">
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
                        send(text);
                      }}
                      className="rounded-full bg-accent px-2.5 py-1 font-semibold text-accent-foreground"
                    >
                      Send
                    </button>
                  </span>
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
        </div>
      )}
    </>
  );
}
