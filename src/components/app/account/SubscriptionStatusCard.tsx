"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { cancelBilling, getMe } from "@/lib/api/mutations";
import { formatShortDate, formatTrialExpiryLocal } from "@/lib/format";
import type { MeProfile } from "@/lib/api/types";

/**
 * Shared subscription-status display — Task 20 Part A explicitly requires
 * Checkout reuse the exact component Account/Profile already built rather
 * than duplicating it. Both callers pass their own `profile` (each already
 * fetches it for other reasons) and get the same status block + cancel
 * action + pending-upgrade notice back.
 */
export function SubscriptionStatusCard({ profile, onChange }: { profile: MeProfile; onChange: (p: MeProfile) => void }) {
  const { getToken } = useAuth();
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (profile.is_pro_trial && profile.pro_trial_ends_at) {
    return (
      <Card title="Plan">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-foreground-muted">Plan</dt>
          <dd>Pro Trial</dd>
          <dt className="text-foreground-muted">Status</dt>
          <dd>Active trial</dd>
          <dt className="text-foreground-muted">Ends</dt>
          <dd>{formatTrialExpiryLocal(profile.pro_trial_ends_at)}</dd>
        </dl>
        <Link href="/pricing" className="mt-3 inline-block rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground">
          Upgrade
        </Link>
      </Card>
    );
  }

  async function handleCancel() {
    setCancelling(true);
    setMessage(null);
    try {
      const token = await getToken();
      if (!token) return;
      const pendingBefore = !!profile.pending_plan_change;
      const res = await cancelBilling(token);
      // The server states the end date. Cancelling never refunds and the plan does not renew by itself.
      setMessage(res.message ?? (pendingBefore ? "Your paid plans stay as they are. They do not renew automatically." : "Cancelled. Your plan does not renew automatically."));
      onChange(await getMe(token));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not cancel.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Card title="Subscription">
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-foreground-muted">Plan</dt>
        <dd>{profile.subscription.plan ?? "None"}</dd>
        <dt className="text-foreground-muted">Status</dt>
        <dd className="capitalize">{profile.subscription.status}</dd>
        <dt className="text-foreground-muted">Plan ends</dt>
        <dd>{profile.subscription.renews ? formatShortDate(profile.subscription.renews) : "—"}</dd>
      </dl>

      {profile.pending_plan_change && (
        <p className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          Annual starts {formatShortDate(profile.pending_plan_change.effective_date)} — your current plan stays active
          until then, no change today.
        </p>
      )}

      {profile.subscription.status === "active" && profile.subscription.cancel_requested_at && (
        <p className="mt-3 text-sm text-foreground-muted" data-testid="cancel-notice">
          Your plan stays active until {profile.subscription.renews ? formatShortDate(profile.subscription.renews) : "the end of the period"}. It does not renew automatically.
        </p>
      )}
      {profile.subscription.status === "active" && !profile.subscription.cancel_requested_at && (
        <p className="mt-3 text-xs text-foreground-faint">
          Your plan does not renew automatically. Cancelling does not refund; the plan stays active until it ends. See the{" "}
          <Link href="/more/refund-policy" className="underline">refund policy</Link>.
        </p>
      )}
      {profile.subscription.status === "active" && !profile.subscription.cancel_requested_at && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="mt-3 rounded-lg border border-down px-3 py-1.5 text-sm font-medium text-down disabled:opacity-50"
        >
          {cancelling ? "Cancelling…" : "Cancel subscription"}
        </button>
      )}
      {profile.subscription.status !== "active" && (
        <Link href="/pricing" className="mt-3 inline-block text-sm font-medium text-accent">
          View plans
        </Link>
      )}
      {message && <p className="mt-2 text-sm text-foreground-muted">{message}</p>}
    </Card>
  );
}
