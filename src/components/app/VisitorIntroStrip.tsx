"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";

/**
 * Server-rendered by default for every request — including Googlebot's —
 * because this codebase has no cookie-based session to branch on (auth is
 * a localStorage-held JWT, read client-side only via AuthContext; see
 * client.ts's own note on this). During SSR, AuthContext's `user` is
 * always null (there's no `window.localStorage` on the server), so the
 * strip always renders in the raw HTML response — the correct, honest
 * default, since a request with no way to prove it's logged in SHOULD see
 * the logged-out framing. This is the same SSR-anonymous-by-default +
 * client-side-correct-if-entitled pattern already established for the
 * Signals paywall bug (SignalUnlockGate) and the Event Risk SSR fix
 * (EventRiskCard) — checking a REAL auth token, never user-agent or IP,
 * so a real visitor and a crawler get identical HTML (no cloaking).
 *
 * Once a genuinely logged-in user's token resolves client-side, `user`
 * becomes non-null and this unmounts — a real subscriber doesn't need
 * onboarding framing repeated on every visit.
 */
export function VisitorIntroStrip() {
  const { user } = useAuth();
  if (user) return null;

  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-foreground-muted">
        RedixFi tracks measured signals, delivery and options data, and AI-classified news across 750+ NSE/BSE
        stocks every day — analytics, not advice.
      </p>
      <div className="flex shrink-0 items-center gap-3">
        <Link href="/pricing" className="text-sm font-medium text-foreground-muted hover:text-foreground">
          See pricing
        </Link>
        <Link
          href="/login?mode=signup"
          className="whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Start free
        </Link>
      </div>
    </div>
  );
}
