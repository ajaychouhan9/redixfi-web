"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/lib/auth/AuthContext";
import { signupHref } from "@/lib/nav-items";
import { track } from "@/lib/analytics";

/**
 * A small inline sign-up line at a moment of value (26 Nov 2026): under the buttons that need an account, under the concall summary, beside "Save this screen".
 * Not a popup and never in the way: it hides for a signed-in visitor (and while the sign-in state is still loading), and the page it sits on is fully
 * readable without it. The link returns the visitor to the same page after sign-up.
 */
export function InlineSignup({ text, action = "Sign up free", className = "" }: { text: string; action?: string; className?: string }) {
  const { user, loading } = useAuth();
  const pathname = usePathname() || "/";
  if (user || loading) return null;
  return (
    <p className={`text-[13px] leading-snug text-foreground-muted ${className}`} data-testid="inline-signup">
      {text}{" "}
      <Link prefetch={false} href={signupHref(pathname)} onClick={() => track("trial_cta_click", { page: "inline" })} className="inline-flex min-h-[44px] items-center font-bold text-accent underline">
        {action}
      </Link>
    </p>
  );
}
