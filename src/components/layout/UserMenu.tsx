"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, Bookmark, CreditCard } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

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

export function UserMenu() {
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
        className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-[10px] font-semibold"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-dim))", color: "var(--accent-foreground)" }}
      >
        {initialsFor(user.name, user.email)}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-52 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-lg">
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-medium">{user.name || user.email || user.phone || "Your account"}</p>
            <p className="mt-0.5 text-xs text-foreground-faint">{TIER_LABEL[user.tier] ?? user.tier} plan</p>
          </div>
          <nav className="p-1.5 text-sm">
            <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-2.5 py-2 text-foreground-muted hover:bg-hover hover:text-foreground">
              <UserIcon size={14} /> Account
            </Link>
            <Link href="/watchlist" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-2.5 py-2 text-foreground-muted hover:bg-hover hover:text-foreground">
              <Bookmark size={14} /> Watchlist
            </Link>
            <Link href="/pricing" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-2.5 py-2 text-foreground-muted hover:bg-hover hover:text-foreground">
              <CreditCard size={14} /> {user.tier === "pro" || user.tier === "founding" ? "Manage plan" : "Upgrade plan"}
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
