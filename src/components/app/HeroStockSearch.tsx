"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SymbolTypeahead } from "@/components/ui/SymbolTypeahead";
import { stockPath } from "@/lib/seo/stock-symbol";

/** Home hero search (17 Nov 2026): the shared company/symbol typeahead; choosing a company opens its public stock page. */
export function HeroStockSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <div className="mt-5 max-w-md" data-testid="hero-stock-search">
      <SymbolTypeahead
        value={q}
        onChange={setQ}
        onSelect={(row) => {
          setQ("");
          router.push(stockPath("/stocks", row.canonicalSymbol));
        }}
        placeholder="Type a company name"
        ariaLabel="Type a company name"
        wrapperClassName="relative w-full"
        inputClassName="h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground outline-none focus:border-accent"
      />
    </div>
  );
}
