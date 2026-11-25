"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

import { AlertCreateButton } from "@/components/app/alerts/AlertCreateButton";
import { CompareIndicator } from "@/components/app/CompareIndicator";
import { ReportActions } from "@/components/app/report/ReportActions";
import { WatchlistButton } from "@/components/app/WatchlistButton";
import { StockExcelButton } from "@/components/app/stock/StockExcelButton";
import { InlineSignup } from "@/components/app/InlineSignup";
import { useAuth } from "@/lib/auth/AuthContext";
import { signupHref } from "@/lib/nav-items";

const BTN = "flex items-center gap-1 rounded-lg border border-border bg-hover px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground";

/**
 * The personal buttons on the stock page: Watchlist, Alert, Compare, Excel, PDF and Share. The page around them is static and the same for
 * everyone, so who is looking is decided here in the browser. A logged-out visitor who taps Watchlist or Set alert is sent to sign-up and
 * returns to this page afterwards.
 */
export function StockActions({ symbol, companyName }: { symbol: string; companyName: string }) {
  const { user, loading } = useAuth();
  const pathname = usePathname() || `/stocks/${encodeURIComponent(symbol)}`;
  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2" data-testid="stock-actions">
      <WatchlistButton symbol={symbol} />
      {user ? (
        <AlertCreateButton symbol={symbol} />
      ) : (
        !loading && (
          <Link href={signupHref(pathname)} className={BTN} data-testid="alert-signup">
            <Bell size={12} aria-hidden /> Set alert
          </Link>
        )
      )}
      <CompareIndicator symbol={symbol} companyName={companyName} />
      <StockExcelButton symbol={symbol} />
      <ReportActions symbol={symbol} />
      <InlineSignup className="basis-full" text="Sign up free to save this stock, set alerts and export." />
    </div>
  );
}
