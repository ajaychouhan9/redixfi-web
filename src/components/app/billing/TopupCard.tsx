"use client";

import { useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { createTopupOrder, validatePromoCode, verifyTopupOrder } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/client";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { ASK_TOPUP_TIERS } from "@/data/plan-features";
import type { AskTopupTierId, PromoValidation } from "@/lib/api/types";

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

// "You save X%" vs. the smallest tier's per-question rate — nice-to-have
// per the task doc, computed here rather than hardcoded so it can't drift
// from ASK_TOPUP_TIERS if pricing changes.
const BASE_RATE = ASK_TOPUP_TIERS[0].priceRupees / ASK_TOPUP_TIERS[0].questions;
function savingsPct(tier: (typeof ASK_TOPUP_TIERS)[number]): number {
  const rate = tier.priceRupees / tier.questions;
  return Math.round((1 - rate / BASE_RATE) * 100);
}

/**
 * Task 20 Part D — Ask-RedixFi topup as a PROACTIVELY purchasable checkout
 * line item, not just the reactive offer that already fires when a paid
 * user hits their cap (Task 17). Same order/verify endpoints, same
 * persistence rules (never expires, survives cancellation) — this is
 * purely a second entry point into the identical purchase flow, not a new
 * product. Only rendered for paid/founding users (caller gates on
 * profile.tier !== "free").
 *
 * Addon-promo extension (2026-08-21) — a promo code input, same "Apply"-
 * then-purchase pattern CheckoutView.tsx already uses for subscriptions.
 * A code is only ever ACTUALLY applied by the backend at order-creation
 * (createTopupOrder's own promo_code param) — this preview never redeems
 * anything by itself, matching /billing/promo-code/validate's own no-
 * side-effects contract.
 *
 * 4-tier structure (2026-09-11, locked with founder) — replaces the old
 * single 50-question/₹99 option with a 4-card picker (ASK_TOPUP_TIERS).
 * Selecting a tier re-validates any entered promo code against THAT
 * tier's id, since a code's `applies_to` scope can differ per tier.
 */
export function TopupCard() {
  const { getToken } = useAuth();
  const [selectedTier, setSelectedTier] = useState<AskTopupTierId>(ASK_TOPUP_TIERS[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasedCount, setPurchasedCount] = useState<number | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoResult, setPromoResult] = useState<PromoValidation | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);

  const tier = ASK_TOPUP_TIERS.find((t) => t.id === selectedTier) ?? ASK_TOPUP_TIERS[0];

  function selectTier(id: AskTopupTierId) {
    setSelectedTier(id);
    // A promo may be scoped to only one tier — clear the stale result so
    // a code that read "valid" against the old tier can't be shown/applied
    // against the newly selected one without re-checking.
    setPromoResult(null);
  }

  async function checkPromo() {
    const code = promoInput.trim();
    if (!code) {
      setPromoResult(null);
      return;
    }
    setPromoChecking(true);
    try {
      setPromoResult(await validatePromoCode(code, tier.id));
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
      const order = await createTopupOrder(token, tier.id, appliedCode);

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
        description: `Ask-RedixFi — ${tier.questions} question topup`,
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
        More Ask-RedixFi questions — never expires, stays usable even if your subscription later lapses.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {ASK_TOPUP_TIERS.map((t) => {
          const save = savingsPct(t);
          const active = t.id === selectedTier;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTier(t.id)}
              className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                active ? "border-accent bg-accent/10" : "border-border bg-surface hover:bg-hover"
              }`}
            >
              <div className="text-sm font-semibold">{t.questions.toLocaleString("en-IN")} questions</div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-xs text-foreground-muted">₹{t.priceRupees}</span>
                {save > 0 && <span className="text-[11px] font-medium text-up">save {save}%</span>}
              </div>
            </button>
          );
        })}
      </div>

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
          {promoResult.valid ? `Code applied — ₹${finalRupees} instead of ₹${tier.priceRupees}.` : promoResult.message}
        </p>
      )}

      <button
        onClick={purchase}
        disabled={busy}
        className="mt-3 w-full rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent disabled:opacity-60"
      >
        {busy
          ? "Starting checkout…"
          : finalRupees != null
            ? `Add ${tier.questions.toLocaleString("en-IN")} questions — ₹${finalRupees}`
            : `Add ${tier.questions.toLocaleString("en-IN")} questions — ₹${tier.priceRupees}`}
      </button>
      {purchasedCount !== null && <p className="mt-2 text-sm text-up">Added — {purchasedCount} questions remaining ✓</p>}
      {error && <p className="mt-2 text-xs text-down">{error}</p>}
    </Card>
  );
}
