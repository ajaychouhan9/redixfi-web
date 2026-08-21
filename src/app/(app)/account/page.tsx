"use client";

import { useEffect, useState } from "react";
import { AccountTabs } from "@/components/app/account/AccountTabs";
import { AddPhoneCard } from "@/components/app/account/AddPhoneCard";
import { SubscriptionStatusCard } from "@/components/app/account/SubscriptionStatusCard";
import { RequireAuth } from "@/components/app/account/RequireAuth";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMe, updateAskPreferences } from "@/lib/api/mutations";
import type { MeProfile } from "@/lib/api/types";

// "Always allow" opt-out session (2026-08-21) — the Account-settings
// REVERT half of the locked spec: turns the Ask-RedixFi heavy-question
// confirm dialog back on at any time, on any device (this is a per-
// account preference, not per-browser localStorage — see routers/me.py::
// PATCH /me/ask-preferences's own comment on why). Tier-independent by
// construction: no tier check anywhere in this component or the route it
// hits — Free, Basic, and Pro all see and can use the identical toggle,
// per the locked spec's own "must exist consistently regardless of tier"
// requirement (Free's confirm dialog never fires either way, since their
// charge doesn't depend on weight — but the SETTING itself still exists
// and is toggleable for them, unchanged).
function AskConfirmToggle({ profile, onChange }: { profile: MeProfile; onChange: (p: MeProfile) => void }) {
  const { getToken, updateCachedUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const confirmEnabled = !profile.ask_skip_confirm;

  async function toggle() {
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) return;
      const nextSkip = confirmEnabled; // turning confirmations OFF sets skip=true, and vice versa
      const result = await updateAskPreferences(token, nextSkip);
      onChange({ ...profile, ask_skip_confirm: result.ask_skip_confirm });
      updateCachedUser({ ask_skip_confirm: result.ask_skip_confirm });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Ask RedixFi AI">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Confirm before sending detailed questions</p>
          <p className="text-xs text-foreground-muted">
            A detailed question can use more than 1 of your daily questions. When on, you&apos;ll be asked to
            confirm first — turn this off if you&apos;d rather it send right away.
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          role="switch"
          aria-checked={confirmEnabled}
          className={`h-6 w-11 shrink-0 rounded-full transition-colors ${confirmEnabled ? "bg-accent" : "bg-neutral-bg"}`}
        >
          <span className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition-transform ${confirmEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
    </Card>
  );
}

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
      <AskConfirmToggle profile={profile} onChange={setProfile} />
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
