"use client";

import { useEffect, useRef, useState } from "react";

import { FIGURES_AS_OF, NAMES_MORE, NAMES_NONE, NAMES_NONE_LEFT, NAMES_SEARCH } from "@/lib/report-flow";

export interface NameItem {
  symbol: string;
  company: string;
}
export type NamesLoader = (q: string, page: number) => Promise<{ items: NameItem[]; total: number }>;
export const NAMES_PAGE = 30;
const PAGE = NAMES_PAGE;

/** A loader returns one page (30 stocks) and the total. This one is over a list that is already in the browser (a saved result): it searches by name or symbol. */
export function staticLoader(list: NameItem[]): NamesLoader {
  return async (q, page) => {
    const t = q.trim().toLowerCase();
    const hit = t ? list.filter((s) => s.symbol.toLowerCase().includes(t) || s.company.toLowerCase().includes(t)) : list;
    return { items: hit.slice((page - 1) * PAGE, page * PAGE), total: hit.length };
  };
}

interface Props {
  title: string;
  /** Changes when the list should be read again (the rule or the step changed). */
  loadKey: string;
  loader: NamesLoader;
  testId?: string;
  /** Names only by default. With `selected` the names have tick boxes. */
  selected?: string[];
  onToggle?: (symbol: string) => void;
  /** Show no more than this many names; the note is then shown instead of Show more (a logged-out visitor sees the first page only). */
  maxItems?: number;
  maxNote?: React.ReactNode;
  /** The date of the figures behind the list ("Figures as of 23 Nov 2026"); every stock list shows it. */
  asOf?: string | null;
  children?: React.ReactNode;
}

/** Names only (no figures), a search box and "Show more". The lists can have hundreds of stocks, so 30 are shown at a time. */
export function StockNames({ title, loadKey, loader, testId = "stock-names", selected, onToggle, maxItems, maxNote, asOf, children }: Props) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<NameItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const seq = useRef(0);

  // a new list (rule or step changed) or a new search starts again from the first page
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [loadKey, q]);

  useEffect(() => {
    const mine = ++seq.current;
    const t = window.setTimeout(async () => {
      setBusy(true);
      try {
        const r = await loader(q, page);
        if (mine !== seq.current) return;
        setItems((prev) => (page === 1 ? r.items : [...prev, ...r.items]));
        setTotal(r.total);
        setError(false);
      } catch {
        if (mine === seq.current) setError(true);
      } finally {
        if (mine === seq.current) setBusy(false);
      }
    }, q && page === 1 ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [q, page, loadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const capped = maxItems !== undefined && items.length >= maxItems && total !== null && total > items.length;
  const more = total !== null && items.length < total && !capped;
  return (
    <section className="space-y-2 rounded-xl border border-border bg-surface p-3" aria-label={title} data-testid={testId}>
      <h4 className="text-sm font-semibold" data-testid={`${testId}-title`}>{title}</h4>
      <p className="text-sm font-medium" data-testid={`${testId}-count`} aria-live="polite">
        {total === null ? (error ? "The list could not be loaded right now. Please try again." : "Loading…") : `${total.toLocaleString("en-IN")} ${total === 1 ? "stock" : "stocks"}`}
      </p>
      {asOf && <p className="text-xs text-foreground-muted" data-testid={`${testId}-asof`}>{FIGURES_AS_OF(asOf)}</p>}
      {children}
      <label htmlFor={`${testId}-search`} className="sr-only">{NAMES_SEARCH}</label>
      <input id={`${testId}-search`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={NAMES_SEARCH} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm placeholder:text-foreground-faint sm:max-w-sm" data-testid={`${testId}-search`} />
      {total === 0 && <p className="text-sm text-foreground-muted" data-testid={`${testId}-none`}>{q.trim() ? NAMES_NONE : NAMES_NONE_LEFT}</p>}
      {items.length > 0 && (
        <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border" data-testid={`${testId}-list`}>
          {items.map((s) => (
            <li key={s.symbol} className="px-3" data-testid={`${testId}-item`}>
              {selected && onToggle ? (
                <label className="flex min-h-[44px] items-center gap-2 text-sm">
                  <input type="checkbox" checked={selected.includes(s.symbol)} onChange={() => onToggle(s.symbol)} className="h-5 w-5 shrink-0" aria-label={`Choose ${s.symbol}`} data-testid={`${testId}-tick`} />
                  <span className="font-medium">{s.symbol}</span>
                  <span className="min-w-0 truncate text-foreground-muted">{s.company}</span>
                </label>
              ) : (
                <p className="flex min-h-[40px] items-center gap-2 text-sm">
                  <span className="font-medium">{s.symbol}</span>
                  <span className="min-w-0 truncate text-foreground-muted">{s.company}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {capped && maxNote && <p className="text-sm text-foreground-muted" data-testid={`${testId}-capped`}>{maxNote}</p>}
      {more && (
        <button type="button" onClick={() => setPage((p) => p + 1)} disabled={busy} className="min-h-[44px] rounded-lg border border-border px-4 text-sm font-medium hover:border-accent disabled:opacity-60" data-testid={`${testId}-more`}>
          {busy ? "Loading…" : NAMES_MORE}
        </button>
      )}
    </section>
  );
}
