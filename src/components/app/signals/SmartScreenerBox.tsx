"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { AiLabel } from "@/components/ui/AiLabel";
import { Chip } from "@/components/ui/Chip";
import { SignalTableRow, type VisibleColumns } from "./SignalTableRow";
import { CompareResultCard } from "./CompareResultCard";
import { smartScreen } from "@/lib/api/mutations";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  type ComparisonQueueEntry,
  clearComparisonQueue,
  getComparisonQueue,
  onComparisonQueueChange,
  removeFromComparisonQueue,
} from "@/lib/comparison-queue";
import type { SmartScreenResult } from "@/lib/api/types";

const COLUMNS: VisibleColumns = { sector: true, marketCap: false, delivery: true, chips: true, eventRisk: false };

function filterChips(result: SmartScreenResult) {
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
    <Card
      title={
        <span className="flex items-center gap-2">
          🤖 AI Smart Screener <AiLabel />
        </span>
      }
      className="mb-4"
    >
      <p className="mb-2 text-xs text-foreground-muted">
        Describe what to filter by — e.g. &ldquo;energy stocks with rising delivery, above VWAP, no negative news this
        week&rdquo; — or ask to compare stocks, e.g. &ldquo;Compare TCS, INFY and WIPRO&rdquo;. The AI only translates
        your query into filters or a comparison; you author it.
      </p>

      {queue.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-surface p-2">
          <span className="text-xs text-foreground-faint">Comparing:</span>
          {queue.map((e) => (
            <Chip key={e.symbol} tone="accent">
              {e.symbol}
              <button
                type="button"
                onClick={() => removeFromComparisonQueue(e.symbol)}
                className="ml-1 text-foreground-faint hover:text-foreground"
                aria-label={`Remove ${e.symbol} from comparison`}
              >
                ×
              </button>
            </Chip>
          ))}
          <button
            type="button"
            onClick={compareQueued}
            disabled={queue.length < 2 || busy}
            className="ml-auto rounded-lg bg-accent px-3 py-1 text-xs font-medium text-accent-foreground disabled:opacity-50"
          >
            Compare now
          </button>
          <button type="button" onClick={clearComparisonQueue} className="text-xs text-foreground-faint hover:text-foreground">
            Clear
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Describe what to filter by, or ask to compare stocks…"
          className="flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
        />
        <button
          onClick={run}
          disabled={busy || !query.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {busy ? "Reading…" : "Search"}
        </button>
      </div>

      {result?.refused && (
        <p className="mt-3 rounded-lg bg-amber-bg px-3 py-2 text-sm text-amber">{result.message}</p>
      )}

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
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-surface text-left text-xs font-semibold uppercase tracking-wide text-foreground-faint">
                  <tr>
                    <th className="px-3 py-2">Symbol</th>
                    <th className="px-3 py-2">Sector</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Change</th>
                    <th className="px-3 py-2">Delivery</th>
                    <th className="px-3 py-2">Signals</th>
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
    </Card>
  );
}
