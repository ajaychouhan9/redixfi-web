import type { Metadata } from "next";
import { getBillingPlans } from "@/lib/api/endpoints";
import { CheckoutView } from "@/components/app/billing/CheckoutView";

export const metadata: Metadata = {
  title: "Checkout",
  description: "RedixFi Analytics Pro — measured signals, alerts and screeners across 750+ NSE/BSE stocks.",
};

export default async function CheckoutPage() {
  const { data: plans } = await getBillingPlans();
  return <CheckoutView initialPlans={plans} />;
}
