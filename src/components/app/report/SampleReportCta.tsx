"use client";

import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";

/**
 * "Get reports for the stocks you follow" on the sample report page. Logged out: the sign-up card. Logged-in Free: the plan line with "See plans"
 * only. Basic, Pro and trial: nothing. Nothing while the sign-in state is still loading (no flash of the logged-out version).
 */
export function SampleReportCta() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    const free = user.tier === "free" && !user.is_pro_trial;
    if (!free) return null;
    return (
      <Card title="Company report PDFs">
        <p className="text-sm text-foreground-muted" data-testid="sample-free-note">Company report PDFs are part of Basic and Pro.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/pricing" className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-hover">
            See plans
          </Link>
        </div>
      </Card>
    );
  }
  return (
    <Card title="Get reports for the stocks you follow">
      <p className="text-sm text-foreground-muted">
        Create a free account to follow stocks and see their Stock Conditions. Company report PDFs for any stock with enough data are part of Basic and Pro.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/login" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground" data-testid="sample-signup">
          Create a free account
        </Link>
        <Link href="/pricing" className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-hover">
          See plans
        </Link>
      </div>
    </Card>
  );
}
