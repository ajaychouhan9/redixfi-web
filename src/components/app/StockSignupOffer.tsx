"use client";

import { usePathname } from "next/navigation";

import { useAuth } from "@/lib/auth/AuthContext";
import { useTrialDays } from "@/lib/trial";
import { pageType, track } from "@/lib/analytics";

/**
 * Sign-up offer on the public stock pages (16 Nov 2026): /stocks/<symbol>, its concall-summary page and its Market Rewind page.
 * Shown to a logged-out visitor only. Rendered on the server for everyone, exactly like TrialCta: the page is cached and
 * anonymous, so the offer is part of the HTML a visitor from search gets (no layout shift for them), and it unmounts in the
 * browser once a real stored token resolves for a signed-in user. "Start free" opens the existing sign-up form and brings the
 * visitor back to the same page afterwards (the `next` parameter the login page already honours).
 */
export function StockSignupOffer({ companyName, className = "" }: { companyName: string; className?: string }) {
  const { user } = useAuth();
  const trialDays = useTrialDays();
  const pathname = usePathname() || "/";
  if (user) return null;
  const next = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/";
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 ${className}`} data-testid="stock-signup-offer">
      <p className="text-sm text-foreground">
        Get the full {companyName} report free.{" "}
        <span className="text-foreground-muted">{trialDays}-day Pro trial, no payment details.</span>
      </p>
      <a
        href={`/login?mode=signup&next=${encodeURIComponent(next)}`}
        onClick={() => track("trial_cta_click", { page: pageType(pathname) })}
        className="whitespace-nowrap rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
      >
        Start free
      </a>
    </div>
  );
}
