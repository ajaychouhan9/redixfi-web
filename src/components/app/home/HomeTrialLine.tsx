"use client";

import Link from "next/link";

import { useAuth } from "@/lib/auth/AuthContext";
import { useTrialDays } from "@/lib/trial";

/** The small free-trial line at the foot of Home, for a logged-out visitor only (the server HTML is always the logged-out one). */
export function HomeTrialLine() {
  const { user } = useAuth();
  const trialDays = useTrialDays();
  if (user) return null;
  return (
    <p className="text-center text-xs text-foreground-muted" data-testid="home-trial-line">
      {trialDays}-day free Pro trial. No payment details needed.{" "}
      <Link href="/login?mode=signup" className="font-medium text-accent underline" data-testid="hero-start-free">
        Start free
      </Link>
    </p>
  );
}
