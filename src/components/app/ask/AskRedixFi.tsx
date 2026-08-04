"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, X, Send, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiGet, ApiError } from "@/lib/api/client";
import { askRedixfi } from "@/lib/api/mutations";
import type { AskLimitDetail, ResearchSearchRow } from "@/lib/api/types";

/**
 * Persistent "RedixFi AI" entry point, per the locked design system: lives
 * ONLY in the top ribbon on every page (the mockup phase tried a floating
 * bubble too and deliberately removed it once this button existed — two
 * entry points on the same page were redundant).
 *
 * POST /ask (Task 17 backend) is per-symbol and auth-required — there's no
 * general free-form chat. On pages that already have an obvious subject
 * (a stock detail page) a future session can preset one; Home and the
 * Signals list (this session's scope) have no single current stock, so the
 * panel opens on a lightweight symbol search step first.
 */
interface AskMessage {
  role: "user" | "ai";
  text: string;
  sources?: string[];
}

const QUICK_PROMPTS = [
  "What's driving today's score change?",
  "How does this compare to its sector peers?",
  "What does the composite score measure?",
];

export function AskRedixFi() {
  const { user, getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResearchSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState<AskLimitDetail | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const id = setTimeout(() => {
      apiGet<ResearchSearchRow[]>("/research/search", { params: { q: query.trim(), limit: 8 } })
        .then((env) => !cancelled && setResults(env.data))
        .finally(() => !cancelled && setSearching(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function reset() {
    setSymbol(null);
    setQuery("");
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
    setMessages([]);
    setConversationId(null);
    setLimit(null);
  }

  async function send(text: string) {
    if (!text.trim() || !symbol || busy) return;
    setBusy(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    try {
      const token = await getToken();
      if (!token) return;
      const result = await askRedixfi(token, { symbol, question: text, conversation_id: conversationId });
      setConversationId(result.conversation_id);
      setMessages((prev) => [...prev, { role: "ai", text: result.answer, sources: result.sources_used }]);
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

  const dailyLimitLabel = user?.tier === "free" ? "1/symbol/day" : "25/day";

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
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] w-full flex-col overflow-hidden border border-border bg-surface-raised shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:rounded-2xl"
          role="dialog"
          aria-label="Ask RedixFi AI"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border bg-accent/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-accent" />
              <div>
                <div className="text-sm font-semibold">{symbol ? `Ask about ${symbol}` : "Ask RedixFi AI"}</div>
                {symbol && <div className="text-[10px] text-foreground-faint">Grounded in measured data only · {dailyLimitLabel}</div>}
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
          ) : !symbol ? (
            <div className="p-4">
              <label className="mb-2 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <Search size={14} className="text-foreground-faint" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a company or symbol to ask about…"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </label>
              {searching && <p className="px-1 text-xs text-foreground-faint">Searching…</p>}
              {!searching && results.length > 0 && (
                <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
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
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <p className="px-1 text-xs text-foreground-faint">No companies matched &ldquo;{query}&rdquo;.</p>
              )}
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="space-y-3 overflow-y-auto px-4 py-3" style={{ maxHeight: "45vh", minHeight: messages.length ? 200 : undefined }}>
                {messages.length === 0 && (
                  <div>
                    <p className="mb-2 text-xs text-foreground-faint">Try asking:</p>
                    <div className="space-y-1.5">
                      {QUICK_PROMPTS.map((p) => (
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
                  <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                    <div
                      className="max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed"
                      style={
                        m.role === "user"
                          ? { background: "var(--accent)", color: "var(--accent-foreground)" }
                          : { background: "var(--hover)", color: "var(--foreground-muted)", border: "1px solid var(--border)" }
                      }
                    >
                      {m.text}
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
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(input)}
                  placeholder={`Ask a question about ${symbol}…`}
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
