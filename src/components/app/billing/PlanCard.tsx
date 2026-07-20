"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { createBillingOrder, verifyBilling } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/client";
import { openRazorpayCheckout } from "@/lib/razorpay";
import type { BillingPlan } from "@/lib/api/types";

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

export function PlanCard({ plan, highlighted, features }: { plan: BillingPlan; highlighted?: boolean; features: string[] }) {
  const { user, getToken } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function subscribe() {
    if (!user) {
      router.push("/login");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) {
        router.push("/login");
        return;
      }
      const order = await createBillingOrder(token, plan.plan);
      openRazorpayCheckout({
        key: order.key_id ?? RAZORPAY_KEY ?? "",
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: "RedixFi",
        description: plan.tier === "founding" ? "Founding Annual" : "Analytics Pro — Monthly",
        theme: { color: "#2f5ce0" },
        handler: async (resp) => {
          const token2 = await getToken();
          if (!token2) return;
          await verifyBilling(token2, {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          setSuccess(true);
        },
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        setError("Checkout isn't live in this environment yet (payment gateway not configured). This will work once it is.");
      } else {
        setError(e instanceof Error ? e.message : "Could not start checkout.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-xl border p-5 ${highlighted ? "border-accent bg-accent/5" : "border-border"}`}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
        {plan.tier === "founding" ? "Founding Annual" : "Analytics Pro"}
      </h3>
      <p className="mt-1 text-3xl font-bold">
        ₹{plan.amount_rupees.toLocaleString("en-IN")}
        <span className="text-sm font-normal text-foreground-muted">/{plan.period_days >= 300 ? "yr" : "mo"}</span>
      </p>
      {typeof plan.founding_slots_remaining === "number" && (
        <p className="mt-1 text-xs font-medium text-amber">{plan.founding_slots_remaining} of 200 founding spots left</p>
      )}
      <ul className="mt-4 space-y-1.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span aria-hidden>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={subscribe}
        disabled={busy || success}
        className="mt-5 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
      >
        {success ? "Subscribed ✓" : busy ? "Starting checkout…" : "Subscribe"}
      </button>
      {error && <p className="mt-2 text-xs text-down">{error}</p>}
    </div>
  );
}
