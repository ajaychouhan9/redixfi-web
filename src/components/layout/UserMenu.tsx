"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, Bookmark, CreditCard, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { NAV_MOBILE_LAYOUT } from "@/lib/nav-config";
import { MENU_GROUPS } from "@/lib/more-links";
import { InstallRow } from "@/components/app/pwa/InstallRow";

const TIER_LABEL: Record<string, string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
  paid: "Paid",
  founding: "Founding",
};

/** "AC"-style initials from the real logged-in user — name first, email
 * local-part as a fallback (phone-only accounts have neither at signup). */
function initialsFor(name: string | null, email: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "U";
}

/** Layout C: the header menu that replaces the More tab. Logged in it is the avatar; logged out it is a More button next to Log in, so the
 *  About, Methodology and Disclaimer pages stay reachable without an account. Every row is at least 44px tall. */
function MenuC() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Below md the header wraps onto several rows, so the button can sit anywhere in it: the panel is then placed under the button and against the
  // right edge of the screen (position: fixed), never relative to the button. From md up the header is one row and the panel hangs under the button.
  const [top, setTop] = useState(64);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const groups = MENU_GROUPS;                           // the same rows logged in or out: every page that was in More stays reachable
  const row = "flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm text-foreground-muted hover:bg-hover hover:text-foreground";
  return (
    <div ref={rootRef} className="relative flex items-center gap-1" data-testid="header-menu">
      {!user && (
        <Link href="/login" className="flex min-h-[44px] items-center rounded-md bg-accent px-3 text-xs font-semibold text-accent-foreground md:min-h-0 md:py-1.5">
          Log in
        </Link>
      )}
      <button
        ref={buttonRef}
        onClick={() => {
          const r = buttonRef.current?.getBoundingClientRect();
          if (r) setTop(Math.round(r.bottom + 6));
          setOpen((o) => !o);
        }}
        aria-label={user ? "Account menu" : "More options"}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="header-menu-button"
        className={`flex h-11 w-11 items-center justify-center rounded-md hover:bg-hover md:h-8 md:w-8 ${user ? "" : "md:hidden"}`}
      >
        {user ? (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] font-semibold"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-dim))", color: "var(--accent-foreground)" }}
          >
            {initialsFor(user.name, user.email)}
          </span>
        ) : (
          <MoreHorizontal size={18} />
        )}
      </button>

      {open && (
        <div
          role="menu"
          data-testid="header-menu-panel"
          style={{ "--menu-top": `${top}px` } as React.CSSProperties}
          className="fixed right-4 top-[var(--menu-top)] z-50 max-h-[calc(100dvh-var(--menu-top)-4.5rem)] w-[min(19rem,calc(100vw-2rem))] overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-surface-raised shadow-lg md:absolute md:right-0 md:top-full md:mt-1.5 md:max-h-[calc(100vh-6rem)]"
        >
          {user && (
            <div className="border-b border-border px-3 py-2.5">
              <p className="truncate text-sm font-medium">{user.name || user.email || user.phone || "Your account"}</p>
              <p className="mt-0.5 text-xs text-foreground-faint">{user.is_pro_trial ? "Pro Trial" : `${TIER_LABEL[user.tier] ?? user.tier} plan`}</p>
            </div>
          )}
          <nav className="p-1.5">
            {groups.map((g) => (
              <div key={g.title} className="pb-1">
                <p className="px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-foreground-faint">{g.title}</p>
                {g.links.map((l) => (
                  <Link key={l.href} href={l.href} role="menuitem" onClick={() => setOpen(false)} className={row}>
                    <l.icon size={16} className="shrink-0 text-accent" aria-hidden />
                    <span className="min-w-0">{l.label}</span>
                  </Link>
                ))}
              </div>
            ))}
            <ul className="px-3">
              <InstallRow />
            </ul>
            <div className="border-t border-border pt-1">
              {user ? (
                <button
                  onClick={() => {
                    setOpen(false);
                    logout();
                    router.push("/");
                  }}
                  role="menuitem"
                  className={`${row} w-full text-left`}
                >
                  <LogOut size={16} className="shrink-0" aria-hidden /> Log out
                </button>
              ) : (
                <Link href="/login" role="menuitem" onClick={() => setOpen(false)} className={`${row} font-semibold text-foreground`}>
                  <UserIcon size={16} className="shrink-0" aria-hidden /> Log in
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}

export function UserMenu() {
  return NAV_MOBILE_LAYOUT === "C" ? <MenuC /> : <MenuAB />;
}

function MenuAB() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!user) {
    return (
      <Link href="/login" className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
        Log in
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] font-semibold"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-dim))", color: "var(--accent-foreground)" }}
      >
        {initialsFor(user.name, user.email)}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-52 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-lg">
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-medium">{user.name || user.email || user.phone || "Your account"}</p>
            <p className="mt-0.5 text-xs text-foreground-faint">
              {user.is_pro_trial ? "Pro Trial" : `${TIER_LABEL[user.tier] ?? user.tier} plan`}
            </p>
          </div>
          <nav className="p-1.5 text-sm">
            <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-2.5 py-2 text-foreground-muted hover:bg-hover hover:text-foreground">
              <UserIcon size={14} /> Account
            </Link>
            <Link href="/watchlist" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-2.5 py-2 text-foreground-muted hover:bg-hover hover:text-foreground">
              <Bookmark size={14} /> Watchlist
            </Link>
            <Link href="/pricing" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-2.5 py-2 text-foreground-muted hover:bg-hover hover:text-foreground">
              <CreditCard size={14} /> {user.is_pro_trial ? "Upgrade" : user.tier === "pro" || user.tier === "founding" ? "Manage plan" : "Upgrade plan"}
            </Link>
            <button
              onClick={() => {
                setOpen(false);
                logout();
                router.push("/");
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-foreground-muted hover:bg-hover hover:text-foreground"
            >
              <LogOut size={14} /> Log out
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
