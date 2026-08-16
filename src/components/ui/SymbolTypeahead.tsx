"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchResearch } from "@/lib/api/endpoints";
import type { ResearchSearchRow } from "@/lib/api/types";

/**
 * Shared symbol/company typeahead (BUG 4 fix, 2026-08-16) — extracted
 * from HeaderSearch.tsx (the header's global search box, built earlier
 * the same session) so its debounced GET /research/search lookup +
 * dropdown behavior is genuinely reused, not re-implemented, by any
 * other symbol-filter input in the app. HeaderSearch itself now renders
 * through this component; behavior/styling there is unchanged. The
 * Market Activity hub's symbol filter (MarketActivityHub.tsx) is the
 * first other caller.
 */
export function SymbolTypeahead({
  value,
  onChange,
  onSelect,
  placeholder = "Search stocks, sectors, news...",
  ariaLabel,
  inputClassName,
  wrapperClassName = "relative",
  showIcon = true,
  minChars = 2,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (row: ResearchSearchRow) => void;
  placeholder?: string;
  ariaLabel?: string;
  inputClassName?: string;
  wrapperClassName?: string;
  showIcon?: boolean;
  minChars?: number;
}) {
  const [results, setResults] = useState<ResearchSearchRow[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim().length < minChars) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(() => {
      searchResearch(value.trim(), 8).then((env) => !cancelled && setResults(env.data));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [value, minChars]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(row: ResearchSearchRow) {
    setResults([]);
    setOpen(false);
    onSelect(row);
  }

  return (
    <div ref={rootRef} className={wrapperClassName}>
      {showIcon && (
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-faint" />
      )}
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && results[0] && select(results[0])}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className={inputClassName}
      />
      {open && value.trim().length >= minChars && results.length > 0 && (
        <ul className="absolute left-0 top-full z-30 mt-1 w-full min-w-[260px] divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-raised shadow-lg">
          {results.map((r) => (
            <li key={r.canonicalSymbol}>
              <button
                onClick={() => select(r)}
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
      {open && value.trim().length >= minChars && results.length === 0 && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-foreground-faint shadow-lg">
          No stocks matched &ldquo;{value}&rdquo;.
        </div>
      )}
    </div>
  );
}
