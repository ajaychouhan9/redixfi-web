import type { Metadata } from "next";
import { getBillingPlans } from "@/lib/api/endpoints";
import { PlanCard } from "@/components/app/billing/PlanCard";

export const metadata: Metadata = {
  title: "Pricing",
  description: "RedixFi Analytics Pro — measured signals, alerts and screeners across 750 NSE/BSE stocks.",
};

const PAID_FEATURES = [
  "All 750 stocks' measured signal scores, unlocked",
  "Unlimited Research Pro company lookups",
  "Same-day news (no 24h delay)",
  "Watchlist alerts: signal changes, event risk, market-wide events",
  "AI Daily Brief digest",
  "CSV export on the Signal Dashboard",
];

const FOUNDING_EXTRA = ["Locked-in founding price for year one", "Web-exclusive — not available on the Play Store"];

export default async function PricingPage() {
  const { data: plans } = await getBillingPlans();
  const monthly = plans.find((p) => p.tier === "paid");
  const founding = plans.find((p) => p.tier === "founding");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-xl font-semibold">Pricing</h1>
      <p className="mb-6 max-w-xl text-sm text-foreground-muted">
        Directional research launches after our SEBI RA registration — founding members get it at no extra cost.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {monthly && <PlanCard plan={monthly} features={PAID_FEATURES} />}
        {founding && <PlanCard plan={founding} highlighted features={[...PAID_FEATURES, ...FOUNDING_EXTRA]} />}
      </div>
      <p className="mt-6 text-xs text-foreground-faint">
        Prices are GST-inclusive; invoices show the breakup. Subscriptions renew automatically and can be cancelled
        anytime from Account — cancellation is pro-rata.
      </p>
    </div>
  );
}
