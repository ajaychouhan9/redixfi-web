"use client";

import { useEffect, useState } from "react";
import { Sparkles, GitCompare, X, Plus } from "lucide-react";
import { AiLabel } from "@/components/ui/AiLabel";
import { Chip } from "@/components/ui/Chip";
import { SignalTableRow, type VisibleColumns } from "./SignalTableRow";
import { CompareResultCard } from "./CompareResultCard";
import { smartScreen } from "@/lib/api/mutations";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  COMPARISON_QUEUE_MAX,
  type ComparisonQueueEntry,
  clearComparisonQueue,
  getComparisonQueue,
  onComparisonQueueChange,
  removeFromComparisonQueue,
} from "@/lib/comparison-queue";
import type { SmartScreenResult } from "@/lib/api/types";

const COLUMNS: VisibleColumns = { sector: true, marketCap: false, delivery: true, chips: true, eventRisk: false };

// Exported so Ask-RedixFi (Task 22 Phase 3) can render the same filter-chip
// summary for a screen-shaped Ask answer without re-deriving this mapping —
// takes just the `parsed_filters` shape (both SmartScreenResult and Ask's
// own AskScreenResult carry it) rather than the full SmartScreenResult.
export function filterChips(result: { parsed_filters: SmartScreenResult["parsed_filters"] }) {
  const f = result.parsed_filters;
  if (!f) return [];
  const chips: string[] = [];
  if (f.sector) chips.push(`Sector: ${f.sector}`);
  if (f.score_min !== null) chips.push(`Score ≥ ${f.score_min}`);
  if (f.score_max !== null) chips.push(`Score ≤ ${f.score_max}`);
  if (f.delta_1d_min !== null) chips.push(`Score change ≥ ${f.delta_1d_min}`);
  if (f.delivery_state) chips.push(`Delivery: ${f.delivery_state.replace(/_/g, " ")}`);
  if (f.vwap_side) chips.push(`VWAP side: ${f.vwap_side}`);
  if (f.volume_ratio_min !== null) chips.push(`Volume ratio ≥ ${f.volume_ratio_min}`);
  if (f.dma_state) chips.push(`DMA: ${f.dma_state.replace(/_/g, " ")}`);
  if (f.pcr_band) chips.push(`PCR: ${f.pcr_band.replace(/_/g, " ")}`);
  if (f.event_risk !== null) chips.push(f.event_risk ? "Has event risk" : "No event risk");
  if (f.watchlist_only) chips.push("Watchlist only");
  return chips;
}

/**
 * Combines the mockup's two separate cards (a "Compare stocks" chip tray
 * and an "AI Smart Screener" NL box) into the one real component Task 13
 * already shipped: the queue tray feeds the SAME natural-language box,
 * which always resolves compare/screen intent server-side — kept as-is
 * (see comparison-queue.ts's module docstring) rather than split back into
 * two disconnected UIs, just restyled to match the locked design system.
 */
export function SmartScreenerBox() {
  const { getToken } = useAuth();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SmartScreenResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<ComparisonQueueEntry[]>([]);

  useEffect(() => {
    const sync = () => setQueue(getComparisonQueue());
    sync();
    return onComparisonQueueChange(sync);
  }, []);

  async function runQuery(q: string) {
    if (!q.trim()) return;
    setBusy(true);
    try {
      const token = await getToken();
      const r = await smartScreen(token, q.trim());
      setResult(r);
    } finally {
      setBusy(false);
    }
  }

  function run() {
    return runQuery(query);
  }

  function compareQueued() {
    const q = `Compare ${queue.map((e) => e.symbol).join(", ")}`;
    setQuery(q);
    clearComparisonQueue();
    void runQuery(q);
  }

  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-border bg-surface-raised">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
            <GitCompare size={14} className="text-accent" />
          </span>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              AI Smart Screener <AiLabel />
            </h3>
            <p className="text-[11px] text-foreground-faint">Add up to {COMPARISON_QUEUE_MAX} · tap &ldquo;+ Compare&rdquo; on any row, or describe what to filter by below</p>
          </div>
        </div>
        {queue.length > 0 && <span className="shrink-0 rounded-full bg-accent/10 px-2 py-1 font-mono text-[10px] text-accent">{queue.length}/{COMPARISON_QUEUE_MAX}</span>}
      </div>

      <div className="p-5">
        <p className="mb-3 text-xs text-foreground-muted">
          Describe what to filter by — e.g. &ldquo;energy stocks with rising delivery, above VWAP, no negative news this
          week&rdquo; — or ask to compare stocks, e.g. &ldquo;Compare TCS, INFY and WIPRO&rdquo;. The AI only translates
          your query into filters or a comparison; you author it.
        </p>

        {queue.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {queue.map((e) => (
              <span key={e.symbol} className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 font-mono text-xs font-medium text-accent" style={{ border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}>
                {e.symbol}
                <button type="button" onClick={() => removeFromComparisonQueue(e.symbol)} aria-label={`Remove ${e.symbol} from comparison`}>
                  <X size={12} className="opacity-70 hover:opacity-100" />
                </button>
              </span>
            ))}
            {Array.from({ length: Math.max(0, 2 - queue.length) }).map((_, i) => (
              <span key={`ph-${i}`} className="flex items-center gap-1 rounded-full border border-dashed border-foreground-faint px-3 py-1.5 text-xs text-foreground-faint">
                <Plus size={12} /> Add stock
              </span>
            ))}
            <button
              type="button"
              onClick={compareQueued}
              disabled={queue.length < 2 || busy}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <GitCompare size={14} /> Compare now
            </button>
            <button type="button" onClick={clearComparisonQueue} className="text-xs text-foreground-faint hover:text-foreground">
              Clear all
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-lg border border-border bg-hover px-3 py-2">
          <Sparkles size={13} className="shrink-0 text-accent" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder='Or type naturally: "Compare TCS, INFY and WIPRO"'
            className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-60"
          />
          <button
            onClick={run}
            disabled={busy || !query.trim()}
            className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-50"
          >
            {busy ? "Reading…" : "Search"}
          </button>
        </div>

        {result?.refused && <p className="mt-3 rounded-lg bg-amber-bg px-3 py-2 text-sm text-amber">{result.message}</p>}

        {/* Compare intent: the table renders even when refused=true — "refuse
            the verdict, serve the facts" (task doc). Screen intent below keeps
            the original behavior of hiding results on refusal. */}
        {result?.intent === "compare" && result.compare && <CompareResultCard compare={result.compare} />}
        {result?.intent === "compare" && !result.compare && !result.refused && (
          <p className="mt-3 text-sm text-foreground-muted">{result.message}</p>
        )}

        {result && result.intent === "screen" && !result.refused && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-foreground-muted">Here&apos;s how I read your query:</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {filterChips(result).map((c) => (
                <Chip key={c} tone="accent">
                  {c}
                </Chip>
              ))}
              {filterChips(result).length === 0 && <span className="text-xs text-foreground-faint">No filters recognized.</span>}
            </div>
            {result.results.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[600px] text-sm">
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
                    {result.results.map((row) => (
                      <SignalTableRow key={row.symbol} row={row} columns={COLUMNS} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-foreground-muted">No stocks matched ({result.result_count}).</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
