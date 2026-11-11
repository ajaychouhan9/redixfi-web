"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/lib/auth/AuthContext";
import { getMe, updateProfile } from "@/lib/api/mutations";
import { useTrialDays } from "@/lib/trial";
import { track } from "@/lib/analytics";

/**
 * The consent step (11 Nov 2026). A signed-in account that has not accepted the current Terms and Privacy Policy sees this before anything else:
 * a new account after its first Google or phone sign-in, and each of the existing accounts once on its next login. The box is unticked; the
 * trial starts (and payment becomes possible) only after it is accepted. The server decides who is asked: `terms_accepted` false.
 * `undefined` (an older API that does not send it) shows nothing.
 */
export function ConsentGate() {
  const { user, getToken, logout, updateCachedUser } = useAuth();
  const days = useTrialDays();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user || user.terms_accepted !== false) return null;

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("signed out");
      const first = !user!.tnc_accepted_at;
      await updateProfile(token, { accept_tnc: true });
      const profile = await getMe(token);
      updateCachedUser({
        terms_accepted: true,
        tnc_accepted_at: profile.tnc_accepted_at ?? new Date().toISOString(),
        tier: profile.tier,
        plan_display_name: profile.plan_display_name,
        is_pro_trial: profile.is_pro_trial,
        pro_trial_started_at: profile.pro_trial_started_at,
        pro_trial_ends_at: profile.pro_trial_ends_at,
      });
      if (first) track("signup_completed");
      if (profile.is_pro_trial && !user!.pro_trial_started_at) track("trial_started");
    } catch {
      setError("We could not save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true" aria-labelledby="consent-title" data-testid="consent-gate">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <h2 id="consent-title" className="text-lg font-semibold">One step before you continue</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Please read and accept the Terms and the Privacy Policy. Your {days}-day free Pro trial starts as soon as you accept it. No payment details are needed.
        </p>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            I agree to the{" "}
            <Link href="/more/terms" target="_blank" className="text-accent underline">Terms</Link> and the{" "}
            <Link href="/more/privacy" target="_blank" className="text-accent underline">Privacy Policy</Link>
          </span>
        </label>
        {error && <p className="mt-2 text-sm text-down">{error}</p>}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={logout} className="text-sm text-foreground-muted underline">
            Log out
          </button>
          <button
            type="button"
            onClick={accept}
            disabled={!agree || busy}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            {busy ? "Saving…" : "Accept and continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
