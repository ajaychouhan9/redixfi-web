"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/lib/auth/AuthContext";
import { useTrialDays } from "@/lib/trial";
import { pageType, track } from "@/lib/analytics";

/**
 * THE link behind every limit or lock (Rewind rows, Market Activity rows and filters, CSV, report PDFs, alerts, Ask AI limits, news delay).
 * A logged-out visitor, or a Free user who has not used the trial, sees "Free for 5 days" and goes to sign-up and back to the same page.
 * A user who has used the trial is sent to /pricing with the text the caller gave. (11 Nov 2026)
 */
export function UpgradeLink({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { user } = useAuth();
  const days = useTrialDays();
  const pathname = usePathname() || "/";
  const trialUsed = !!user?.pro_trial_started_at || (!!user && user.tier !== "free");
  const eligible = !trialUsed;
  const next = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/";
  const href = eligible && !user ? `/login?mode=signup&next=${encodeURIComponent(next)}` : "/pricing";
  return (
    <Link href={href} className={className} onClick={() => track("lock_click", { page: pageType(pathname), trial_offer: eligible })} data-testid="upgrade-link">
      {eligible ? `Free for ${days} days` : children}
    </Link>
  );
}
