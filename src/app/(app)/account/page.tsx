"use client";

import { useEffect, useState } from "react";
import { AccountTabs } from "@/components/app/account/AccountTabs";
import { AddPhoneCard } from "@/components/app/account/AddPhoneCard";
import { SubscriptionStatusCard } from "@/components/app/account/SubscriptionStatusCard";
import { RequireAuth } from "@/components/app/account/RequireAuth";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMe } from "@/lib/api/mutations";
import type { MeProfile } from "@/lib/api/types";

function AccountProfile() {
  const { getToken, logout } = useAuth();
  const [profile, setProfile] = useState<MeProfile | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      setProfile(await getMe(token));
    })();
  }, [getToken]);

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
      <SubscriptionStatusCard profile={profile} onChange={setProfile} />
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
