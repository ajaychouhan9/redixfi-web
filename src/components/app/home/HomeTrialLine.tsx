"use client";

import Link from "next/link";

import { useAuth } from "@/lib/auth/AuthContext";
import { useTrialDays } from "@/lib/trial";
import { HomePricingStrip } from "@/components/app/home/HomePricingStrip";

/** The small free-trial line at the foot of Home, for a logged-out visitor only (the server HTML is always the logged-out one). */
export function HomeTrialLine() {
  const { user } = useAuth();
  const trialDays = useTrialDays();
  if (user) return null;
  return (
    <div className="space-y-1">
      <HomePricingStrip />
      <p className="text-center text-[13px] text-foreground-muted" data-testid="home-trial-line">
        {trialDays}-day free Pro trial. No payment details needed.{" "}
        <Link prefetch={false} href="/login?mode=signup" className="inline-flex min-h-[44px] items-center font-medium text-accent underline" data-testid="hero-start-free">
          Start free
        </Link>
      </p>
    </div>
  );
}
