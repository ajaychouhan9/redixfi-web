"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { PLAN_LABEL, PlanCard } from "@/components/app/billing/PlanCard";
import { TopupCard } from "@/components/app/billing/TopupCard";
import { SubscriptionStatusCard } from "@/components/app/account/SubscriptionStatusCard";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMe, validatePromoCode } from "@/lib/api/mutations";
import type { BillingPlan, MeProfile, PromoValidation } from "@/lib/api/types";

// Multi-tier restructure (2026-08-08) — Basic/Pro replace the single paid
// tier. Feature lists deliberately state each tier's FULL capability set
// rather than "everything in Basic, plus X" — Pro's Ask-AI cap (25/day)
// and compare cap (10 stocks) aren't "Basic's numbers plus something",
// they're different numbers entirely (core/plan_limits.py is the real
// source of truth these mirror; kept in sync manually, same established
// convention as this codebase's other cross-file duplicated constants).
const BASIC_FEATURES = [
  "All 750+ stocks' measured signal scores — full data, no masking",
  "Unlimited Research Pro company lookups",
  "Same-day news (no 24h delay)",
  "Watchlist alerts: signal changes, event risk, market-wide events",
  "AI Daily Brief digest",
  "Ask-RedixFi AI: 10 questions/day",
  "Compare up to 2 stocks side by side",
  "View-only signal table — ask Ask-RedixFi to filter or sort for you",
];

const PRO_FEATURES = [
  "All 750+ stocks' measured signal scores — full data, no masking",
  "Unlimited Research Pro company lookups",
  "Same-day news (no 24h delay)",
  "Watchlist alerts: signal changes, event risk, market-wide events",
  "AI Daily Brief digest",
  "Ask-RedixFi AI: 25 questions/day",
  "Compare up to 10 stocks side by side",
  "Full sort/filter/search + CSV export on the Signal Dashboard",
];

const ANNUAL_SAVINGS_NOTE = "Save vs paying monthly for a year";

// Plan ids whose BILLING PERIOD is annual — a naming-convention check
// (deliberately not a live GET /billing/plans lookup, see below) used
// only to decide whether to show the Monthly toggle as available, never
// for anything that determines what a user is actually charged.
function isAnnualPlanId(planId: string | null | undefined): boolean {
  return !!planId && (planId.includes("annual") || planId === "founding_1799");
}

export function CheckoutView({ initialPlans }: { initialPlans: BillingPlan[] }) {
  const { user, getToken } = useAuth();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [plans] = useState(initialPlans);
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  // Keyed by plan id — validated INDEPENDENTLY per plan (never one plan's
  // result reused for another) — see the promo-preview-mismatch bug fix
  // this pattern originated from.
  const [promoInput, setPromoInput] = useState("");
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

  const activeSub = profile?.subscription.status === "active" ? profile.subscription : null;
  // Multi-tier restructure (2026-08-08) — DECOUPLED from GET /billing/
  // plans on purpose: the OLD checkout derived "is this user on plan X"
  // by cross-referencing the PURCHASABLE plans list, which broke the
  // instant a plan stopped being purchasable (an existing founding
  // subscriber's own card would silently vanish from that derivation the
  // moment founding_1799 was no longer listed — exactly the "don't break
  // their view" risk this task flagged). `profile.tier`/`profile.
  // subscription.plan` are the single source of truth for "what does
  // THIS user actually have", entirely independent of what's for sale
  // today.
  const currentTier = profile?.tier;
  const isOnFounding = currentTier === "founding" && !!activeSub;
  const isOnAnnualPeriod = isAnnualPlanId(activeSub?.plan);
  const hasPendingUpgrade = !!profile?.pending_plan_change;

  // Part A precedent (no downgrade path): once on an annual-period plan
  // (any tier, or founding), Monthly is no longer offered as a view —
  // force the toggle to Annual and keep it there.
  useEffect(() => {
    if (isOnAnnualPeriod) setPeriod("annual");
  }, [isOnAnnualPeriod]);

  const basicMonthly = plans.find((p) => p.plan === "basic_249");
  const proMonthly = plans.find((p) => p.plan === "pro_399");
  const basicAnnual = plans.find((p) => p.plan === "basic_annual_2399");
  const proAnnual = plans.find((p) => p.plan === "pro_annual_3999");

  const basicPlan = period === "monthly" ? basicMonthly : basicAnnual;
  const proPlan = period === "monthly" ? proMonthly : proAnnual;

  function modeFor(plan: BillingPlan | undefined): "current" | "upgrade" | "new" {
    if (!plan || !activeSub) return "new";
    if (activeSub.plan === plan.plan) return "current";
    // Mirrors the backend's own condition exactly (routers/billing.py::
    // _finalize_subscription_purchase's `is_scheduled_upgrade`): ANY
    // annual purchase while currently on a monthly-period plan schedules
    // for cycle-end rather than switching immediately, regardless of
    // whether the destination tier matches the current one — a
    // deliberate, period-based (not tier-based) generalization, since
    // Basic and Pro didn't exist as separate products when that
    // mechanic was first built.
    if (plan.period_days >= 300 && !isOnAnnualPeriod && !isOnFounding) return "upgrade";
    return "new";
  }

  async function checkPromo() {
    const code = promoInput.trim();
    if (!code) {
      setPromoResults({});
      return;
    }
    const targets = [basicPlan, proPlan].filter((p): p is BillingPlan => !!p);
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
      return { applicable: false as const, message: `Not applicable to ${PLAN_LABEL[plan.plan] ?? "this plan"}` };
    }
    const discountLabel = result.discount_type === "flat" ? `₹${result.discount_value} off` : `${result.discount_pct}% off`;
    return { applicable: true as const, discountLabel: `You save — ${discountLabel}`, finalAmountRupees: Math.round(result.final_amount_paise / 100) };
  }

  const foundingDisabledReason = "You're on a Founding Annual plan — contact support to change your plan.";

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

      {isOnFounding && (
        <p className="mb-5 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-foreground-muted">{foundingDisabledReason}</p>
      )}

      <div className="mb-5 inline-flex rounded-lg border border-border bg-surface-raised p-1 text-sm">
        <button
          type="button"
          onClick={() => setPeriod("monthly")}
          disabled={isOnAnnualPeriod}
          title={isOnAnnualPeriod ? "Already on an annual plan" : undefined}
          className={`rounded-md px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
            period === "monthly" ? "bg-accent text-accent-foreground" : "text-foreground-muted"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setPeriod("annual")}
          className={`rounded-md px-3 py-1.5 font-medium ${period === "annual" ? "bg-accent text-accent-foreground" : "text-foreground-muted"}`}
        >
          Annual
        </button>
      </div>

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
          disabled={promoChecking || !promoInput.trim() || !(basicPlan ?? proPlan)}
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
        {basicPlan && (
          <PlanCard
            plan={basicPlan}
            features={BASIC_FEATURES}
            mode={modeFor(basicPlan)}
            disabled={isOnFounding || (modeFor(basicPlan) === "upgrade" && hasPendingUpgrade)}
            disabledReason={isOnFounding ? foundingDisabledReason : modeFor(basicPlan) === "upgrade" && hasPendingUpgrade ? "An annual upgrade is already scheduled." : undefined}
            promoCode={promoResults[basicPlan.plan]?.valid ? promoInput.trim() : undefined}
            promoPreview={promoPreviewFor(basicPlan)}
            onPurchased={reload}
          />
        )}
        {proPlan && (
          <PlanCard
            plan={proPlan}
            highlighted
            badge="Most Popular"
            savingsNote={period === "annual" ? ANNUAL_SAVINGS_NOTE : undefined}
            features={PRO_FEATURES}
            mode={modeFor(proPlan)}
            disabled={isOnFounding || (modeFor(proPlan) === "upgrade" && hasPendingUpgrade)}
            disabledReason={isOnFounding ? foundingDisabledReason : modeFor(proPlan) === "upgrade" && hasPendingUpgrade ? "An annual upgrade is already scheduled." : undefined}
            promoCode={promoResults[proPlan.plan]?.valid ? promoInput.trim() : undefined}
            promoPreview={promoPreviewFor(proPlan)}
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
