"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
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

const ANNUAL_SAVINGS_NOTE = "Save ~16% vs paying monthly for a year";

// Task 20 Part B.5 — CRITICAL, non-negotiable: price-lock only, never a
// feature promise. No mention of RA-gated features anywhere in this list —
// this redesign must not reintroduce the compliance violation already
// caught once (an earlier pricing-page draft implied founding members got
// directional research at no extra cost).
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
  const foundingPlan = plans.find((p) => p.tier === "founding");
  const standardAnnualPlan = plans.find((p) => p.period_days >= 300 && p.tier !== "founding");
  const capReached = (foundingPlan?.founding_slots_remaining ?? 0) <= 0;

  const activeSub = profile?.subscription.status === "active" ? profile.subscription : null;
  const isOnMonthly = !!activeSub && activeSub.plan === monthly?.plan;
  const isOnFounding = !!activeSub && activeSub.plan === foundingPlan?.plan;
  const isOnStandardAnnual = !!activeSub && activeSub.plan === standardAnnualPlan?.plan;
  const isOnAnnual = isOnFounding || isOnStandardAnnual;
  const hasPendingUpgrade = !!profile?.pending_plan_change;

  // SINGLE dynamic Annual card: an existing founding member always keeps
  // seeing their own card (price-locked, regardless of cap status
  // elsewhere); anyone else sees Founding while spots remain, auto-
  // flipping to standard Annual the moment the cap fills — never two
  // separate annual cards competing for attention.
  const annualCardPlan = isOnFounding ? foundingPlan : isOnStandardAnnual ? standardAnnualPlan : !capReached && foundingPlan ? foundingPlan : standardAnnualPlan;
  const annualCardIsFounding = annualCardPlan?.tier === "founding";

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

  function promoPreviewFor(plan: BillingPlan | undefined) {
    if (!plan || !promoResult?.valid || promoResult.final_amount_paise == null) return null;
    const discountLabel =
      promoResult.discount_type === "flat" ? `₹${promoResult.discount_value} off` : `${promoResult.discount_pct}% off`;
    return { discountLabel: `You save — ${discountLabel}`, finalAmountRupees: Math.round(promoResult.final_amount_paise / 100) };
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

      <div
        className="sticky top-2 z-10 mb-5 flex flex-col gap-2 rounded-xl border border-border bg-surface-raised p-3 shadow-sm sm:flex-row sm:items-center"
        style={promoResult?.valid ? { borderColor: "var(--up)" } : undefined}
      >
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-foreground-faint">Promo code</span>
          <input
            value={promoInput}
            onChange={(e) => {
              setPromoInput(e.target.value);
              setPromoResult(null);
            }}
            placeholder="Have a code? Enter it here"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>
        <button
          type="button"
          disabled={promoChecking || !promoInput.trim() || !(monthly ?? annualCardPlan)}
          onClick={() => checkPromo(monthly ?? (annualCardPlan as BillingPlan))}
          className="rounded-lg border border-border bg-hover px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {promoChecking ? "Checking…" : "Apply"}
        </button>
        {promoResult && (
          <p className={`text-sm sm:ml-2 ${promoResult.valid ? "flex items-center gap-1.5 text-up animate-pop-in" : "text-down"}`}>
            {promoResult.valid && <CheckCircle2 size={14} className="shrink-0" />}
            {promoResult.valid ? "Code applied — see savings on the plan below." : promoResult.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {monthly && showMonthly && (
          <PlanCard
            plan={monthly}
            features={PAID_FEATURES}
            mode={isOnMonthly ? "current" : "new"}
            promoCode={promoResult?.valid ? promoInput.trim() : undefined}
            promoPreview={promoPreviewFor(monthly)}
            onPurchased={reload}
          />
        )}
        {annualCardPlan && (
          <PlanCard
            key={annualCardPlan.plan}
            plan={annualCardPlan}
            highlighted
            badge={annualCardIsFounding ? "Best Value" : "Most Popular"}
            savingsNote={ANNUAL_SAVINGS_NOTE}
            features={annualCardIsFounding ? [...PAID_FEATURES, ...FOUNDING_EXTRA] : PAID_FEATURES}
            mode={isOnAnnual ? "current" : isOnMonthly && !hasPendingUpgrade ? "upgrade" : "new"}
            disabled={isOnMonthly && hasPendingUpgrade && !isOnAnnual}
            disabledReason={isOnMonthly && hasPendingUpgrade ? "An annual upgrade is already scheduled." : undefined}
            promoCode={promoResult?.valid ? promoInput.trim() : undefined}
            promoPreview={promoPreviewFor(annualCardPlan)}
            onPurchased={reload}
          />
        )}
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
