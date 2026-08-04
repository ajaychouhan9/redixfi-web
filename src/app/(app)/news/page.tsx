"use client";

import { useEffect, useState } from "react";
import { apiGetPaged } from "@/lib/api/client";
import type { NewsItem } from "@/lib/api/types";
import { NewsList } from "@/components/app/NewsList";
import { useAuth } from "@/lib/auth/AuthContext";

const SEVERITIES = ["", "high", "medium", "low", "none"] as const;

export default function NewsPage() {
  const { user, loading: authLoading, getToken } = useAuth();
  const [severity, setSeverity] = useState<string>("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Bug fix (2026-08-04): this call never passed a token, so EVERY visitor —
  // including a logged-in paid/founding subscriber — hit GET /news
  // unauthenticated. The backend correctly defaults an unauthenticated
  // caller to tier="free" and applies the 24h delay (core/auth.py's own
  // documented behavior), so paid users were silently seeing the same
  // delayed feed as free/anonymous ones. Same root cause class as
  // SignalUnlockGate's fix, simpler here since this page was already a
  // client component (no SSR-can't-read-localStorage step) — it just never
  // attached the token it already had available via useAuth(). Waiting on
  // authLoading first (rather than firing once anonymously, then again with
  // a token) avoids a double-fetch/flash of stale data for a returning
  // logged-in user.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const token = await getToken();
      if (cancelled) return;
      apiGetPaged<NewsItem>("/news", { params: { severity: severity || undefined, page, size: 20 }, token })
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
  }, [severity, page, authLoading, getToken]);

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const isFreeOrAnon = !user || user.tier === "free";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-xl font-semibold">News</h1>
      {isFreeOrAnon && (
        <p className="mb-4 rounded-lg border border-amber/30 bg-amber-bg px-3 py-2 text-xs text-amber">
          Free tier sees news on a 24-hour delay.{" "}
          <a href="/pricing" className="font-medium underline">
            Upgrade
          </a>{" "}
          for same-day news.
        </p>
      )}
      <div className="mb-3 flex gap-2">
        {SEVERITIES.map((s) => (
          <button
            key={s || "all"}
            onClick={() => {
              setSeverity(s);
              setPage(1);
            }}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${
              severity === s ? "border-accent bg-accent/10 text-accent" : "border-border text-foreground-muted"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>
      {loading ? <p className="text-sm text-foreground-muted">Loading…</p> : <NewsList items={items} />}
      <div className="mt-4 flex items-center justify-between text-xs text-foreground-muted">
        <span>
          {total.toLocaleString("en-IN")} items · page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded border border-border px-2 py-1 disabled:opacity-40">
            Prev
          </button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded border border-border px-2 py-1 disabled:opacity-40">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
