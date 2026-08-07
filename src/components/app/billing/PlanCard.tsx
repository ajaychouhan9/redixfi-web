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

// Multi-tier restructure (2026-08-08) — Basic/Pro replace the single
// paid tier; Founding Annual is retired (no longer purchasable, never
// returned by GET /billing/plans, so PlanCard itself never renders these
// three anymore). Kept here anyway, not deleted, in case a future
// receipt/order-history view needs to label an old order — costs
// nothing to keep, same "retired, not deleted" reasoning as
// app_models.PLANS itself.
export const PLAN_LABEL: Record<string, string> = {
  basic_249: "Basic",
  pro_399: "Pro",
  basic_annual_2399: "Basic Annual",
  pro_annual_3999: "Pro Annual",
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
  badge,
  savingsNote,
  features,
  mode = "new",
  disabled,
  disabledReason,
  promoCode,
  promoPreview,
  onPurchased,
}: {
  plan: BillingPlan;
  highlighted?: boolean;
  /** "Most Popular" / "Best Value" — only meaningful alongside `highlighted`. */
  badge?: string;
  /** e.g. "Save ~16% vs paying monthly" — rendered under the price. */
  savingsNote?: string;
  features: string[];
  mode?: "new" | "current" | "upgrade";
  disabled?: boolean;
  disabledReason?: string;
  promoCode?: string;
  /**
   * Live preview from the promo validation response, computed by the
   * caller PER PLAN (validated against THIS card's own plan id — never a
   * different plan's result reused across cards, the root cause of a live
   * bug where Founding Annual showed a false 100%-off/₹0 preview for a
   * code that only ever applied to Analytics Pro; see CheckoutView.tsx).
   * `applicable: false` renders an honest "doesn't apply to this plan"
   * notice instead of a number the user won't actually be charged.
   */
  promoPreview?: { applicable: true; discountLabel: string; finalAmountRupees: number } | { applicable: false; message: string } | null;
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

      if (order.free_checkout) {
        // 100%-off promo bypass — the backend already activated the
        // subscription synchronously; there's no Razorpay order to open.
        if (order.scheduled && order.effective_date) {
          setScheduledFor(order.effective_date);
        }
        onPurchased?.();
        return;
      }
      if (!order.order_id || !order.currency) {
        setError("Could not start checkout.");
        return;
      }

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
    <div
      className={`relative rounded-xl border p-5 ${highlighted ? "border-transparent" : "border-border"}`}
      style={
        // --accent IS the design system's gold CTA color already (see
        // globals.css's own header comment: "Gold... used for chrome/
        // CTAs/active states"), so the highlighted card's gradient border
        // reuses it directly rather than introducing a second gold-ish
        // tone.
        highlighted
          ? {
              backgroundImage: "linear-gradient(var(--surface-raised), var(--surface-raised)), linear-gradient(135deg, var(--accent), var(--accent-dim))",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
              border: "1.5px solid transparent",
            }
          : undefined
      }
    >
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      {highlighted && badge && (
        <span
          className="absolute -top-3 left-5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-dim))" }}
        >
          {badge}
        </span>
      )}
      <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">{PLAN_LABEL[plan.plan] ?? plan.plan}</h3>
      <p className="mt-1 text-3xl font-bold tracking-tight">
        ₹{plan.amount_rupees.toLocaleString("en-IN")}
        <span className="text-sm font-normal text-foreground-muted">/{plan.period_days >= 300 ? "yr" : "mo"}</span>
      </p>
      {savingsNote && <p className="mt-0.5 text-xs font-medium text-up">{savingsNote}</p>}

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

      {promoPreview && !isCurrent && promoPreview.applicable && (
        <p className="animate-pop-in mt-3 rounded-lg bg-up-bg px-3 py-2 text-xs font-medium text-up">
          {promoPreview.discountLabel} — final ₹{promoPreview.finalAmountRupees.toLocaleString("en-IN")}
        </p>
      )}
      {promoPreview && !isCurrent && !promoPreview.applicable && (
        <p className="mt-3 rounded-lg bg-hover px-3 py-2 text-xs font-medium text-foreground-muted">{promoPreview.message}</p>
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
          className="mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
          style={{ background: highlighted ? "linear-gradient(135deg, var(--accent), var(--accent-dim))" : "var(--accent)" }}
        >
          {busy ? "Starting checkout…" : isUpgrade ? "Upgrade to annual" : "Subscribe"}
        </button>
      )}
      {disabled && disabledReason && !isCurrent && <p className="mt-2 text-xs text-foreground-faint">{disabledReason}</p>}
      {error && <p className="mt-2 text-xs text-down">{error}</p>}
    </div>
  );
}
