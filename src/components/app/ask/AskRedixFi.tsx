"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X, Send, Search, Globe, RotateCcw, History, ChevronLeft, Copy, Check } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";
import { ApiError } from "@/lib/api/client";
import { searchResearch } from "@/lib/api/endpoints";
import { askRedixfi, getAskConversations, getAskHistory, getUsage } from "@/lib/api/mutations";
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
import { downloadXlsx } from "@/lib/xlsx";
import { isProEntitled } from "@/lib/entitlements";
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

/**
 * RedixFi AI chat UI cleanup session (2026-09-11).
 *
 * ONE feature, one name — "RedixFi AI" — with two entry points into the SAME
 * panel: the top-ribbon AskRedixFiTrigger exported below, and the sidebar's
 * "RedixFi AI" nav item. No third entry point is created.
 *
 * RESPONSIVE SURFACE (the focus of this session):
 *   - >=1024px: a persistent right-hand DOCK (400px). The shell
 *     (AiDockShell) reserves the space via `lg:mr-[400px]`, so the main
 *     application content reflows and no dashboard card is ever covered.
 *   - 768–1023px: a dismissible right DRAWER (420px) over a scrim.
 *   - <768px: a BOTTOM SHEET at ~88dvh with a drag handle, drag-down to
 *     close, and an explicit close X. The old bug — a fixed panel partially
 *     covering dashboard cards — cannot recur because the sheet is anchored
 *     to the bottom edge and the drawer/dock never overlap reserved space.
 *
 * RETIRED (weighted-credit cleanup): the pre-send 2x/3x estimate, the
 * "uses up to N of your daily questions" confirm dialog, the per-message
 * "-N" weight tag and the Account toggle that disabled that dialog. The
 * backend now charges exactly ONE question per successfully processed
 * question (LOCKED rule), so there is no user-facing multi-question cost to
 * warn about. The server stays authoritative for quota; the client only
 * mirrors GET /me/usage.
 *
 * Unchanged deliberately: all question/answer CONTENT — backend-generated
 * initial suggestions, backend-generated follow-ups, the staged status
 * copy, source citations, tables, charts, compare/screen rendering,
 * conversation persistence and the history list. This session only changes
 * how they are presented.
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
  // Locked-quota-rules session — True only for a turn that correctly
  // charged 0 (server-computed, routers/ask.py's charged_to=="none" check).
  // Renders the quiet "balance unchanged" footer below; undefined/false on
  // every normally-charged turn.
  quotaUnchanged?: boolean;
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

// Client-side staged status text, played while `busy` is true. This is a UX
// device, NOT real backend progress — POST /ask is one synchronous JSON
// request end to end, so the copy is deliberately generic ("Searching...",
// "Analyzing...") and stops at its last stage rather than implying a stall.
const STATUS_STAGE_INTERVAL_MS = 1300;
const STATUS_STAGES = ["Searching signals...", "Analyzing data...", "Composing answer..."];
// Extra stage shown only when this symbol is known (client-side, no new
// fetch) to have real concall/investor-transcript data — reuses the exact
// suggestion string core/ask.py::compute_initial_suggestions already emits
// for that case (see CONCALL_SUGGESTION_MARKER below), already fetched as
// part of this panel's existing GET /ask/history request.
const STATUS_STAGES_WITH_CONCALL = ["Searching signals...", "Reading concall transcript...", "Analyzing data...", "Composing answer..."];
// Quotes core/ask.py::compute_initial_suggestions' own real emitted
// suggestion string verbatim (for a string-equality match, not
// marketing/UI copy) — rewording it would break the match.
const CONCALL_SUGGESTION_MARKER = "What did management say on the last call?"; // compliance-ignore

// Fixed UI copy (never LLM-generated) shown directly above the input. Uses
// the approved pre-RA phrase already used across the site.
const COMPLIANCE_LINE = "Informational only — not investment advice.";

/** Top-ribbon entry point. Same Sparkles mark as the sidebar nav item. */
export function AskRedixFiTrigger() {
  const { open, setOpen } = useAskPanel();
  return (
    <button
      onClick={() => setOpen(!open)}
      aria-label="RedixFi AI"
      aria-pressed={open}
      className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-semibold transition-transform hover:scale-105 sm:px-3"
      style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-dim))", color: "var(--accent-foreground)" }}
    >
      <Sparkles size={12} /> <span className="hidden sm:inline">RedixFi AI</span>
    </button>
  );
}

/** Compact remaining-first quota row with a thin independent progress bar. */
function QuotaBar({ label, remaining, limit, showTotal = false }: { label: string; remaining: number; limit: number | null; showTotal?: boolean }) {
  const total = limit ?? 0;
  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="font-medium text-foreground-faint">{label}</span>
        <span className="font-mono font-semibold text-foreground" title={`${remaining} of ${total} questions remaining`}>
          {remaining}
          {showTotal && total > 0 && <span className="text-foreground-faint"> of {total}</span>}
          <span className="font-sans font-normal text-foreground-faint"> remaining</span>
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-bg">
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Read-only mirror of GET /me/usage's `ask_redixfi` block. All values come
 * straight from the server (core/metering.py::ask_usage_snapshot) — no
 * client-side quota arithmetic beyond "remaining = limit - used" display.
 *
 * Trial: daily 25 only (never monthly, never add-ons).
 * Basic/Pro: daily + monthly, each its own bar (different denominators).
 * Free: per-stock-per-day gate; add-on only when a balance actually exists.
 */
function AskQuota({ usage, detailed = false }: { usage: AskUsageInfo | null; detailed?: boolean }) {
  if (!usage) return <p className="text-[12px] text-foreground-faint">Loading usage…</p>;

  const topup = usage.topup_questions_remaining;
  const addon = topup > 0 && (
    <p className="text-[12px] text-foreground-faint">
      Add-on: <span className="font-mono text-foreground">{topup}</span> remaining
    </p>
  );

  if (usage.is_pro_trial) {
    const limit = usage.daily_limit ?? 25;
    const remaining = Math.max(0, limit - (usage.daily_used ?? 0));
    return (
      <div className={detailed ? "space-y-3" : "space-y-1.5"}>
        <QuotaBar label="Today" remaining={remaining} limit={limit} showTotal />
      </div>
    );
  }

  if (usage.daily_limit_per_symbol !== null) {
    return (
      <div className={detailed ? "space-y-3" : "space-y-1.5"}>
        <div className="flex items-baseline justify-between gap-2 text-[12px]">
          <span className="font-medium text-foreground-faint">Today</span>
          <span className="text-foreground">
            <span className="font-mono font-semibold">{usage.daily_limit_per_symbol}</span> per stock
          </span>
        </div>
        {addon}
      </div>
    );
  }

  const dailyRemaining = Math.max(0, (usage.daily_limit ?? 0) - (usage.daily_used ?? 0));
  const monthlyRemaining = Math.max(0, (usage.monthly_limit ?? 0) - (usage.monthly_used ?? 0));
  return (
    <div className={detailed ? "space-y-3" : "space-y-2"}>
      <QuotaBar label="Today" remaining={dailyRemaining} limit={usage.daily_limit} />
      <QuotaBar label="This month" remaining={monthlyRemaining} limit={usage.monthly_limit} />
      {addon}
    </div>
  );
}

export function AskRedixFi() {
  const { user, loading: authLoading, getToken } = useAuth();
  const { open, setOpen } = useAskPanel();
  const pathname = usePathname();
  // UI polish batch, Item 4 — LOCKED DECISION. `closedAtPathRef` records
  // which route the panel was on the last time the user explicitly closed
  // it; `hasClosedRef` distinguishes "never closed yet this session" from
  // "closed at least once." The reopen effect compares the CURRENT route
  // against this to decide fresh-vs-resume.
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
  // Live remaining-count mirror from GET /me/usage, refetched on open and
  // after every successful send so it reflects the answer just charged.
  const [usage, setUsage] = useState<AskUsageInfo | null>(null);
  // Context-tailored empty-state suggestions for THIS symbol
  // (core/ask.py::compute_initial_suggestions, via GET /ask/history) —
  // falls back to the generic QUICK_PROMPTS_* set below.
  const [initialSuggestions, setInitialSuggestions] = useState<string[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  // Real chat-history list. `null` = "not fetched yet" (distinct from []
  // = "fetched, genuinely none"), so the list can show a loading state.
  const [historyList, setHistoryList] = useState<AskConversationListItem[] | null>(null);
  const [showHistoryList, setShowHistoryList] = useState(false);
  const [historyDrawerTab, setHistoryDrawerTab] = useState<"history" | "usage">("history");
  const [statusStageIndex, setStatusStageIndex] = useState(0);
  // Copy-to-clipboard feedback for a user's own past question bubble.
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  // Mobile bottom-sheet drag-down-to-close offset (px). 0 = resting.
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyFetchKey = useRef<string | null>(null);
  // BUG 1 fix (2026-08-21) — `startNewConversation()` and the loadHistory
  // effect both fire in the SAME commit when `open` flips true; this ref
  // tells the loadHistory effect to skip exactly ONE stale pass so it never
  // fetches the pre-fresh-start symbol's conversation.
  const skipNextLoadRef = useRef(false);

  // Symbol-search suggestions — only while no symbol context is set yet;
  // the same box doubles as "ask anything" once ≥2 chars are typed.
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

  // Staged status text — resets to stage 0 the instant `busy` goes false.
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
    setShowHistoryList(false);
    setDragY(0);
    // Arms the fresh-vs-resume check for the NEXT open: if the route
    // changes before then, reopening starts fresh instead of resuming.
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

  // Read-only refresh of the live remaining-count figures; never mutates
  // anything. Silently no-ops on failure.
  async function refreshUsage() {
    try {
      const token = await getToken();
      if (!token) return;
      const env = await getUsage(token);
      setUsage(env.ask_redixfi);
    } catch {
      // stays as-is — the quota strip shows a loading state until it lands
    }
  }

  // Phase 3 — load the caller's most recent conversation for the current
  // symbol (or the most-recent-any across symbols server-side when `sym` is
  // null), plus the context-tailored initial suggestions.
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
            quotaUnchanged: m.role === "assistant" ? m.quota_unchanged : undefined,
            table: m.role === "assistant" ? m.table ?? null : undefined,
          }))
        );
      }
    } finally {
      setHistoryLoaded(true);
    }
  }

  // "New Chat" — starts fresh, re-deriving the symbol from PAGE context
  // only, dropping whatever the previous conversation may have drifted to.
  function startNewConversation() {
    setMessages([]);
    setConversationId(null);
    setLimit(null);
    setShowHistoryList(false);
    const pageSymbol = getCurrentSymbol();
    setSymbol(pageSymbol);
    historyFetchKey.current = pageSymbol ?? "_general";
  }

  // Real chat-history list, shown as an in-panel slide-over drawer.
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

  // Reopens a PAST conversation — sets the (silent) symbol context to that
  // conversation's own stored symbol. `historyFetchKey` is pre-set BEFORE
  // `setSymbol` so the symbol-context effect doesn't immediately overwrite
  // the exact conversation just loaded with the newest one.
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
          quotaUnchanged: m.role === "assistant" ? m.quota_unchanged : undefined,
          table: m.role === "assistant" ? m.table ?? null : null,
        }))
      );
      setInitialSuggestions(history.initial_suggestions ?? []);
    } finally {
      setHistoryLoaded(true);
    }
  }

  function copyMessage(index: number, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((cur) => (cur === index ? null : cur)), 1500);
    });
  }

  async function send(text: string) {
    if (!text.trim() || busy || authLoading) return;
    setBusy(true);
    setInput("");
    setResults([]);
    setLimit(null);
    setMessages((prev) => [...prev, { role: "user", text }]);
    try {
      const token = await getToken();
      if (!token) return;
      const result = await askRedixfi(token, { symbol, question: text, conversation_id: conversationId });
      setConversationId(result.conversation_id);
      // A symbol NAMED in the question overrides page/prior context and
      // becomes the current symbol for the rest of this session.
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
          quotaUnchanged: result.quota_unchanged,
        },
      ]);
      // This answer was just charged server-side; pull the fresh remaining
      // count rather than computing it locally.
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

  // Context-tailored suggestions (GET /ask/history) win over the generic
  // per-mode fallback whenever the server had something specific to say.
  const quickPrompts = symbol
    ? initialSuggestions.length > 0
      ? initialSuggestions
      : QUICK_PROMPTS_SYMBOL
    : QUICK_PROMPTS_GENERAL;

  // UI polish batch, Item 4 — the fresh-vs-resume decision (extracted to
  // shouldStartFreshOnReopen so it can be tested directly). Fires BEFORE the
  // preset-symbol/loadHistory effects below (declaration order), so by the
  // time they run a navigation-triggered reset has already cleared the
  // stale state they'd otherwise act on.
  useEffect(() => {
    if (shouldStartFreshOnReopen({ open, hasClosedBefore: hasClosedRef.current, closedAtPath: closedAtPathRef.current, currentPath: pathname })) {
      startNewConversation();
      hasClosedRef.current = false;
      skipNextLoadRef.current = true;
    }
  }, [open, pathname]);

  // Presets the current page's symbol into a fresh conversation whenever the
  // panel opens with none chosen yet.
  useEffect(() => {
    if (open && !symbol) {
      const preset = getCurrentSymbol();
      if (preset) pickSymbol(preset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Loads resumable history once per distinct symbol context whenever the
  // panel is open (skipNextLoadRef skips the one stale pass after a fresh
  // start — see the comment on that ref).
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

  // Mobile bottom-sheet drag-down-to-close. Pointer capture keeps the move
  // events on the handle; `touch-none` on the handle stops page scroll.
  function onDragStart(e: ReactPointerEvent<HTMLDivElement>) {
    dragStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onDragMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    setDragY(Math.max(0, e.clientY - dragStartY.current));
  }
  function onDragEnd() {
    if (dragStartY.current === null) return;
    const shouldClose = dragY > 120;
    dragStartY.current = null;
    setDragY(0);
    if (shouldClose) close();
  }

  // Responsive surface: bottom sheet (<md) → right drawer (md–lg) → dock (lg+).
  const panelClass = [
    "fixed z-50 flex flex-col overflow-hidden border-border bg-surface-raised shadow-2xl transition-transform duration-300 ease-out",
    "inset-x-0 bottom-0 h-[88vh] rounded-t-2xl border-t supports-[height:100dvh]:h-[88dvh]",
    "md:inset-x-auto md:left-auto md:right-0 md:top-[var(--header-height)] md:bottom-0 md:h-auto md:w-[420px] md:rounded-none md:rounded-l-2xl md:border-l md:border-t-0",
    "lg:w-[400px]",
    open ? "translate-y-0 md:translate-x-0" : "pointer-events-none translate-y-full md:translate-y-0 md:translate-x-full",
  ].join(" ");

  return (
    <>
      {/* Scrim for the temporary tablet/mobile surfaces only — desktop docks
          and reflows, so it never needs to dim content. */}
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={close} aria-hidden />}

      <div
        role="dialog"
        aria-label="RedixFi AI"
        aria-hidden={!open}
        inert={!open}
        className={panelClass}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
      >
        {/* Mobile drag handle (<md only). */}
        <div
          className="flex touch-none justify-center pb-1 pt-2 md:hidden"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <span className="h-1.5 w-10 rounded-full bg-border" aria-hidden />
        </div>

        {/* Header — RedixFi AI + compact New Chat / History / close. */}
        <div className="flex items-center justify-between gap-2 border-b border-border bg-accent/10 px-3 py-2.5 md:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles size={15} className="shrink-0 text-accent" />
            <span className="truncate text-sm font-semibold">RedixFi AI</span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={startNewConversation}
              title="New Chat"
              aria-label="New Chat"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-medium text-foreground-muted transition-colors hover:bg-hover hover:text-foreground"
            >
              <RotateCcw size={15} /> <span className="hidden sm:inline">New Chat</span>
            </button>
            <button
              onClick={openHistoryList}
              title="History"
              aria-label="History"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-medium text-foreground-muted transition-colors hover:bg-hover hover:text-foreground"
            >
              <History size={15} /> <span className="hidden sm:inline">History</span>
            </button>
            <button
              onClick={close}
              aria-label="Close RedixFi AI"
              className="rounded-md p-1 text-foreground-faint transition-colors hover:bg-hover hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Compact, scannable quota strip (never a dense text line). */}
        {user && (
          <div className="border-b border-border px-3 py-2 md:px-4">
            <AskQuota usage={usage} />
          </div>
        )}

        {/* Body is the positioning context for the history slide-over so it
            covers the chat only, leaving the header/quota strip visible. */}
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
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3 md:px-4">
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
                    <p className="mb-2 text-[12px] text-foreground-faint">Try asking:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {/* Quick-prompt suggestions. Content is unchanged
                          (server-tailored via GET /ask/history, else the
                          generic per-mode fallback below) — presentation is
                          a compact wrapping chip so it reads as a distinct
                          "suggestions" affordance, never a sent message. */}
                      {quickPrompts.map((p) => (
                        <button
                          key={p}
                          onClick={() => send(p)}
                          disabled={authLoading}
                          className="rounded-full border border-border bg-hover px-3 py-1.5 text-left text-[12.5px] text-foreground-muted transition-colors hover:border-accent hover:text-foreground disabled:opacity-50"
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
                        className="max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed break-words"
                        style={
                          m.role === "user"
                            ? { background: "var(--accent)", color: "var(--accent-foreground)", fontSize: "13px" }
                            : { background: "var(--hover)", color: "var(--foreground)", border: "1px solid var(--border)" }
                        }
                      >
                        {m.role === "ai" ? <MarkdownAnswer text={m.text} /> : m.text}
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
                        {m.role === "ai" && m.sourceCitations && <SourcesSection citations={m.sourceCitations} />}
                        {m.createdAt && (
                          <div className="mt-1.5 text-[11px] text-foreground-faint opacity-70">
                            {new Date(m.createdAt).toLocaleString(undefined, {
                              month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                            })}
                          </div>
                        )}
                        {/* Quiet reassurance footer for EVERY correctly-zero-
                            charge answer. `quotaUnchanged` is server-computed
                            (charged_to=="none"), never re-derived here. */}
                        {m.role === "ai" && m.quotaUnchanged && (
                          <div className="mt-1 text-[11px] text-foreground-faint opacity-70">
                            Your question balance is unchanged for this response.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Task 22 Phase 3 — comparative/tabular answers render as
                        a full-width block below the prose bubble, reusing the
                        EXACT Signals-page components. */}
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

                    {/* Shared table renderer for tabular + document-extraction
                        answers. Renders EXCLUSIVELY off `m.table.columns`. */}
                    {m.table && m.table.rows.length > 0 && (
                      <div className="mt-2">
                        <div className="mb-1.5 flex justify-end">
                          <ExportButton
                            canExport={isProEntitled(user)}
                            onExport={() => {
                              const rows = m.table!.rows.map((row) => {
                                const out: Record<string, unknown> = {};
                                for (const col of m.table!.columns) out[col.label] = row[col.key];
                                return out;
                              });
                              downloadCsv("redixfi-ask-table.csv", rows);
                            }}
                            onCsv={() => {
                              const rows = m.table!.rows.map((row) => {
                                const out: Record<string, unknown> = {};
                                for (const col of m.table!.columns) out[col.label] = row[col.key];
                                return out;
                              });
                              downloadCsv("redixfi-ask-table.csv", rows);
                            }}
                            onXlsx={() => {
                              const rows = m.table!.rows.map((row) => {
                                const out: Record<string, unknown> = {};
                                for (const col of m.table!.columns) out[col.label] = row[col.key];
                                return out;
                              });
                              downloadXlsx("redixfi-ask-table.xlsx", [{ name: "AI Result", rows }]);
                            }}
                            label="Download"
                          />
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full min-w-[560px] text-sm">
                            <thead>
                              <tr className="border-b border-border text-left font-mono text-[13px] uppercase tracking-wide text-foreground-faint">
                                {m.table.columns.map((col) => (
                                  <th key={col.key} className="px-3 py-2">
                                    {col.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {m.table.rows.map((row, i) => (
                                <tr key={i} className="border-b border-border last:border-0">
                                  {m.table!.columns.map((col) => (
                                    <td key={col.key} className="px-3 py-2">
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

                    {/* Inline trend/comparison chart. */}
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

                    {/* Follow-up suggestion chips — content is backend-
                        generated (result.follow_ups, persisted per turn) and
                        unchanged; only shown under the most recent answer. */}
                    {m.role === "ai" && i === messages.length - 1 && !busy && m.followUps && m.followUps.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.followUps.map((f) => (
                          <button
                            key={f}
                            onClick={() => send(f)}
                            disabled={authLoading}
                            className="rounded-full border border-border bg-hover px-2.5 py-1 text-left text-[11.5px] text-foreground-muted transition-colors hover:border-accent hover:text-foreground disabled:opacity-50"
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
                <div className="mx-3 mb-2 rounded-lg bg-amber-bg px-3 py-2 text-xs text-amber">
                  {limit.message}{" "}
                  <Link href="/pricing" className="font-semibold underline">
                    {limit.cta === "subscribe" ? "View plans" : limit.cta === "upgrade" ? "Upgrade" : isProEntitled(user) ? "Add more questions" : "Manage plan"}
                  </Link>
                </div>
              )}

              {/* Compliance line lives immediately above the input, always
                  visible; the input row below stays uncrowded. */}
              <div className="border-t border-border">
                <p className="px-3 pt-2 text-center text-[11px] text-foreground-faint">{COMPLIANCE_LINE}</p>
                <div className="flex items-center gap-2 p-3">
                  {!symbol && (
                    <Search size={14} className="shrink-0 text-foreground-faint" aria-hidden />
                  )}
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send(input)}
                    placeholder={authLoading ? "Loading your account…" : "Ask anything — a stock, a sector, or in general…"}
                    disabled={busy || authLoading}
                    className="flex-1 rounded-lg border border-border bg-hover px-3 py-2 text-sm outline-none disabled:opacity-60"
                  />
                  <button
                    onClick={() => send(input)}
                    disabled={busy || !input.trim() || authLoading}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground disabled:opacity-50"
                    aria-label="Send"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* In-panel slide-over: History / Usage. Full width of the panel so
              mobile history never becomes a second overlay over the
              dashboard. "Back" returns to the current conversation. */}
          <div
            className={`absolute inset-0 z-20 flex flex-col overflow-hidden border-border bg-surface-raised transition-transform duration-200 ${
              showHistoryList ? "translate-x-0" : "translate-x-full"
            }`}
            aria-hidden={!showHistoryList}
            inert={!showHistoryList}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 md:px-4">
              <button
                onClick={() => setShowHistoryList(false)}
                aria-label="Back to chat"
                className="flex items-center gap-0.5 text-[13px] font-medium text-foreground-muted transition-colors hover:text-foreground"
              >
                <ChevronLeft size={16} /> Back
              </button>
              <div className="ml-1 flex items-center gap-3">
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
              <div className="flex-1 overflow-y-auto px-3 py-3 md:px-4">
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
              // Usage tab — same server values (GET /me/usage) as the strip
              // above, just roomier.
              <div className="flex-1 overflow-y-auto px-3 py-3 md:px-4">
                <AskQuota usage={usage} detailed />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
