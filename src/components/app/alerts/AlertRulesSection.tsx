"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card } from "@/components/ui/Card";
import { getAlertRules, updateAlertRule, deleteAlertRule } from "@/lib/api/mutations";
import { AlertCreateButton } from "@/components/app/alerts/AlertCreateButton";
import type { AlertMetric, AlertRule, AlertRulesList } from "@/lib/api/types";

const METRIC_LABELS: Record<AlertMetric, string> = {
  price: "Price",
  score: "Composite score",
  delivery: "Delivery %",
  volume: "Volume ratio (5d)",
};

function formatValue(metric: AlertMetric, value: number | null): string {
  if (value === null) return "—";
  if (metric === "price") return `₹${value.toLocaleString("en-IN")}`;
  if (metric === "delivery") return `${value}%`;
  if (metric === "volume") return `${value}x`;
  return `${value}`;
}

/**
 * Threshold-alerts management (2026-08-08, locked spec) — list/edit/
 * delete, reusing this page's existing Card pattern (the "Alert
 * preferences" card just above this one) rather than a new list/table
 * component. Free tier: renders nothing (same "not shown at all"
 * pattern as AlertCreateButton) — matches the locked spec's "no access
 * to this feature at all", not just an empty list.
 */
export function AlertRulesSection() {
  const { user, getToken } = useAuth();
  const [data, setData] = useState<AlertRulesList | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setData(await getAlertRules(token));
  }, [getToken]);

  useEffect(() => {
    if (user && user.tier !== "free") reload();
  }, [user, reload]);

  if (!user || user.tier === "free") return null;

  async function toggleActive(rule: AlertRule) {
    setBusyId(rule.rule_id);
    try {
      const token = await getToken();
      if (!token) return;
      await updateAlertRule(token, rule.rule_id, { active: !rule.active });
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(rule: AlertRule) {
    setBusyId(rule.rule_id);
    try {
      const token = await getToken();
      if (!token) return;
      await deleteAlertRule(token, rule.rule_id);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card
      title="Threshold alerts"
      action={
        data?.capabilities.max_active_alerts != null ? (
          <span className="text-xs text-foreground-faint">
            {data.active_count} of {data.capabilities.max_active_alerts} used
          </span>
        ) : (
          <span className="text-xs text-foreground-faint">{data?.active_count ?? 0} active</span>
        )
      }
    >
      <p className="mb-3 text-xs text-foreground-muted">
        Get notified when a stock&apos;s price, composite score, delivery %, or volume ratio crosses a threshold you
        set. An alert fires once per crossing, then re-arms once the value crosses back the other way.
      </p>

      <div className="mb-3">
        <AlertCreateButton onCreated={reload} />
      </div>

      {!data ? (
        <p className="text-sm text-foreground-muted">Loading…</p>
      ) : data.rules.length === 0 ? (
        <p className="text-sm text-foreground-muted">No alerts yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.rules.map((rule) => (
            <li key={rule.rule_id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {rule.symbol} · {METRIC_LABELS[rule.metric]} {rule.direction} {formatValue(rule.metric, rule.target_value)}
                </p>
                <p className="text-xs text-foreground-faint">
                  Current: {formatValue(rule.metric, rule.current_value)}
                  {rule.last_fired_at ? ` · last fired ${new Date(rule.last_fired_at).toLocaleDateString("en-IN")}` : " · never fired"}
                  {!rule.active ? " · paused" : rule.armed ? "" : " · waiting to re-arm"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => toggleActive(rule)}
                  disabled={busyId === rule.rule_id}
                  className="rounded-md border border-border px-2 py-1 text-xs text-foreground-muted disabled:opacity-50"
                >
                  {rule.active ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => remove(rule)}
                  disabled={busyId === rule.rule_id}
                  className="rounded-md border border-border px-2 py-1 text-xs text-down disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && data.capabilities.max_active_alerts != null && data.active_count >= data.capabilities.max_active_alerts && (
        <p className="mt-3 text-xs text-foreground-muted">
          You&apos;ve used all {data.capabilities.max_active_alerts} of your plan&apos;s active alerts.{" "}
          <Link href="/pricing" className="font-medium text-accent hover:underline">
            Upgrade to Pro
          </Link>{" "}
          for unlimited alerts and all 4 metrics.
        </p>
      )}
    </Card>
  );
}
