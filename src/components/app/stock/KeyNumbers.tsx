"use client";

import { useState } from "react";

import type { KeyTile } from "@/lib/stock-visual";

/**
 * The key numbers grid (26 Nov 2026): grey label on the left, bold value on the right, two columns. Tap a number to see one plain line about it.
 * The numbers are in the server HTML; only the tap is client code. A figure that is not stored makes no tile.
 */
export function KeyNumbers({ tiles, asOf, symbol }: { tiles: KeyTile[]; asOf: string | null; symbol?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  if (tiles.length === 0) return null;
  return (
    <section aria-labelledby="key-numbers" className="mt-7 border-t border-border pt-6" data-testid="key-numbers">
      <h2 id="key-numbers" className="text-lg font-bold">{symbol ? `${symbol} key numbers` : "Key numbers"}</h2>
      <dl className="mt-2 grid grid-cols-2 gap-x-6">
        {tiles.map((t) => {
          const on = open === t.key;
          return (
            <div key={t.key} className={`min-w-0 ${on || t.value.length > 10 ? "col-span-2" : ""}`}>
              <button
                type="button"
                aria-expanded={on}
                onClick={() => setOpen(on ? null : t.key)}
                data-testid={`tile-${t.key}`}
                className="flex min-h-[44px] w-full items-center justify-between gap-2 border-b border-border py-2 text-left"
              >
                <dt className="text-[13px] text-foreground-muted">{t.label}</dt>
                <dd className="text-base font-bold tabular-nums">{t.value}</dd>
              </button>
              {on && <p className="border-b border-border py-2 text-[13px] leading-5 text-foreground-muted" data-testid={`tile-meaning-${t.key}`}>{t.meaning}</p>}
            </div>
          );
        })}
      </dl>
      {asOf && <p className="mt-2 text-xs text-foreground-muted">As of {asOf}</p>}
    </section>
  );
}
