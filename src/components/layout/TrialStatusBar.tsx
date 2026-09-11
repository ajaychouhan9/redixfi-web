"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatTrialExpiryLocal } from "@/lib/format";

/** Global, logged-in trial status. The timestamp is authoritative UTC from
 * the API and formatted only for display in the viewer's local timezone. */
export function TrialStatusBar() {
  const { user } = useAuth();
  if (!user?.is_pro_trial || !user.pro_trial_ends_at) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-accent/30 bg-accent/10 px-4 py-2 text-xs">
      <span className="font-semibold text-foreground">
        Pro Trial · Ends {formatTrialExpiryLocal(user.pro_trial_ends_at)}
      </span>
      <Link href="/pricing" className="rounded-md bg-accent px-2.5 py-1 font-semibold text-accent-foreground">
        Upgrade
      </Link>
    </div>
  );
}
