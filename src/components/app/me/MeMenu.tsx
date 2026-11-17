"use client";

import Link from "next/link";
import { Bell, Bookmark, CreditCard, Inbox, UserCircle, type LucideIcon } from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import { signupHref } from "@/lib/nav-items";

interface Row {
  href: string;
  label: string;
  note: string;
  icon: LucideIcon;
  /** Needs an account: a logged-out visitor is sent to sign-up and returns here afterwards. */
  personal: boolean;
}

const ROWS: Row[] = [
  { href: "/watchlist", label: "Watchlist", note: "The stocks you follow", icon: Bookmark, personal: true },
  { href: "/account/alerts", label: "Alerts", note: "Price, delivery and volume alerts", icon: Bell, personal: true },
  { href: "/account/inbox", label: "Inbox", note: "Your alert messages", icon: Inbox, personal: true },
  { href: "/account", label: "Account", note: "Your details and plan", icon: UserCircle, personal: true },
  { href: "/pricing", label: "Checkout", note: "Plans and prices", icon: CreditCard, personal: false },
];

/** The "Me" page (17 Nov 2026): Watchlist, Alerts, Account and Checkout. For a logged-out visitor the personal rows lead to sign-up. */
export function MeMenu() {
  const { user, loading } = useAuth();
  const guest = !loading && !user;
  return (
    <div className="mt-4" data-testid="me-menu">
      {guest && (
        <p className="mb-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
          Watchlist and alerts need a free account. Tap a row to sign up; you come back here afterwards.
        </p>
      )}
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {ROWS.map((r) => (
          <li key={r.href}>
            <Link
              href={guest && r.personal ? signupHref(r.href) : r.href}
              data-testid={`me-row-${r.label.toLowerCase()}`}
              className="flex min-h-[56px] items-center gap-3 px-4 py-3 hover:bg-hover"
            >
              <r.icon size={18} className="shrink-0 text-accent" aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{r.label}</span>
                <span className="block text-xs text-foreground-muted">{r.note}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {guest && (
        <p className="mt-3 text-sm text-foreground-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Log in
          </Link>
        </p>
      )}
    </div>
  );
}
