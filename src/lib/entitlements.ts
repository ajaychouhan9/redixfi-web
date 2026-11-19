import type { AuthUser } from "@/lib/api/mutations";

/** The existing subscription tiers that resolve to Pro access. */
export function isProEntitled(user: Pick<AuthUser, "tier"> | null | undefined): boolean {
  return user?.tier === "pro" || user?.tier === "founding";
}

/** Basic, Pro, the founding plan and the Pro trial: the plans that may download tables as CSV or Excel. */
export function isPaidEntitled(user: (Pick<AuthUser, "tier"> & { is_pro_trial?: boolean }) | null | undefined): boolean {
  return Boolean(user && (user.tier === "basic" || user.tier === "pro" || user.tier === "founding" || user.is_pro_trial));
}
