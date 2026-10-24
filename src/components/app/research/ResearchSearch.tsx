"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { searchResearch } from "@/lib/api/endpoints";
import type { ResearchSearchRow } from "@/lib/api/types";
import { stockPath } from "@/lib/seo/stock-symbol";
import { displayName } from "@/lib/company-name";
import { getRecentlyViewed, type RecentlyViewedEntry } from "@/lib/recently-viewed";
import { getWatchlist } from "@/lib/api/mutations";
import { useAuth } from "@/lib/auth/AuthContext";

export function ResearchSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ResearchSearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, getToken } = useAuth();
  const [recent, setRecent] = useState<RecentlyViewedEntry[]>([]);
  const [watch, setWatch] = useState<string[] | null>(null);

  // the same recently-viewed list the Home "Continue research" card shows, and the user's watchlist
  useEffect(() => {
    setRecent(getRecentlyViewed());
  }, []);
  useEffect(() => {
    if (!user) {
      setWatch(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const w = await getWatchlist(token);
        if (alive) setWatch(w.symbols);
      } catch {
        if (alive) setWatch([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, getToken]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const id = setTimeout(() => {
      searchResearch(q.trim(), 15)
        .then((env) => !cancelled && setResults(env.data))
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q]);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-semibold">Research Pro</h1>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search company name or symbol…"
        className="w-full rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm"
      />
      {loading && <p className="mt-3 text-sm text-foreground-muted">Searching…</p>}
      {!loading && results.length > 0 && (
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {results.map((r) => (
            <li key={r.canonicalSymbol}>
              <Link href={stockPath("/research", r.canonicalSymbol)} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-bg">
                <span>
                  <span className="font-medium">{r.canonicalSymbol}</span>{" "}
                  <span className="text-foreground-faint">{displayName(r.company_name)}</span>
                </span>
                <span className="text-xs text-foreground-faint">{r.sector_index}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!loading && q.trim().length >= 2 && results.length === 0 && (
        <p className="mt-3 text-sm text-foreground-muted">No companies matched &ldquo;{q}&rdquo;.</p>
      )}
      {q.trim().length < 2 && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2" data-testid="research-lists">
          <section aria-labelledby="rv-title">
            <h2 id="rv-title" className="mb-2 text-sm font-semibold">Recently viewed</h2>
            {recent.length === 0 ? (
              <p className="text-sm text-foreground-faint">Stocks you open will appear here.</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {recent.map((item) => (
                  <li key={item.symbol}>
                    <Link href={stockPath("/research", item.symbol)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-neutral-bg">
                      <span className="font-mono font-semibold">{item.symbol}</span>
                      <span className="min-w-0 truncate text-foreground-faint">{displayName(item.company_name)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="wl-title">
            <h2 id="wl-title" className="mb-2 text-sm font-semibold">Your watchlist</h2>
            {!user ? (
              <p className="text-sm text-foreground-faint">Log in to see your watchlist here.</p>
            ) : watch === null ? (
              <p className="text-sm text-foreground-faint">Loading…</p>
            ) : watch.length === 0 ? (
              <p className="text-sm text-foreground-faint">Add stocks to your watchlist to find them here.</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {watch.map((s) => (
                  <li key={s}>
                    <Link href={stockPath("/research", s)} className="flex items-center px-4 py-2.5 text-sm hover:bg-neutral-bg">
                      <span className="font-mono font-semibold">{s}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
