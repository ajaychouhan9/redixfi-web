import type { AuthUser } from "@/lib/api/mutations";

/** The existing subscription tiers that resolve to Analytics Pro access. */
export function isProEntitled(user: Pick<AuthUser, "tier"> | null | undefined): boolean {
  return user?.tier === "pro" || user?.tier === "founding";
}
