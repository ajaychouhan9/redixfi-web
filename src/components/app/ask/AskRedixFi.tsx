"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, X, Send, Search, Globe } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";
import { ApiError } from "@/lib/api/client";
import { searchResearch } from "@/lib/api/endpoints";
import { askRedixfi } from "@/lib/api/mutations";
import { getCurrentSymbol } from "@/lib/current-symbol";
import { CompareResultCard } from "@/components/app/signals/CompareResultCard";
import { ScoreHistoryChart } from "@/components/app/ask/ScoreHistoryChart";
import { SignalTableRow, type VisibleColumns } from "@/components/app/signals/SignalTableRow";
import { filterChips } from "@/components/app/signals/SmartScreenerBox";
import { Chip } from "@/components/ui/Chip";
import type { AskLimitDetail, AskScreenResult, CompareResult, ResearchSearchRow, ScoreHistoryPoint } from "@/lib/api/types";

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
 */
interface AskMessage {
  role: "user" | "ai";
  text: string;
  sources?: string[];
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

export function AskRedixFi() {
  const { user, getToken } = useAuth();
  const { open, setOpen } = useAskPanel();
  const [symbol, setSymbol] = useState<string | null>(null);
  const [results, setResults] = useState<ResearchSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState<AskLimitDetail | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  function reset() {
    setSymbol(null);
    setResults([]);
    setMessages([]);
    setConversationId(null);
    setInput("");
    setLimit(null);
  }

  function close() {
    setOpen(false);
  }

  function pickSymbol(sym: string) {
    setSymbol(sym);
    setResults([]);
    setInput("");
    setMessages([]);
    setConversationId(null);
    setLimit(null);
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
      // Adopt a server-resolved symbol as this panel's context ONLY for a
      // plain single-stock answer — a compare/screen/general answer must
      // not lock the panel into one symbol's header for the next turn.
      if (!symbol && result.mode === "symbol" && result.resolved_symbol) {
        setSymbol(result.resolved_symbol);
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "ai", text: result.answer, sources: result.sources_used, compare: result.compare, screen: result.screen,
          webSourced: result.web_sourced, webSourceLabel: result.web_source_label, webSourceUrl: result.web_source_url,
          scoreHistory: result.score_history, resolvedSymbol: result.resolved_symbol, followUps: result.follow_ups,
        },
      ]);
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
  const quickPrompts = symbol ? QUICK_PROMPTS_SYMBOL : QUICK_PROMPTS_GENERAL;

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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-transform hover:scale-105"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-dim))", color: "var(--accent-foreground)" }}
      >
        <Sparkles size={12} /> RedixFi AI
      </button>

      {open && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] w-full flex-col overflow-hidden border border-border bg-surface-raised shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[460px] sm:rounded-2xl lg:w-[560px]"
          role="dialog"
          aria-label="Ask RedixFi AI"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border bg-accent/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-accent" />
              <div>
                <div className="text-sm font-semibold">{symbol ? `Ask about ${symbol}` : "Ask RedixFi AI"}</div>
                <div className="text-[10px] text-foreground-faint">
                  Grounded in measured data only · {dailyLimitLabel}
                  {!symbol && " · name a stock, a sector, or ask in general"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {symbol && (
                <button onClick={reset} className="text-[11px] text-foreground-faint hover:text-foreground">
                  Change stock
                </button>
              )}
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
          ) : (
            <>
              <div ref={scrollRef} className="space-y-3 overflow-y-auto px-4 py-3" style={{ maxHeight: "58vh", minHeight: messages.length ? 200 : undefined }}>
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

                {messages.length === 0 && (
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
                        {m.text}
                        {/* Task 22 Phase 4 — MUST be visibly labeled, not just a backend
                            flag (task doc's explicit requirement): a distinct badge, never
                            folded into the sources_used chips below (those imply RedixFi's
                            own measured data; this wasn't LLM-generated or RedixFi-sourced
                            at all — a structured fact read from an external source). */}
                        {m.webSourced && (
                          <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-[11px] text-foreground-faint">
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
                        {m.sources && m.sources.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2">
                            {m.sources.map((s) => (
                              <span key={s} className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-accent-dim">
                                {s}
                              </span>
                            ))}
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
                            <thead>
                              <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wide text-foreground-faint">
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
                {busy && <p className="text-xs text-foreground-faint">RedixFi AI is reading the data…</p>}
              </div>

              {limit && (
                <div className="mx-4 mb-2 rounded-lg bg-amber-bg px-3 py-2 text-xs text-amber">
                  {limit.message}{" "}
                  <Link href="/pricing" className="font-semibold underline">
                    {limit.cta === "subscribe" ? "View plans" : "Manage plan"}
                  </Link>
                </div>
              )}

              <div className="flex items-center gap-2 border-t border-border p-3">
                {!symbol && (
                  <Search size={14} className="shrink-0 text-foreground-faint" aria-hidden />
                )}
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(input)}
                  placeholder={symbol ? `Ask a question about ${symbol}…` : "Ask anything — a stock, a sector, or in general…"}
                  disabled={busy}
                  className="flex-1 rounded-lg border border-border bg-hover px-3 py-2 text-sm outline-none disabled:opacity-60"
                />
                <button
                  onClick={() => send(input)}
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
