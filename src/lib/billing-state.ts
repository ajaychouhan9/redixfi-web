import { formatDateSafe } from "@/lib/format";

/**
 * One paid plan at a time (15 Nov 2026). While a paid plan is running the pricing page shows where the user stands instead of Subscribe/Pay buttons.
 * Mirrors the API rule in routers/billing.py: no new order while a paid plan runs; the only exception is renewing the SAME plan in the
 * last RENEW_WINDOW_DAYS days before it ends. Changing plans (for example Basic -> Pro) goes through support for now.
 */
export const RENEW_WINDOW_DAYS = 7;
export const SUPPORT_EMAIL = "support@redixfi.com";

// Retired ids are kept so an old subscription still gets a readable label.
export const PLAN_LABEL: Record<string, string> = {
  basic_249: "Basic",
  pro_399: "Pro",
  basic_annual_1499: "Basic Yearly",
  pro_annual_2499: "Pro Yearly",
  basic_annual_2399: "Basic Annual",
  pro_annual_3999: "Pro Annual",
  monthly_249: "Pro",
  annual_2499: "Annual",
  founding_1799: "Founding Annual",
};

const DAY_MS = 86_400_000;

export interface RunningPlan {
  plan: string;
  label: string;
  tier: "basic" | "pro" | "other";
  until: Date;
  /** True from RENEW_WINDOW_DAYS before the end: the same plan can be renewed. */
  renewOpen: boolean;
  renewOpensOn: Date;
}

/** The user's paid plan if its period has not ended yet, else null (Free, a trial, an ended plan, or an account with no stored plan). */
export function runningPlan(
  profile: { tier?: string | null; subscription?: { plan: string | null; renews: string | null; status?: string | null } | null } | null | undefined,
  now: Date = new Date(),
): RunningPlan | null {
  const sub = profile?.subscription;
  if (!profile || !sub || !sub.plan || !sub.renews || sub.status === "none") return null;
  if ((profile.tier ?? "free") === "free") return null;
  const until = new Date(sub.renews);
  if (Number.isNaN(until.getTime()) || until.getTime() <= now.getTime()) return null;
  const tier = sub.plan.startsWith("basic") ? "basic" : sub.plan.startsWith("pro") ? "pro" : "other";
  return {
    plan: sub.plan,
    label: PLAN_LABEL[sub.plan] ?? sub.plan,
    tier,
    until,
    renewOpen: until.getTime() - now.getTime() <= RENEW_WINDOW_DAYS * DAY_MS,
    renewOpensOn: new Date(until.getTime() - RENEW_WINDOW_DAYS * DAY_MS),
  };
}

const day = (d: Date) => formatDateSafe(d.toISOString());

/** Text shown on a plan card INSTEAD of the Subscribe/Pay button, or null when the card keeps its button (no running plan, or the renewal window of that same plan). */
export function cardNotice(running: RunningPlan | null, cardPlanId: string): string | null {
  if (!running) return null;
  const head = `You are on ${running.label} until ${day(running.until)}.`;
  if (cardPlanId === running.plan) {
    return running.renewOpen ? null : `${head} Renewal opens on ${day(running.renewOpensOn)}, ${RENEW_WINDOW_DAYS} days before it ends.`;
  }
  if (running.tier === "basic" && cardPlanId.startsWith("pro")) {
    return `${head} To move from Basic to Pro, write to ${SUPPORT_EMAIL}.`;
  }
  return `${head} A new plan can be started once it ends. To change plans sooner, write to ${SUPPORT_EMAIL}.`;
}

/** "Renew" on the card of the running plan, only inside the renewal window. */
export function cardButtonLabel(running: RunningPlan | null, cardPlanId: string): string | undefined {
  return running && cardPlanId === running.plan && running.renewOpen ? "Renew" : undefined;
}

/**
 * A friendly message for the API's refusals when a new order is not allowed, or null for any other error.
 * PLAN_ALREADY_ACTIVE carries its own message; the older `duplicate_recent_payment` is a plain string.
 */
export function orderRefusalMessage(e: unknown): string | null {
  const err = e as { status?: number; detail?: unknown } | null;
  if (!err || err.status !== 409) return null;
  const outer = err.detail as { detail?: unknown } | string | null | undefined;
  const inner = typeof outer === "object" && outer ? outer.detail : outer;
  if (inner && typeof inner === "object" && (inner as { code?: string }).code === "PLAN_ALREADY_ACTIVE") {
    const m = (inner as { message?: unknown }).message;
    return typeof m === "string" && m ? m : `A plan is already running. To change plans, write to ${SUPPORT_EMAIL}.`;
  }
  if (inner === "duplicate_recent_payment") {
    return "This plan was paid for a moment ago. Check your plan status before paying again.";
  }
  return null;
}
