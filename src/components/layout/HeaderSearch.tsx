"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { searchResearch } from "@/lib/api/endpoints";
import type { ResearchSearchRow } from "@/lib/api/types";

/**
 * Header global search — reuses the same `searchResearch()` typeahead the
 * standalone /research search page and AskRedixFi's symbol picker already
 * call (GET /research/search, company-name/symbol match). Not a new search
 * backend: the task named "the Signals page's search" as the reuse target,
 * but that page's own `q` state only filters its already-loaded local
 * table (see SignalsExplorer.tsx) — it isn't a shared/exported function and
 * has no typeahead-to-navigate shape. `searchResearch` is the actual
 * cross-page symbol/company lookup already doing that job elsewhere, so
 * this reuses THAT, not a duplicate.
 */
export function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ResearchSearchRow[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(() => {
      searchResearch(q.trim(), 8).then((env) => !cancelled && setResults(env.data));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(symbol: string) {
    setQ("");
    setResults([]);
    setOpen(false);
    router.push(`/research/${symbol}`);
  }

  return (
    // Mobile/tablet-header-overlap fix (2026-08-16): this box's own
    // max-width used to jump straight to max-w-xs (320px) the instant it
    // appears at md (768px) — exactly where MarketRibbon has the LEAST
    // spare room (the w-56 logo section reappears at the same breakpoint,
    // and the icon cluster on the right doesn't shrink), so the search
    // box's un-shrinkable width was a real contributor to the row not
    // fitting and wrapping onto a second line that then overlapped <main>
    // (see MarketRibbon.tsx's own fixed h-16 vs. flex-wrap comment for why
    // a wrapped row overlaps rather than pushing content down). Narrower
    // at md, full max-w-xs only from lg (1024px) up where there's
    // genuinely enough room.
    <div ref={rootRef} className="relative hidden w-full min-w-0 max-w-[160px] md:block lg:max-w-xs">
      <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-faint" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && results[0] && select(results[0].canonicalSymbol)}
        placeholder="Search stocks, sectors, news..."
        aria-label="Search stocks, sectors, news"
        // Font-size fix (2026-08-11): was text-xs (12px), task wants 14px.
        className="w-full rounded-lg border border-border bg-hover py-1.5 pl-8 pr-3 text-sm outline-none focus:border-accent"
      />
      {open && q.trim().length >= 2 && results.length > 0 && (
        <ul className="absolute left-0 top-full z-30 mt-1 w-full min-w-[260px] divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-raised shadow-lg">
          {results.map((r) => (
            <li key={r.canonicalSymbol}>
              <button
                onClick={() => select(r.canonicalSymbol)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-hover"
              >
                <span>
                  <span className="font-semibold">{r.canonicalSymbol}</span>{" "}
                  <span className="text-foreground-faint">{r.company_name}</span>
                </span>
                <span className="shrink-0 text-foreground-faint">{r.sector_index}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && q.trim().length >= 2 && results.length === 0 && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-foreground-faint shadow-lg">
          No stocks matched &ldquo;{q}&rdquo;.
        </div>
      )}
    </div>
  );
}
