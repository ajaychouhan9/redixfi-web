"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SymbolTypeahead } from "@/components/ui/SymbolTypeahead";
import { searchTargetBase, stockPath } from "@/lib/seo/stock-symbol";

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
 *
 * 2026-08-16: the debounce/dropdown/outside-click logic that used to live
 * directly in this component was extracted into SymbolTypeahead.tsx so the
 * Market Activity hub's symbol filter (BUG 4) reuses the exact same
 * autocomplete instead of a new implementation. This component's own
 * markup/styling/behavior (navigate-on-select) is unchanged.
 */
export function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");

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
    <div className="hidden w-full min-w-0 max-w-[160px] md:block lg:max-w-xs">
      <SymbolTypeahead
        value={q}
        onChange={setQ}
        onSelect={(row) => {
          setQ("");
          // stays in context: Research stock page -> Research, anywhere else -> Signals
          router.push(stockPath(searchTargetBase(pathname), row.canonicalSymbol));
        }}
        links={(row) => [
          { label: "Signals", href: stockPath("/signals", row.canonicalSymbol) },
          { label: "Research", href: stockPath("/research", row.canonicalSymbol) },
        ]}
        placeholder="Search stocks, sectors, news..."
        ariaLabel="Search stocks, sectors, news"
        wrapperClassName="relative w-full"
        // Font-size fix (2026-08-11): was text-xs (12px), task wants 14px.
        inputClassName="w-full rounded-lg border border-border bg-hover py-1.5 pl-8 pr-3 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}
