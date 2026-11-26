import { staticMeta } from "@/lib/seo/page-meta";
import type { Metadata } from "next";
import { getBillingPlans } from "@/lib/api/endpoints";
import { CheckoutView } from "@/components/app/billing/CheckoutView";

export const metadata: Metadata = staticMeta("/pricing");

export default async function CheckoutPage() {
  const { data: plans } = await getBillingPlans({ revalidate: 600 });
  return (
    <>
      <CheckoutView initialPlans={plans} />
    </>
  );
}
