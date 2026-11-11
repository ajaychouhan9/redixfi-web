"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/lib/auth/AuthContext";
import { useTrialDays } from "@/lib/trial";
import { pageType, track } from "@/lib/analytics";

/**
 * Sign-up buttons for a logged-out visitor on a stock page: the primary button starts the free Pro trial
 * (sign-up, then back to the same page), "See pricing" is the secondary link. Nothing is shown to a signed-in user.
 * Rendered on the server for everyone like VisitorIntroStrip, so the button is in the HTML a visitor from search gets.
 */
export function TrialCta({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const trialDays = useTrialDays();
  const pathname = usePathname() || "/";
  if (user) return null;
  const next = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/";
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`} data-testid="trial-cta">
      <Link
        href={`/login?mode=signup&next=${encodeURIComponent(next)}`}
        onClick={() => track("trial_cta_click", { page: pageType(pathname) })}
        className="whitespace-nowrap rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
      >
        Start {trialDays}-day free Pro trial
      </Link>
      <Link href="/pricing" className="text-sm font-medium text-foreground-muted hover:text-foreground">
        See pricing
      </Link>
    </div>
  );
}
