"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Home, BarChart3, Zap, Search, MoreHorizontal, User, CreditCard, Bookmark } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/signals", label: "Signals", icon: BarChart3 },
  { href: "/intraday", label: "Intraday", icon: Zap },
  { href: "/research", label: "Research", icon: Search },
  { href: "/more", label: "More", icon: MoreHorizontal },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-dim))" }}
        >
          <Zap size={15} strokeWidth={2.5} color="var(--accent-foreground)" fill="var(--accent-foreground)" />
        </span>
        <span className="font-mono text-lg font-semibold tracking-tight">RedixFi</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-accent/10 text-accent" : "text-foreground-muted hover:bg-hover hover:text-foreground"
              )}
            >
              <item.icon size={17} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <Link
          href="/watchlist"
          className={clsx(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
            isActive(pathname, "/watchlist") ? "text-accent" : "text-foreground-muted hover:bg-hover hover:text-foreground"
          )}
        >
          <Bookmark size={16} strokeWidth={2} />
          Watchlist
        </Link>
        {user ? (
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground-muted hover:bg-hover hover:text-foreground"
          >
            <User size={16} strokeWidth={2} />
            {user.tier === "free" ? "Account · Free" : `Account · ${user.tier}`}
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground"
          >
            Log in
          </Link>
        )}
        <Link
          href="/pricing"
          className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground-muted hover:bg-hover hover:text-foreground"
        >
          <CreditCard size={16} strokeWidth={2} />
          Checkout
        </Link>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t border-border bg-surface-raised md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx("flex flex-1 flex-col items-center gap-0.5 text-[11px] font-medium", active ? "text-accent" : "text-foreground-faint")}
          >
            <item.icon size={19} strokeWidth={active ? 2.4 : 2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
