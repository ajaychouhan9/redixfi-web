"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/lib/auth/AuthContext";
import { getMe, updateAlertPrefs } from "@/lib/api/mutations";

/**
 * Opt-in for the Saturday weekly review email. Unticked by default; nothing is sent unless the signed-in user ticks it. The same switch
 * is in Account > Alerts. A visitor who is not signed in is asked to log in first.
 */
export function WeeklyEmailOptIn({ className = "" }: { className?: string }) {
  const { user, getToken } = useAuth();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const me = await getMe(token);
        if (alive) setOn(!!me.alerts_opt_in?.weekly_review);
      } catch {
        if (alive) setOn(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, getToken]);

  async function change(next: boolean) {
    setBusy(true);
    setErr(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await updateAlertPrefs(token, { weekly_review: next });
      // An API that does not know this setting yet answers without it: say so instead of showing a box that silently un-ticks.
      if (res.weekly_review === undefined) {
        setErr("This weekly email is not switched on yet. Please try again later.");
        return;
      }
      setOn(!!res.weekly_review);
    } catch {
      setErr("Could not save the setting. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-lg border border-border bg-surface px-3 py-2.5 text-sm ${className}`} data-testid="weekly-email-optin">
      {user ? (
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={!!on} disabled={busy || on === null} onChange={(e) => change(e.target.checked)} />
          <span>
            Email me this weekly review on Saturday mornings
            <span className="block text-xs text-foreground-muted">From alerts@redixfi.com, with an unsubscribe link in every email. Off unless you tick it.</span>
          </span>
        </label>
      ) : (
        <p>
          <Link href="/login?next=/signals/7-day-review" className="font-medium text-accent hover:underline">
            Log in
          </Link>{" "}
          to get this weekly review by email on Saturday mornings (off unless you turn it on).
        </p>
      )}
      {err && <p className="mt-1 text-xs text-down">{err}</p>}
    </div>
  );
}
