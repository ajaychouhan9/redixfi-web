"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AskRedixFiTrigger } from "@/components/app/ask/AskRedixFi";
import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { UserMenu } from "@/components/layout/UserMenu";
import { RedixFiLogo } from "@/components/brand/RedixFiLogo";

/**
 * The header on every page (17 Nov 2026): logo, search, the Ask AI button and the profile menu (or "Log in"). It carries no market figures and
 * makes no request of its own: the Nifty, the feed status and the inbox bell that used to sit here moved to Home, Market today and the Me menu.
 * It still publishes its real height as --header-height (the sidebar and the content column read it), whatever the zoom or the wrapping.
 * Ask AI appears in this header and in the stock page's Ask AI tab, and as a menu item that opens the same panel.
 */
export function MarketRibbon() {
  const ribbonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ribbonRef.current;
    if (!el) return;
    const root = document.documentElement;
    const setHeight = () => root.style.setProperty("--header-height", `${el.offsetHeight}px`);
    setHeight();
    const observer = new ResizeObserver(setHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ribbonRef}
      data-testid="app-header"
      className="relative z-40 flex min-h-16 w-full items-center border-b border-border bg-surface md:fixed md:inset-x-0 md:top-0"
    >
      <Link href="/" aria-label="RedixFi home" className="flex w-12 shrink-0 items-center justify-center border-r border-border self-stretch px-2 md:w-56 md:justify-start md:px-4">
        <span className="md:hidden">
          <RedixFiLogo variant="symbol" size={20} />
        </span>
        <span className="hidden md:block">
          <RedixFiLogo variant="full" />
        </span>
      </Link>

      <div className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 sm:gap-3 sm:px-6">
        <div className="min-w-0 flex-1 md:max-w-sm">
          <HeaderSearch />
        </div>
        <AskRedixFiTrigger />
        <UserMenu />
      </div>
    </div>
  );
}
