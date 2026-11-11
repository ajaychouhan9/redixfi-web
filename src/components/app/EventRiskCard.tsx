"use client";

import Link from "next/link";
import { Newspaper } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatShortDate } from "@/lib/format";
import { useAuth } from "@/lib/auth/AuthContext";
import { getNews } from "@/lib/api/endpoints";
import { sourceName } from "@/lib/news-source";
import type { NewsItem, NewsToday } from "@/lib/api/types";

/**
 * "Today's news: N headlines read", the headlines grouped by category with date and source (11 Nov 2026). No severity, flag or ribbon:
 * only what was read and what it was. The Home page is a Server Component and cannot read the browser's token, so it passes `initialItems`
 * (the anonymous feed, which for a free plan is delayed 24h); a signed-in visitor gets their own feed once the token resolves.
 */
export function EventRiskCard({
  newsToday,
  initialItems = null,
}: {
  newsToday: NewsToday | null;
  initialItems?: NewsItem[] | null;
}) {
  const { getToken } = useAuth();
  const [items, setItems] = useState<NewsItem[] | null>(initialItems);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token && items !== null) return;
      try {
        const env = await getNews({ size: 30 }, { token });
        if (!cancelled) setItems(env.data);
      } catch {
        if (!cancelled) setItems((prev) => prev ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken]);

  const since = newsToday?.session_date ?? null;
  const shown = (items ?? []).filter((n) => !since || n.published_at.slice(0, 10) >= since);
  const groups = new Map<string, NewsItem[]>();
  for (const n of shown) {
    const key = n.category && n.category !== "none" ? n.category.replace(/_/g, " ") : "other news";
    groups.set(key, [...(groups.get(key) ?? []), n]);
  }
  const read = newsToday?.items_read;
  return (
    <Card title={typeof read === "number" ? `Today’s news: ${read} headline${read === 1 ? "" : "s"} read` : "Today’s news"}>
      {since && <p className="mb-2 text-xs text-foreground-muted">Session of {formatShortDate(since)}.</p>}
      {items === null ? (
        <p className="text-sm text-foreground-faint">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-foreground-faint">No headlines to list for this session yet (free plans see news after a delay).</p>
      ) : (
        <div className="space-y-3">
          {[...groups.entries()].slice(0, 4).map(([category, rows]) => (
            <div key={category}>
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">{category}</h3>
              <ul className="space-y-1.5">
                {rows.slice(0, 2).map((n) => (
                  <li key={n.uuid} className="text-sm">
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{n.headline}</a>
                    <span className="block text-[11px] text-foreground-faint">{formatShortDate(n.published_at)} · {sourceName(n.source)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-1 border-t border-border pt-3">
        <Newspaper size={12} className="text-accent" />
        <Link href="/news" className="text-xs font-medium text-accent">
          See all news
        </Link>
      </div>
    </Card>
  );
}
