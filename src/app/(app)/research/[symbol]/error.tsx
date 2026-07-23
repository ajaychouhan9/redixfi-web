"use client";

import { useEffect } from "react";

// Route-segment fallback (Next.js App Router convention) — last line of
// defense if something outside ResearchDetail's own panel-level
// ErrorBoundary throws. Sidebar/MarketRibbon in the parent layout stay
// mounted; only this segment is replaced.
export default function ResearchSymbolError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Research page failed to render:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl py-10 text-center">
      <p className="text-sm text-foreground-muted">This research page isn&apos;t available right now.</p>
      <button
        onClick={reset}
        className="mt-3 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-muted"
      >
        Try again
      </button>
    </div>
  );
}
