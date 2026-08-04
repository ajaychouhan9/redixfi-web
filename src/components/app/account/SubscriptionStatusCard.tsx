"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { cancelBilling, getMe } from "@/lib/api/mutations";
import { formatShortDate } from "@/lib/format";
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

  async function handleCancel() {
    setCancelling(true);
    setMessage(null);
    try {
      const token = await getToken();
      if (!token) return;
      const pendingBefore = !!profile.pending_plan_change;
      await cancelBilling(token);
      setMessage(
        pendingBefore
          ? "The scheduled annual upgrade was cancelled and refunded — your current plan keeps running as-is."
          : "Subscription cancelled — you'll keep access until the end of the current period (pro-rata refund issued)."
      );
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
        <dt className="text-foreground-muted">Renews</dt>
        <dd>{profile.subscription.renews ? formatShortDate(profile.subscription.renews) : "—"}</dd>
      </dl>

      {profile.pending_plan_change && (
        <p className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          Annual starts {formatShortDate(profile.pending_plan_change.effective_date)} — your current plan stays active
          until then, no change today.
        </p>
      )}

      {profile.subscription.status === "active" && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="mt-3 rounded-lg border border-down px-3 py-1.5 text-sm font-medium text-down disabled:opacity-50"
        >
          {cancelling ? "Cancelling…" : profile.pending_plan_change ? "Cancel scheduled upgrade" : "Cancel subscription"}
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
