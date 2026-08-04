"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { createBillingOrder, verifyBilling } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/client";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { formatShortDate } from "@/lib/format";
import type { BillingPlan } from "@/lib/api/types";

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

const PLAN_LABEL: Record<string, string> = {
  monthly_249: "Analytics Pro",
  annual_2499: "Annual",
  founding_1799: "Founding Annual",
};

/**
 * Task 20 — extended for Checkout's state-dependent plan cards: a plan can
 * render as purchasable (mode="new"), the user's already-active plan
 * (mode="current", disabled), or a monthly->annual SCHEDULED upgrade
 * (mode="upgrade" — payment captures now, activation deferred, no
 * proration math anywhere in this component; the actual scheduling logic
 * lives server-side in verify_billing).
 */
export function PlanCard({
  plan,
  highlighted,
  features,
  mode = "new",
  disabled,
  disabledReason,
  promoCode,
  onPurchased,
}: {
  plan: BillingPlan;
  highlighted?: boolean;
  features: string[];
  mode?: "new" | "current" | "upgrade";
  disabled?: boolean;
  disabledReason?: string;
  promoCode?: string;
  onPurchased?: () => void;
}) {
  const { user, getToken } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);

  async function subscribe() {
    if (!RAZORPAY_KEY) {
      setError("Payments are not configured.");
      return;
    }
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
      const order = await createBillingOrder(token, plan.plan, promoCode);
      openRazorpayCheckout({
        key: order.razorpay_key_id ?? RAZORPAY_KEY ?? "",
        amount: order.amount_paise,
        currency: order.currency,
        order_id: order.order_id,
        name: "RedixFi",
        description: PLAN_LABEL[plan.plan] ?? plan.plan,
        theme: { color: "#2f5ce0" },
        handler: async (resp) => {
          const token2 = await getToken();
          if (!token2) return;
          const result = await verifyBilling(token2, {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          if (result.scheduled && result.effective_date) {
            setScheduledFor(result.effective_date);
          }
          onPurchased?.();
        },
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        setError("Checkout isn't live in this environment yet (payment gateway not configured). This will work once it is.");
      } else if (e instanceof ApiError && e.status === 501) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : "Could not start checkout.");
      }
    } finally {
      setBusy(false);
    }
  }

  const isCurrent = mode === "current";
  const isUpgrade = mode === "upgrade";

  return (
    <div className={`rounded-xl border p-5 ${highlighted ? "border-accent bg-accent/5" : "border-border"}`}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">{PLAN_LABEL[plan.plan] ?? plan.plan}</h3>
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

      {isUpgrade && !scheduledFor && (
        <p className="mt-3 text-xs text-foreground-faint">
          Payment captures now; the annual period starts when your current monthly cycle ends — no proration, your
          monthly plan runs unchanged until then.
        </p>
      )}

      {scheduledFor ? (
        <p className="mt-5 rounded-lg bg-up-bg px-3 py-2 text-sm text-up">Scheduled — annual starts {formatShortDate(scheduledFor)} ✓</p>
      ) : isCurrent ? (
        <button disabled className="mt-5 w-full cursor-default rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground-muted">
          Current plan
        </button>
      ) : (
        <button
          onClick={subscribe}
          disabled={busy || disabled}
          title={disabled ? disabledReason : undefined}
          className="mt-5 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {busy ? "Starting checkout…" : isUpgrade ? "Upgrade to annual" : "Subscribe"}
        </button>
      )}
      {disabled && disabledReason && !isCurrent && <p className="mt-2 text-xs text-foreground-faint">{disabledReason}</p>}
      {error && <p className="mt-2 text-xs text-down">{error}</p>}
    </div>
  );
}
