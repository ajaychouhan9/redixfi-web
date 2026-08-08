"use client";

import { useEffect, useState } from "react";
import { getNews } from "@/lib/api/endpoints";
import type { NewsItem } from "@/lib/api/types";
import { NewsList } from "@/components/app/NewsList";
import { AiLabel } from "@/components/ui/AiLabel";
import { useAuth } from "@/lib/auth/AuthContext";

export function EventsTab() {
  const { loading: authLoading, getToken } = useAuth();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Bug fix (2026-08-04): same root cause as app/(app)/news/page.tsx — this
  // call never passed a token, so every viewer (incl. paid/founding) hit
  // GET /news unauthenticated. Worse here specifically: core/routers/news.py
  // deliberately makes the free-tier 24h delay OVERRIDE `today=true` for an
  // unauthenticated caller (task doc: "an absolute delay, not delay-unless-
  // asking-for-today"), so `today: true` was silently a no-op for every
  // visitor to this tab, explaining why it showed yesterday-evening's
  // cutoff instead of today's events regardless of who was logged in.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (cancelled) return;
      getNews({ today: true, intraday: true, size: 30 }, { token })
        .then((env) => {
          if (cancelled) return;
          setItems(env.data);
          setTotal(env.page_info.total);
        })
        .finally(() => !cancelled && setLoading(false));
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, getToken]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <AiLabel />
        <p className="text-xs text-foreground-muted">AI read and classified {total} live event(s) today.</p>
      </div>
      {loading ? <p className="text-sm text-foreground-muted">Loading…</p> : <NewsList items={items} emptyText="No live events flagged yet today." />}
    </div>
  );
}
