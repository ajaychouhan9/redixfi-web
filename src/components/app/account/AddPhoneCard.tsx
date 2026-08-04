"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { updateProfile } from "@/lib/api/mutations";
import type { MeProfile } from "@/lib/api/types";

/**
 * TASK 19 — phone is now an OPTIONAL post-signup add-on, decoupled from
 * login entirely (Google Sign-In / email+password accounts have none by
 * default). Framed around the real benefit named in the task doc, not
 * presented as anything login-related — this card only ever shows for an
 * account that doesn't have a phone yet; once added, it simply stops
 * rendering (nothing left to prompt for). Uses core/routers/me.py's PATCH
 * /me phone field directly — no Firebase/OTP round-trip for this field
 * (see that route's own comment), so no SMS is ever sent from this prompt.
 * Lives in Account/Profile per the task doc's acceptance criterion
 * ("Phone field available as an optional add-on in Account/Profile").
 */
export function AddPhoneCard({ profile, onSaved }: { profile: MeProfile; onSaved: (p: MeProfile) => void }) {
  const { getToken } = useAuth();
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (profile.phone) return null;

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) return;
      const next = await updateProfile(token, { phone });
      onSaved(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that number.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Add your phone" className="mb-4">
      <p className="mb-3 text-xs text-foreground-muted">Add your phone to enable WhatsApp alerts.</p>
      <div className="flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91XXXXXXXXXX"
          className="flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
        />
        <button
          onClick={save}
          disabled={saving || !phone}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-down">{error}</p>}
    </Card>
  );
}
