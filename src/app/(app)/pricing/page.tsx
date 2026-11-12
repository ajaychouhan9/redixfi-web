import type { Metadata } from "next";
import { getBillingPlans } from "@/lib/api/endpoints";
import { CheckoutView } from "@/components/app/billing/CheckoutView";

export const metadata: Metadata = {
  title: "Pricing",
  alternates: { canonical: "/pricing" },
  description: "RedixFi plans and prices: Free, Basic (Rs 249 a month) and Pro (Rs 399 a month), with a free 5-day Pro trial. Measured delivery, volume and price data for 2,000+ NSE stocks.",
};

export default async function CheckoutPage() {
  const { data: plans } = await getBillingPlans();
  return (
    <>
      <CheckoutView initialPlans={plans} />
    </>
  );
}
