"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getAlertRules, createAlertRule } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/client";
import type { AlertCapabilities, AlertDirection, AlertMetric } from "@/lib/api/types";

const METRIC_LABELS: Record<AlertMetric, string> = {
  price: "Price",
  score: "Composite score",
  delivery: "Delivery %",
  volume: "Volume ratio (5d)",
};
const ALL_METRICS: AlertMetric[] = ["price", "score", "delivery", "volume"];

/**
 * Threshold-alert creation entry point (2026-08-08, locked spec) — reuses
 * the existing "Alert me on changes" copy slot's INTENT (screenshots
 * referenced a button with this label) but that button, on audit, turned
 * out to be WatchlistButton.tsx — a watchlist-membership toggle, not an
 * alert-creation flow. Fixed WatchlistButton's copy to stop implying it
 * creates alerts (see that component's own note) and built this as the
 * real, separate, functioning entry point instead of stretching the
 * watchlist toggle to mean two different things.
 *
 * If `symbol` is provided (Signal/Research detail pages), it's fixed and
 * hidden from the form. If omitted (the account alerts management page),
 * a symbol field is shown so a rule can be created for any stock from
 * one place. Free tier / logged-out: renders nothing, same "not shown at
 * all" pattern already established for other Pro-only actions
 * (ResearchExportButton) — server-side enforcement (POST /alert-rules)
 * is the real gate either way, this is presentation only.
 */
export function AlertCreateButton({ symbol, onCreated }: { symbol?: string; onCreated?: () => void }) {
  const { user, getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [caps, setCaps] = useState<AlertCapabilities | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [symbolInput, setSymbolInput] = useState(symbol ?? "");
  const [metric, setMetric] = useState<AlertMetric>("price");
  const [direction, setDirection] = useState<AlertDirection>("above");
  const [targetValue, setTargetValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!user || user.tier === "free") return null;

  async function openForm() {
    setOpen(true);
    setSuccess(false);
    setError(null);
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const list = await getAlertRules(token);
      setCaps(list.capabilities);
      setActiveCount(list.active_count);
      if (list.capabilities.alertable_metrics.length > 0) setMetric(list.capabilities.alertable_metrics[0]);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    const sym = symbolInput.trim().toUpperCase();
    const value = Number(targetValue);
    if (!sym || !Number.isFinite(value)) {
      setError("Enter a symbol and a numeric threshold.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      await createAlertRule(token, { symbol: sym, metric, direction, target_value: value });
      setSuccess(true);
      setTargetValue("");
      onCreated?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create the alert.");
    } finally {
      setBusy(false);
    }
  }

  const atCap = caps?.max_active_alerts != null && activeCount >= caps.max_active_alerts;

  if (!open) {
    return (
      <button
        onClick={openForm}
        className="rounded-lg border border-accent px-3 py-1.5 text-sm font-medium text-accent"
      >
        🔔 Set alert
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3 text-sm">
      {loading ? (
        <p className="text-foreground-muted">Loading…</p>
      ) : atCap ? (
        <div>
          <p className="mb-1 text-xs font-medium text-foreground-muted">
            {activeCount} of {caps!.max_active_alerts} active alerts used
          </p>
          <div className="mb-2 h-1.5 w-full rounded-full bg-neutral-bg">
            <div className="h-1.5 rounded-full bg-accent" style={{ width: "100%" }} />
          </div>
          <p className="text-xs text-foreground-muted">
            Delete an existing alert, or{" "}
            <Link href="/pricing" className="font-medium text-accent hover:underline">
              upgrade to Pro
            </Link>{" "}
            for unlimited alerts.
          </p>
        </div>
      ) : success ? (
        <p className="text-up">Alert created ✓</p>
      ) : (
        <div className="flex flex-col gap-2">
          {caps && caps.max_active_alerts != null && (
            <p className="text-xs text-foreground-faint">
              {activeCount} of {caps.max_active_alerts} active alerts used
            </p>
          )}
          {!symbol && (
            <input
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value)}
              placeholder="Symbol (e.g. RELIANCE)"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
            />
          )}
          <div className="flex gap-2">
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as AlertMetric)}
              className="flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-sm"
            >
              {ALL_METRICS.map((m) => (
                <option key={m} value={m} disabled={!!caps && !caps.alertable_metrics.includes(m)}>
                  {METRIC_LABELS[m]}
                  {caps && !caps.alertable_metrics.includes(m) ? " (Pro only)" : ""}
                </option>
              ))}
            </select>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as AlertDirection)}
              className="rounded-lg border border-border bg-surface px-2 py-2 text-sm"
            >
              <option value="above">crosses above</option>
              <option value="below">crosses below</option>
            </select>
          </div>
          <input
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder="Threshold value"
            type="number"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
          <p className="text-xs text-foreground-faint">
            Delivered in-app{caps?.delivery_channels.includes("email") ? " + email" : ""}
            {caps?.delivery_channels.includes("push") ? " + push" : ""} once the threshold is crossed. Fires again
            only after the value crosses back the other way.
          </p>
          {error && <p className="text-xs text-down">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create alert"}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground-muted">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
