"use client";

import { useState } from "react";
import Script from "next/script";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { createTopupOrder, validatePromoCode, verifyTopupOrder } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/client";
import { openRazorpayCheckout } from "@/lib/razorpay";
import type { PromoValidation } from "@/lib/api/types";

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

// Addon-promo extension (2026-08-21) — the product id routers/ask.py::
// ASK_TOPUP_PRODUCT / routers/billing.py::_base_amount_paise_for both use
// for this exact purchase; passed as `plan` to the shared /billing/
// promo-code/validate endpoint (CheckoutView.tsx's own preview pattern,
// reused here rather than a second validate request shape).
const TOPUP_PRODUCT_ID = "ask_topup_50";

/**
 * Task 20 Part D — Ask-RedixFi topup as a PROACTIVELY purchasable checkout
 * line item, not just the reactive offer that already fires when a paid
 * user hits their cap (Task 17). Same order/verify endpoints, same 50
 * questions/₹99, same persistence rules (never expires, survives
 * cancellation) — this is purely a second entry point into the identical
 * purchase flow, not a new product. Only rendered for paid/founding users
 * (caller gates on profile.tier !== "free").
 *
 * Addon-promo extension (2026-08-21) — a promo code input, same "Apply"-
 * then-purchase pattern CheckoutView.tsx already uses for subscriptions.
 * A code is only ever ACTUALLY applied by the backend at order-creation
 * (createTopupOrder's own promo_code param) — this preview never redeems
 * anything by itself, matching /billing/promo-code/validate's own no-
 * side-effects contract.
 */
export function TopupCard() {
  const { getToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasedCount, setPurchasedCount] = useState<number | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoResult, setPromoResult] = useState<PromoValidation | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);

  async function checkPromo() {
    const code = promoInput.trim();
    if (!code) {
      setPromoResult(null);
      return;
    }
    setPromoChecking(true);
    try {
      setPromoResult(await validatePromoCode(code, TOPUP_PRODUCT_ID));
    } finally {
      setPromoChecking(false);
    }
  }

  async function purchase() {
    if (!RAZORPAY_KEY) {
      setError("Payments are not configured.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) return;
      const appliedCode = promoResult?.valid ? promoInput.trim() : undefined;
      const order = await createTopupOrder(token, appliedCode);

      // 100%-off (or near-enough) promo bypass — same Razorpay-skip
      // pattern PlanCard.tsx already handles for BillingOrder.
      // free_checkout, applied here to TopupOrder's own shape.
      if (order.free_checkout) {
        setPurchasedCount(order.topup_questions_remaining ?? null);
        setPromoInput("");
        setPromoResult(null);
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
        description: "Ask-RedixFi — 50 question topup",
        theme: { color: "#2f5ce0" },
        handler: async (resp) => {
          const token2 = await getToken();
          if (!token2) return;
          const result = await verifyTopupOrder(token2, {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          setPurchasedCount(result.topup_questions_remaining);
          setPromoInput("");
          setPromoResult(null);
        },
      });
    } catch (e) {
      setError(e instanceof ApiError && e.status === 503 ? "Checkout isn't live in this environment yet." : e instanceof Error ? e.message : "Could not start checkout.");
    } finally {
      setBusy(false);
    }
  }

  const finalRupees =
    promoResult?.valid && promoResult.final_amount_paise != null ? Math.round(promoResult.final_amount_paise / 100) : null;

  return (
    <Card title="Ask-RedixFi topup" action={<Sparkles size={14} className="text-accent" />}>
      <p className="text-sm text-foreground-muted">
        50 more Ask-RedixFi questions for ₹99 — never expires, stays usable even if your subscription later lapses.
      </p>

      <div className="mt-3 flex gap-2">
        <input
          value={promoInput}
          onChange={(e) => {
            setPromoInput(e.target.value);
            setPromoResult(null);
          }}
          placeholder="Have a code? Enter it here"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none"
        />
        <button
          type="button"
          disabled={promoChecking || !promoInput.trim()}
          onClick={() => checkPromo()}
          className="shrink-0 rounded-lg border border-border bg-hover px-3 py-2 text-xs font-medium disabled:opacity-50"
        >
          {promoChecking ? "Checking…" : "Apply"}
        </button>
      </div>
      {promoResult && (
        <p className={`mt-1.5 flex items-center gap-1.5 text-xs ${promoResult.valid ? "text-up" : "text-down"}`}>
          {promoResult.valid && <CheckCircle2 size={12} className="shrink-0" />}
          {promoResult.valid ? `Code applied — ₹${finalRupees} instead of ₹99.` : promoResult.message}
        </p>
      )}

      <button
        onClick={purchase}
        disabled={busy}
        className="mt-3 rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent disabled:opacity-60"
      >
        {busy ? "Starting checkout…" : finalRupees != null ? `Add 50 questions — ₹${finalRupees}` : "Add 50 questions — ₹99"}
      </button>
      {purchasedCount !== null && <p className="mt-2 text-sm text-up">Added — {purchasedCount} questions remaining ✓</p>}
      {error && <p className="mt-2 text-xs text-down">{error}</p>}
    </Card>
  );
}
