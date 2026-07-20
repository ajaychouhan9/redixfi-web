"use client";

import { useEffect, useState } from "react";
import { AccountTabs } from "@/components/app/account/AccountTabs";
import { RequireAuth } from "@/components/app/account/RequireAuth";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMe, updateAlertPrefs } from "@/lib/api/mutations";
import type { AlertPreferences } from "@/lib/api/types";

const LABELS: Record<keyof AlertPreferences, { title: string; help: string }> = {
  watchlist: { title: "Signal changes on watchlist", help: "Notified when a signal state flips on a stock you're watching." },
  market_wide: { title: "Market-wide events", help: "High-severity, market-scope news events." },
  daily_brief: { title: "AI Daily Brief digest", help: "Morning and post-close market recap." },
};

function AlertsForm() {
  const { getToken } = useAuth();
  const [prefs, setPrefs] = useState<AlertPreferences | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      const me = await getMe(token);
      setPrefs(me.alerts_opt_in);
    })();
  }, [getToken]);

  async function toggle(key: keyof AlertPreferences) {
    if (!prefs) return;
    setSaving(key);
    try {
      const token = await getToken();
      if (!token) return;
      const next = await updateAlertPrefs(token, { [key]: !prefs[key] });
      setPrefs(next);
    } finally {
      setSaving(null);
    }
  }

  if (!prefs) return <p className="text-sm text-foreground-muted">Loading…</p>;

  return (
    <Card title="Alert preferences">
      <ul className="divide-y divide-border">
        {(Object.keys(LABELS) as (keyof AlertPreferences)[]).map((key) => (
          <li key={key} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">{LABELS[key].title}</p>
              <p className="text-xs text-foreground-muted">{LABELS[key].help}</p>
            </div>
            <button
              onClick={() => toggle(key)}
              disabled={saving === key}
              role="switch"
              aria-checked={prefs[key]}
              className={`h-6 w-11 shrink-0 rounded-full transition-colors ${prefs[key] ? "bg-accent" : "bg-neutral-bg"}`}
            >
              <span className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition-transform ${prefs[key] ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function AlertsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Account</h1>
      <AccountTabs />
      <RequireAuth>
        <AlertsForm />
      </RequireAuth>
    </div>
  );
}
