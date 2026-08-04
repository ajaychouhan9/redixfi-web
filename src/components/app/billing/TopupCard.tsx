"use client";

import { useState } from "react";
import Script from "next/script";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { createTopupOrder, verifyTopupOrder } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/client";
import { openRazorpayCheckout } from "@/lib/razorpay";

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

/**
 * Task 20 Part D — Ask-RedixFi topup as a PROACTIVELY purchasable checkout
 * line item, not just the reactive offer that already fires when a paid
 * user hits their cap (Task 17). Same order/verify endpoints, same 50
 * questions/₹99, same persistence rules (never expires, survives
 * cancellation) — this is purely a second entry point into the identical
 * purchase flow, not a new product. Only rendered for paid/founding users
 * (caller gates on profile.tier !== "free").
 */
export function TopupCard() {
  const { getToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasedCount, setPurchasedCount] = useState<number | null>(null);

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
      const order = await createTopupOrder(token);
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
        },
      });
    } catch (e) {
      setError(e instanceof ApiError && e.status === 503 ? "Checkout isn't live in this environment yet." : e instanceof Error ? e.message : "Could not start checkout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Ask-RedixFi topup" action={<Sparkles size={14} className="text-accent" />}>
      <p className="text-sm text-foreground-muted">
        50 more Ask-RedixFi questions for ₹99 — never expires, stays usable even if your subscription later lapses.
      </p>
      <button
        onClick={purchase}
        disabled={busy}
        className="mt-3 rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent disabled:opacity-60"
      >
        {busy ? "Starting checkout…" : "Add 50 questions — ₹99"}
      </button>
      {purchasedCount !== null && <p className="mt-2 text-sm text-up">Added — {purchasedCount} questions remaining ✓</p>}
      {error && <p className="mt-2 text-xs text-down">{error}</p>}
    </Card>
  );
}
