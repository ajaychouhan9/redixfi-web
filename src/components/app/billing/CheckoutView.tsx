"use client";

import { useEffect, useState } from "react";
import { PlanCard } from "@/components/app/billing/PlanCard";
import { TopupCard } from "@/components/app/billing/TopupCard";
import { SubscriptionStatusCard } from "@/components/app/account/SubscriptionStatusCard";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMe, validatePromoCode } from "@/lib/api/mutations";
import type { BillingPlan, MeProfile, PromoValidation } from "@/lib/api/types";

const PAID_FEATURES = [
  "All 750 stocks' measured signal scores, unlocked",
  "Unlimited Research Pro company lookups",
  "Same-day news (no 24h delay)",
  "Watchlist alerts: signal changes, event risk, market-wide events",
  "AI Daily Brief digest",
  "CSV export on the Signal Dashboard",
  "Ask-RedixFi AI: 25 questions/day",
];

const ANNUAL_EXTRA = ["~16% cheaper than paying monthly for a year"];

// Task 20 Part B.5 — CRITICAL, non-negotiable: price-lock only, never a
// feature promise. No mention of RA-gated features anywhere in this list.
const FOUNDING_EXTRA = ["Founding price locked in for as long as you stay subscribed", "Web-exclusive — not available on the Play Store"];

export function CheckoutView({ initialPlans }: { initialPlans: BillingPlan[] }) {
  const { user, getToken } = useAuth();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [plans, setPlans] = useState(initialPlans);
  const [promoInput, setPromoInput] = useState("");
  const [promoResult, setPromoResult] = useState<PromoValidation | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);

  async function reload() {
    const token = await getToken();
    if (!token) return;
    setProfile(await getMe(token));
  }

  useEffect(() => {
    if (user) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const monthly = plans.find((p) => p.period_days < 300);
  const annuals = plans.filter((p) => p.period_days >= 300);

  const activeSub = profile?.subscription.status === "active" ? profile.subscription : null;
  const isOnMonthly = !!activeSub && activeSub.plan === monthly?.plan;
  const isOnAnnual = !!activeSub && annuals.some((p) => p.plan === activeSub.plan);
  const hasPendingUpgrade = !!profile?.pending_plan_change;

  // Part A: no downgrade path — annual (incl. founding) hides monthly
  // entirely rather than offering it as an option.
  const showMonthly = !isOnAnnual;

  async function checkPromo(plan: BillingPlan) {
    if (!promoInput.trim()) {
      setPromoResult(null);
      return;
    }
    setPromoChecking(true);
    try {
      setPromoResult(await validatePromoCode(promoInput.trim(), plan.plan));
    } finally {
      setPromoChecking(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-lg font-semibold">Checkout</h1>
      <p className="mb-6 max-w-xl text-sm text-foreground-muted">
        Our current focus is building the most trusted analytics platform in India. Any future regulated research
        services will only be introduced after we receive the necessary regulatory approvals.
      </p>

      {profile && activeSub && (
        <div className="mb-6">
          <SubscriptionStatusCard profile={profile} onChange={setProfile} />
        </div>
      )}

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-foreground-faint">Promo code</span>
          <input
            value={promoInput}
            onChange={(e) => {
              setPromoInput(e.target.value);
              setPromoResult(null);
            }}
            placeholder="Have a code? Enter it here"
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm outline-none"
          />
        </label>
        <button
          type="button"
          disabled={promoChecking || !promoInput.trim() || !(monthly ?? annuals[0])}
          onClick={() => checkPromo(monthly ?? annuals[0])}
          className="rounded-lg border border-border bg-hover px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {promoChecking ? "Checking…" : "Apply"}
        </button>
      </div>
      {promoResult && (
        <p className={`mb-5 text-sm ${promoResult.valid ? "text-up" : "text-down"}`}>
          {promoResult.valid ? `${promoResult.discount_pct}% off applied to your purchase below.` : promoResult.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {monthly && showMonthly && (
          <PlanCard
            plan={monthly}
            features={PAID_FEATURES}
            mode={isOnMonthly ? "current" : "new"}
            promoCode={promoResult?.valid ? promoInput.trim() : undefined}
            onPurchased={reload}
          />
        )}
        {annuals.map((p) => {
          const isFounding = p.tier === "founding";
          const isCurrentThis = activeSub?.plan === p.plan;
          const mode = isCurrentThis ? "current" : isOnMonthly && !hasPendingUpgrade ? "upgrade" : "new";
          const capReached = isFounding && (p.founding_slots_remaining ?? 1) <= 0;
          if (isFounding && capReached && !isCurrentThis) return null; // Part B.5: disappears once the cap fills, existing founders keep their card via mode="current"
          return (
            <PlanCard
              key={p.plan}
              plan={p}
              highlighted={isFounding}
              features={isFounding ? [...PAID_FEATURES, ...ANNUAL_EXTRA, ...FOUNDING_EXTRA] : [...PAID_FEATURES, ...ANNUAL_EXTRA]}
              mode={mode}
              disabled={isOnMonthly && hasPendingUpgrade && !isCurrentThis}
              disabledReason={isOnMonthly && hasPendingUpgrade ? "An annual upgrade is already scheduled." : undefined}
              promoCode={promoResult?.valid ? promoInput.trim() : undefined}
              onPurchased={reload}
            />
          );
        })}
      </div>

      {profile && profile.tier !== "free" && (
        <div className="mt-6">
          <TopupCard />
        </div>
      )}

      <p className="mt-6 text-xs text-foreground-faint">
        Prices are GST-inclusive; invoices show the breakup. Subscriptions renew automatically and can be cancelled
        anytime — cancellation is pro-rata.
      </p>
    </div>
  );
}
