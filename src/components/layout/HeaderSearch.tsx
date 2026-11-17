"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SymbolTypeahead } from "@/components/ui/SymbolTypeahead";
import { FeedbackBox } from "@/components/app/FeedbackBox";
import { stockPath } from "@/lib/seo/stock-symbol";

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
  const [q, setQ] = useState("");

  return (
    // 17 Nov 2026: one search box in the header on every screen size (it used to be hidden on phones), and one place to go: the stock page.
    <div className="w-full min-w-0" data-testid="header-search">
      <SymbolTypeahead
        value={q}
        onChange={setQ}
        onSelect={(row) => {
          setQ("");
          router.push(stockPath("/stocks", row.canonicalSymbol));
        }}
        emptyFooter={<FeedbackBox page="no_result" idSuffix="header-search" className="!border-0 !bg-transparent !p-0" />}
        placeholder="Search"
        ariaLabel="Search a company"
        wrapperClassName="relative w-full"
        inputClassName="h-10 w-full rounded-lg border border-border bg-hover py-1.5 pl-8 pr-3 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}
