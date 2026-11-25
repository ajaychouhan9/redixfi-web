"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatTrialExpiryLocal } from "@/lib/format";

/** Global, logged-in trial status. The timestamp is authoritative UTC from
 * the API and formatted only for display in the viewer's local timezone. */
export function TrialStatusBar() {
  const { user } = useAuth();
  if (!user?.is_pro_trial || !user.pro_trial_ends_at) return null;

  // trial day 4 (26 Nov 2026): within 36 hours of the end the bar says so plainly and links to the plans; the same moment sends the reminder email
  const hoursLeft = (new Date(user.pro_trial_ends_at).getTime() - Date.now()) / 3_600_000;
  const endsTomorrow = hoursLeft > 0 && hoursLeft <= 36;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-accent/30 bg-accent/10 px-4 py-2 text-[13px]" data-testid={endsTomorrow ? "trial-ends-tomorrow" : "trial-bar"}>
      <span className="font-bold text-foreground">
        {endsTomorrow ? `Your Pro trial ends tomorrow (${formatTrialExpiryLocal(user.pro_trial_ends_at)})` : `Pro Trial · Ends ${formatTrialExpiryLocal(user.pro_trial_ends_at)}`}
      </span>
      <Link href="/pricing" className="inline-flex min-h-[44px] items-center rounded-md bg-accent px-3 font-bold text-accent-foreground">
        {endsTomorrow ? "See plans" : "Upgrade"}
      </Link>
    </div>
  );
}
