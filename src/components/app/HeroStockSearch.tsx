"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SymbolTypeahead } from "@/components/ui/SymbolTypeahead";
import { stockPath } from "@/lib/seo/stock-symbol";

const TRY_SYMBOLS = ["BEL", "RELIANCE", "TCS", "HDFCBANK"];

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
      <p className="mt-2 flex flex-wrap items-center gap-x-1 text-[13px] text-foreground-muted" data-testid="hero-chips">
        <span>Try:</span>
        {TRY_SYMBOLS.map((s, i) => (
          <span key={s} className="inline-flex items-center">
            {i > 0 && <span aria-hidden className="mr-1">·</span>}
            <Link href={stockPath("/stocks", s)} className="inline-flex min-h-[44px] items-center font-medium text-accent hover:underline">{s}</Link>
          </span>
        ))}
      </p>
    </div>
  );
}
