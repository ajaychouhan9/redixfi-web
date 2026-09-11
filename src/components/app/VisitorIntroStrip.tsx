"use client";

import Link from "next/link";
import { ShieldAlert, FileSearch, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

/**
 * Server-rendered by default for every request — including Googlebot's —
 * because this codebase has no cookie-based session to branch on (auth is
 * a localStorage-held JWT, read client-side only via AuthContext; see
 * client.ts's own note on this). During SSR, AuthContext's `user` is
 * always null (there's no `window.localStorage` on the server), so the
 * hero always renders in the raw HTML response — the correct, honest
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
 *
 * Landing overhaul (2026-09-11): expanded from a one-line intro strip into
 * the full marketing hero. Copy is deliberately scoped to what's live
 * today — signal coverage is "2,000+ NSE stocks" (confirmed), document
 * coverage is described qualitatively only ("major NSE-listed companies"),
 * never a specific count or "100%". Multi-year AR analysis is NOT claimed
 * here: storage supports up to 5 fiscal years per symbol, but embedding is
 * still gated to the newest year only (AR_EMBED_MAX_YEARS=1) — turning
 * that on is a separate, not-yet-scheduled piece of work.
 */
export function VisitorIntroStrip() {
  const { user } = useAuth();
  if (user) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
      <div className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="font-mono text-[11px] uppercase tracking-widest text-accent">RedixFi — Market. Simplified.</div>
        <h1 className="mt-2 max-w-2xl text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
          The AI that reads the entire market for you
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground-muted sm:text-[15px]">
          Measured signal scores across 2,000+ NSE stocks, AI summaries across major NSE-listed companies&rsquo;
          annual reports and concalls, and a governance radar that flags what institutional coverage misses — all
          updated daily.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/login?mode=signup"
            className="whitespace-nowrap rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
          >
            Start free
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-foreground-muted hover:text-foreground">
            See pricing
          </Link>
        </div>

        <div className="mt-5 inline-flex max-w-2xl items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-foreground-muted">
          <span aria-hidden className="mt-0.5 text-accent-dim">ⓘ</span>
          <span>
            RedixFi is a data and analytics product, not an advisor — the same category Screener-style platforms
            occupy. We report measured, historical and current data; we are not yet SEBI-registered as a Research
            Analyst, so this is not a recommendation, not a forecast, and not a price target.
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5">
            <TrendingUp size={16} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <div className="text-[13px] font-semibold text-foreground">2,000+ NSE stocks</div>
              <div className="text-xs text-foreground-muted">Measured signal scores, full universe, no masking</div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5">
            <FileSearch size={16} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <div className="text-[13px] font-semibold text-foreground">AI document summaries</div>
              <div className="text-xs text-foreground-muted">Annual reports &amp; concalls, source-cited</div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5">
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <div className="text-[13px] font-semibold text-foreground">Governance radar</div>
              <div className="text-xs text-foreground-muted">Auditor, related-party &amp; pledge flags</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
