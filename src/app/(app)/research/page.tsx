"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api/client";
import type { ResearchSearchRow } from "@/lib/api/types";

export default function ResearchSearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ResearchSearchRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const id = setTimeout(() => {
      apiGet<ResearchSearchRow[]>("/research/search", { params: { q: q.trim(), limit: 15 } })
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
              <Link href={`/research/${r.canonicalSymbol}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-bg">
                <span>
                  <span className="font-medium">{r.canonicalSymbol}</span>{" "}
                  <span className="text-foreground-faint">{r.company_name}</span>
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
    </div>
  );
}
