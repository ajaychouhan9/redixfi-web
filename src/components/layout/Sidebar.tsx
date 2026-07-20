"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/lib/auth/AuthContext";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/signals", label: "Signals", icon: "📊" },
  { href: "/intraday", label: "Intraday", icon: "⚡" },
  { href: "/research", label: "Research", icon: "🔎" },
  { href: "/more", label: "More", icon: "⋯" },
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
        <span className="text-lg font-bold text-accent">RedixFi</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
              isActive(pathname, item.href)
                ? "bg-accent/10 text-accent"
                : "text-foreground-muted hover:bg-neutral-bg hover:text-foreground"
            )}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        {user ? (
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground-muted hover:bg-neutral-bg hover:text-foreground"
          >
            <span aria-hidden>👤</span>
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
          className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground-muted hover:bg-neutral-bg hover:text-foreground"
        >
          <span aria-hidden>💳</span>
          Pricing
        </Link>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t border-border bg-surface-raised md:hidden">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(
            "flex flex-1 flex-col items-center gap-0.5 text-[11px] font-medium",
            isActive(pathname, item.href) ? "text-accent" : "text-foreground-muted"
          )}
        >
          <span aria-hidden className="text-base">
            {item.icon}
          </span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
