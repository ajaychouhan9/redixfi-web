"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Bookmark, CreditCard, LogOut, UserCircle, type LucideIcon } from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import { ACCOUNT_ITEMS, signupHref } from "@/lib/nav-items";
import { ThemeChoice, ThemeToggle } from "@/components/ui/ThemeToggle";

const ICON: Record<string, LucideIcon> = { profile: UserCircle, watchlist: Bookmark, alerts: Bell, billing: CreditCard };
const TIER_LABEL: Record<string, string> = { free: "Free", basic: "Basic", pro: "Pro", paid: "Paid", founding: "Founding" };

/** "AC"-style initials from the logged-in user: name first, the start of the email as a fallback. */
export function initialsFor(name: string | null, email: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "U";
}

/**
 * The account menu (18 Nov 2026): Profile and plan, Watchlist, Alerts, Billing, Log out. A logged-out visitor sees Log in and Create account.
 * One component, used by the header's profile circle and by the phone bottom bar's Account button.
 */
export function AccountPanel({ onClose, className }: { onClose: () => void; className: string }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const row = "flex min-h-[44px] w-full items-center gap-3 rounded-md px-3 text-left text-sm text-foreground-muted hover:bg-hover hover:text-foreground";
  return (
    <div role="menu" data-testid="account-menu-panel" className={className}>
      {user ? (
        <>
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-medium">{user.name || user.email || user.phone || "Your account"}</p>
            <p className="mt-0.5 text-xs text-foreground-faint">{user.is_pro_trial ? "Pro Trial" : `${TIER_LABEL[user.tier] ?? user.tier} plan`}</p>
          </div>
          <nav className="p-1.5">
            {ACCOUNT_ITEMS.map((it) => {
              const Icon = ICON[it.id];
              return (
                <Link key={it.id} href={it.href} role="menuitem" onClick={onClose} className={row} data-testid={`account-${it.id}`}>
                  <Icon size={16} className="shrink-0 text-accent" aria-hidden />
                  {it.label}
                </Link>
              );
            })}
            <div className="mt-1 border-t border-border pt-2">
              <p className="px-3 pb-1 text-xs text-foreground-faint">Theme</p>
              <ThemeChoice />
            </div>
            <div className="border-t border-border pt-1">
              <button
                type="button"
                role="menuitem"
                data-testid="account-logout"
                onClick={() => {
                  onClose();
                  logout();
                  router.push("/");
                }}
                className={row}
              >
                <LogOut size={16} className="shrink-0" aria-hidden /> Log out
              </button>
            </div>
          </nav>
        </>
      ) : (
        <nav className="p-1.5">
          <p className="px-3 py-2 text-xs text-foreground-muted">Log in to use your watchlist and alerts.</p>
          <Link href="/login" role="menuitem" onClick={onClose} className={`${row} font-semibold text-foreground`} data-testid="account-login">
            <UserCircle size={16} className="shrink-0 text-accent" aria-hidden /> Log in
          </Link>
          <Link href={signupHref("/")} role="menuitem" onClick={onClose} className={row} data-testid="account-signup">
            <Bookmark size={16} className="shrink-0 text-accent" aria-hidden /> Create a free account
          </Link>
          <Link href="/pricing" role="menuitem" onClick={onClose} className={row}>
            <CreditCard size={16} className="shrink-0 text-accent" aria-hidden /> Billing and plans
          </Link>
          <div className="mt-1 border-t border-border pt-2">
            <p className="px-3 pb-1 text-xs text-foreground-faint">Theme</p>
            <ThemeChoice />
          </div>
        </nav>
      )}
    </div>
  );
}

/** Close on an outside press or Escape. */
export function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

/** The header's right end: the profile circle with the account menu, or a Log in button. */
export function UserMenu() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Link href="/login" data-testid="header-login" className="flex min-h-[44px] items-center rounded-md bg-accent px-3 text-xs font-semibold text-accent-foreground md:min-h-0 md:py-1.5">
          Log in
        </Link>
      </div>
    );
  }
  return (
    <div ref={ref} className="relative" data-testid="header-menu">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="header-menu-button"
        className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-hover md:h-9 md:w-9"
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full font-mono text-[11px] font-semibold"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-dim))", color: "var(--accent-foreground)" }}
        >
          {initialsFor(user.name, user.email)}
        </span>
      </button>
      {open && (
        <AccountPanel
          onClose={() => setOpen(false)}
          className="absolute right-0 top-full z-50 mt-1.5 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-surface-raised shadow-lg"
        />
      )}
    </div>
  );
}
