"use client";

import { useEffect } from "react";

// Route-segment fallback: if something outside a tab's own content throws, only this segment is replaced; the header and menu stay.
export default function StockPageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Stock page failed to render:", error);
  }, [error]);
  return (
    <div className="mx-auto max-w-3xl py-10 text-center">
      <p className="text-sm text-foreground-muted">This stock page isn&apos;t available right now.</p>
      <button onClick={reset} className="mt-3 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-muted">
        Try again
      </button>
    </div>
  );
}
