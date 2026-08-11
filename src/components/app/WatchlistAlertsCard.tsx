"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { getInboxPage } from "@/lib/api/mutations";
import { formatShortDate } from "@/lib/format";
import type { InboxAlert } from "@/lib/api/types";

/**
 * Home's compact preview of the same real inbox alert_worker.py writes to
 * (B4's 5 triggers) — reuses getInboxPage()/InboxAlert exactly like the
 * full /account/inbox page does, just capped to 3 items. Client-side (needs
 * the logged-in user's token, same as ContinueResearchCard needs
 * localStorage) — renders nothing for anonymous visitors or a user with an
 * empty inbox, same "hide when there's nothing real to show" pattern
 * already used by ContinueResearchCard/HomePricingSection.
 */
export function WatchlistAlertsCard() {
  const { user, getToken } = useAuth();
  const [items, setItems] = useState<InboxAlert[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await getToken();
      if (!token) return;
      const page = await getInboxPage(token, 1, 3);
      setItems(page.data);
    })();
  }, [user, getToken]);

  if (!user || !items || items.length === 0) return null;

  return (
    <Card
      title="Watchlist alerts"
      action={
        <Link href="/account/inbox" className="flex items-center gap-0.5 text-xs font-medium text-accent">
          View all <ChevronRight size={12} />
        </Link>
      }
    >
      <ul className="divide-y divide-border">
        {items.map((i) => {
          const body = (
            <>
              <p className="font-medium">{i.title}</p>
              <p className="text-foreground-muted">{i.body}</p>
              <p className="mt-0.5 text-xs text-foreground-faint">{formatShortDate(i.created_at)}</p>
            </>
          );
          // Only signal_delta/news_watchlist/behavior_state alerts carry a
          // real symbol (users_repo.py::push_inbox_alert) — daily_brief and
          // news_market alerts are market-level, no single stock to link to.
          return (
            <li key={i.alert_id} className={i.read ? "opacity-60" : undefined}>
              {i.symbol ? (
                <Link href={`/signals/${i.symbol}`} className="block py-2.5 text-sm transition-colors hover:text-accent">
                  {body}
                </Link>
              ) : (
                <div className="py-2.5 text-sm">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
