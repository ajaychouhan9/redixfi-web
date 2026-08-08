"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { PlanCard } from "@/components/app/billing/PlanCard";
import { BASIC_FEATURES, PRO_FEATURES } from "@/data/plan-features";
import type { BillingPlan } from "@/lib/api/types";

/**
 * Homepage pricing reveal (2026-08-08) — held back deliberately until
 * multi-tier (Basic/Pro) was confirmed live in production; that
 * precondition is now met. Same SSR-anonymous-by-default,
 * hide-once-a-real-token-resolves pattern `VisitorIntroStrip.tsx` already
 * established: `user` is always `null` during SSR (this app has no
 * cookie session, auth is a localStorage-held JWT client.ts/AuthContext
 * only read inside a useEffect) — so this section is ALWAYS present in
 * the raw HTML response for every anonymous visitor AND every crawler,
 * identically, checked via source (a real auth token), never
 * User-Agent/IP. Not cloaking — same reasoning already verified for
 * VisitorIntroStrip, reused here rather than re-argued.
 *
 * `plans` is fetched server-side by app/(app)/page.tsx via the same
 * public, unauthenticated getBillingPlans() fetch /pricing's own page
 * already uses — the real ₹ amounts shown here come from
 * app_models.PLANS via GET /billing/plans, never a separate hardcoded
 * number that could drift from it. Feature-list copy is the exact same
 * BASIC_FEATURES/PRO_FEATURES array CheckoutView.tsx renders on
 * /pricing (src/data/plan-features.ts) — one shared constant, not a
 * second near-duplicate list.
 *
 * <PlanCard> itself (not rebuilt here) already redirects a logged-out
 * "Subscribe" click to /login — the exact CTA-into-signup behavior this
 * section needs, with zero new logic.
 */
export function HomePricingSection({ plans }: { plans: BillingPlan[] }) {
  const { user } = useAuth();
  if (user) return null;

  const basic = plans.find((p) => p.plan === "basic_249");
  const pro = plans.find((p) => p.plan === "pro_399");
  if (!basic && !pro) return null;

  return (
    <div>
      <div className="mb-4 text-center">
        <h2 className="text-lg font-semibold">Simple, transparent pricing</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Cancel anytime. Annual plans and promo codes available on the full{" "}
          <Link href="/pricing" className="font-medium text-accent hover:underline">
            pricing page
          </Link>
          .
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {basic && <PlanCard plan={basic} features={BASIC_FEATURES} mode="new" />}
        {pro && <PlanCard plan={pro} highlighted badge="Most Popular" features={PRO_FEATURES} mode="new" />}
      </div>
    </div>
  );
}
