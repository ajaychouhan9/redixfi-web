"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { PLAN_LABEL, PlanCard } from "@/components/app/billing/PlanCard";
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
  // Keyed by plan id — validated INDEPENDENTLY per plan (never one plan's
  // result reused for another). This is the fix for a live bug where the
  // Founding Annual card showed a false 100%-off/₹0 preview for a code
  // that was only ever validated against Analytics Pro (monthly): the old
  // single `promoResult` state was shared across every rendered card
  // regardless of which plan it was actually checked against.
  const [promoResults, setPromoResults] = useState<Record<string, PromoValidation>>({});
  const [promoChecking, setPromoChecking] = useState(false);
  const promoApplied = Object.values(promoResults).some((r) => r.valid);

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

  // Validates the SAME code against every plan card actually on screen,
  // in parallel — one /billing/promo-code/validate request per plan, each
  // keyed by its own plan id, so a card can never show a discount that
  // wasn't computed for its own plan+code combination.
  async function checkPromo() {
    const code = promoInput.trim();
    if (!code) {
      setPromoResults({});
      return;
    }
    const targets = [monthly, annualCardPlan].filter((p): p is BillingPlan => !!p);
    if (targets.length === 0) return;
    setPromoChecking(true);
    try {
      const entries = await Promise.all(targets.map(async (p) => [p.plan, await validatePromoCode(code, p.plan)] as const));
      setPromoResults(Object.fromEntries(entries));
    } finally {
      setPromoChecking(false);
    }
  }

  function promoPreviewFor(plan: BillingPlan | undefined) {
    if (!plan) return null;
    const result = promoResults[plan.plan];
    if (!result) return null;
    if (!result.valid || result.final_amount_paise == null) {
      // Explicit "not applicable" rather than silently showing 0% savings
      // or reusing another plan's result — the user must never see a
      // number on screen that doesn't match what they'll actually be
      // charged for THIS plan.
      return { applicable: false as const, message: `Not applicable to ${PLAN_LABEL[plan.plan] ?? "this plan"}` };
    }
    const discountLabel = result.discount_type === "flat" ? `₹${result.discount_value} off` : `${result.discount_pct}% off`;
    return { applicable: true as const, discountLabel: `You save — ${discountLabel}`, finalAmountRupees: Math.round(result.final_amount_paise / 100) };
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
        style={promoApplied ? { borderColor: "var(--up)" } : undefined}
      >
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-foreground-faint">Promo code</span>
          <input
            value={promoInput}
            onChange={(e) => {
              setPromoInput(e.target.value);
              setPromoResults({});
            }}
            placeholder="Have a code? Enter it here"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>
        <button
          type="button"
          disabled={promoChecking || !promoInput.trim() || !(monthly ?? annualCardPlan)}
          onClick={() => checkPromo()}
          className="rounded-lg border border-border bg-hover px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {promoChecking ? "Checking…" : "Apply"}
        </button>
        {Object.keys(promoResults).length > 0 && (
          <p className={`text-sm sm:ml-2 ${promoApplied ? "flex items-center gap-1.5 text-up animate-pop-in" : "text-down"}`}>
            {promoApplied && <CheckCircle2 size={14} className="shrink-0" />}
            {promoApplied ? "Code applied — see savings on the plan(s) below." : Object.values(promoResults)[0]?.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {monthly && showMonthly && (
          <PlanCard
            plan={monthly}
            features={PAID_FEATURES}
            mode={isOnMonthly ? "current" : "new"}
            promoCode={promoResults[monthly.plan]?.valid ? promoInput.trim() : undefined}
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
            promoCode={promoResults[annualCardPlan.plan]?.valid ? promoInput.trim() : undefined}
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
