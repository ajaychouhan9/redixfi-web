"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type StockView = "simple" | "detailed";
export const STOCK_VIEW_KEY = "redixfi:stock-view";

// Runs while the HTML is parsed, before anything paints: a remembered "detailed" choice is applied as an attribute on <html>, and the
// CSS in globals.css shows the matching view. So the server HTML (always Simple first) never flashes or shifts for a returning visitor.
const APPLY_SAVED_VIEW = `(function(){try{var v=localStorage.getItem(${JSON.stringify(STOCK_VIEW_KEY)});if(v==="detailed"||v==="simple"){document.documentElement.setAttribute("data-stock-view",v);}}catch(e){}})();`;

function applyView(view: StockView) {
  document.documentElement.setAttribute("data-stock-view", view);
  try {
    localStorage.setItem(STOCK_VIEW_KEY, view);
  } catch {
    /* storage may be blocked; the choice then lasts for this page only */
  }
}

/**
 * Simple view | Detailed view switch on the public stock page (17 Nov 2026). Both views are in the same cached HTML; only CSS
 * (driven by a data attribute on <html>) decides which one is shown, so the page stays static and the choice is remembered in the
 * browser. A "See details" link inside the simple view switches to the detailed view before the browser scrolls to its anchor.
 */
export function StockViewSwitch({ simple, detailed }: { simple: ReactNode; detailed: ReactNode }) {
  const [view, setView] = useState<StockView>("simple");
  const simpleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STOCK_VIEW_KEY);
      if (saved === "detailed" || saved === "simple") setView(saved); // eslint-disable-line react-hooks/set-state-in-effect -- reads the saved choice once after mount
    } catch {
      /* no storage */
    }
  }, []);

  useEffect(() => {
    const el = simpleRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href^='#']");
      if (a) {
        setView("detailed");
        applyView("detailed");
      }
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, []);

  function choose(next: StockView) {
    setView(next);
    applyView(next);
  }

  const btn = (v: StockView, label: string) => (
    <button
      type="button"
      onClick={() => choose(v)}
      aria-pressed={view === v}
      data-testid={`stock-view-${v}`}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === v ? "bg-accent text-accent-foreground" : "text-foreground-muted hover:bg-hover hover:text-foreground"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-4" data-testid="stock-view-switch">
      <script dangerouslySetInnerHTML={{ __html: APPLY_SAVED_VIEW }} />
      <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1" role="group" aria-label="Choose how much detail to show">
        {btn("simple", "Simple view")}
        {btn("detailed", "Detailed view")}
      </div>
      <div ref={simpleRef} className="stock-view-simple" data-testid="stock-view-simple-body">
        {simple}
      </div>
      <div className="stock-view-detailed" data-testid="stock-view-detailed-body">
        {detailed}
      </div>
    </div>
  );
}
