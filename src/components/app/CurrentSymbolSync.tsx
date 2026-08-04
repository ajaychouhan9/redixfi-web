"use client";

import { useEffect } from "react";
import { setCurrentSymbol } from "@/lib/current-symbol";

/** Rendered (once) from a stock detail page's server component to register
 * this page's symbol as the AI button's preset conversation subject —
 * cleared on unmount so navigating to a page with no obvious stock (Home,
 * Signals list) correctly falls back to AskRedixFi's search step. */
export function CurrentSymbolSync({ symbol }: { symbol: string }) {
  useEffect(() => {
    setCurrentSymbol(symbol);
    return () => setCurrentSymbol(null);
  }, [symbol]);
  return null;
}
