"use client";

import { useEffect, useState } from "react";
import { AccountTabs } from "@/components/app/account/AccountTabs";
import { AddPhoneCard } from "@/components/app/account/AddPhoneCard";
import { RequireAuth } from "@/components/app/account/RequireAuth";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMe, cancelBilling } from "@/lib/api/mutations";
import type { MeProfile } from "@/lib/api/types";

function AccountProfile() {
  const { getToken, logout } = useAuth();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      setProfile(await getMe(token));
    })();
  }, [getToken]);

  async function handleCancel() {
    setCancelling(true);
    setMessage(null);
    try {
      const token = await getToken();
      if (!token) return;
      await cancelBilling(token);
      setMessage("Subscription cancelled — you'll keep access until the end of the current period (pro-rata).");
      setProfile(await getMe(token));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not cancel.");
    } finally {
      setCancelling(false);
    }
  }

  if (!profile) return <p className="text-sm text-foreground-muted">Loading…</p>;

  return (
    <div className="space-y-4">
      <AddPhoneCard profile={profile} onSaved={setProfile} />
      <Card title="Profile">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-foreground-muted">Phone</dt>
          <dd>{profile.phone ?? "—"}</dd>
          <dt className="text-foreground-muted">Name</dt>
          <dd>{profile.name ?? "—"}</dd>
          <dt className="text-foreground-muted">Email</dt>
          <dd>{profile.email ?? "—"}</dd>
          <dt className="text-foreground-muted">Tier</dt>
          <dd className="capitalize">{profile.tier}</dd>
        </dl>
      </Card>
      <Card title="Subscription">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-foreground-muted">Plan</dt>
          <dd>{profile.subscription.plan ?? "None"}</dd>
          <dt className="text-foreground-muted">Status</dt>
          <dd className="capitalize">{profile.subscription.status}</dd>
          <dt className="text-foreground-muted">Renews</dt>
          <dd>{profile.subscription.renews ?? "—"}</dd>
        </dl>
        {profile.subscription.status === "active" && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="mt-3 rounded-lg border border-down px-3 py-1.5 text-sm font-medium text-down disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "Cancel subscription"}
          </button>
        )}
        {profile.subscription.status !== "active" && (
          <a href="/pricing" className="mt-3 inline-block text-sm font-medium text-accent">
            View plans
          </a>
        )}
        {message && <p className="mt-2 text-sm text-foreground-muted">{message}</p>}
      </Card>
      <button onClick={logout} className="text-sm font-medium text-down">
        Log out
      </button>
    </div>
  );
}

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Account</h1>
      <AccountTabs />
      <RequireAuth>
        <AccountProfile />
      </RequireAuth>
    </div>
  );
}
