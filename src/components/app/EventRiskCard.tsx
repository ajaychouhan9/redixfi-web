"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { AiLabel } from "@/components/ui/AiLabel";
import { formatTimeIst } from "@/lib/format";
import { useAuth } from "@/lib/auth/AuthContext";
import { getNews } from "@/lib/api/endpoints";
import type { NewsItem, NewsToday } from "@/lib/api/types";

const SEVERITY_TONE = { high: "down", medium: "amber", low: "neutral", none: "neutral" } as const;

/**
 * Client component, not server-fetched from the Home page (deliberately):
 * /news applies a 24h delay to free/anonymous callers (B8). This page is a
 * Server Component and can't read the browser's localStorage-held auth
 * token, so a plain SSR fetch here would silently show every visitor —
 * including paid/founding subscribers — the stale, delayed feed. That's
 * the exact bug class already found twice on this project (News page,
 * Intraday Events tab: both forgot to attach the caller's token). Fixed
 * here the same way those were: fetch client-side, after AuthContext has
 * resolved a real token when one exists.
 */
export function EventRiskCard({ newsToday }: { newsToday: NewsToday | null }) {
  const { getToken } = useAuth();
  const [items, setItems] = useState<NewsItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      try {
        const env = await getNews({ severity: "high", size: 3 }, { token });
        if (!cancelled) setItems(env.data);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return (
    <Card title="Event Risk Today" action={<AiLabel />}>
      {newsToday && (
        <p className="mb-2 text-xs text-foreground-muted">
          AI read {newsToday.items_read} item(s) today — <span className="text-accent">{newsToday.items_flagged} flagged</span>.
        </p>
      )}
      {items === null ? (
        <p className="text-sm text-foreground-faint">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.uuid} className="text-sm">
              <div className="mb-0.5 flex items-center gap-2 text-xs text-foreground-faint">
                <Chip tone={SEVERITY_TONE[(n.severity as keyof typeof SEVERITY_TONE) ?? "none"] ?? "neutral"}>{n.severity}</Chip>
                {n.category !== "none" && <Chip tone="accent">{n.category.replace(/_/g, " ")}</Chip>}
                <span className="font-mono">{formatTimeIst(n.published_at)}</span>
              </div>
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                {n.headline}
              </a>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-foreground-faint">No flagged events right now.</li>}
        </ul>
      )}
      <div className="mt-3 flex items-center gap-1 border-t border-border pt-3">
        <AlertTriangle size={12} className="text-accent" />
        <Link href="/news" className="text-xs font-medium text-accent">
          See all news
        </Link>
      </div>
    </Card>
  );
}
