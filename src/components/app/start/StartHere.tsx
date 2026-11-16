"use client";

import { useState } from "react";
import Link from "next/link";

import { START_SECTORS, START_WHAT_MATTERS, startScreenerHref } from "@/lib/start-here";

/** The three "Start here" questions, answered in the browser; the button opens the Screener with the matching filters. */
export function StartHere() {
  const [chosen, setChosen] = useState<string[]>([]);
  const [sector, setSector] = useState("");
  const href = startScreenerHref(chosen, sector);

  function toggle(id: string) {
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-5" data-testid="start-here">
      <fieldset>
        <legend className="text-sm font-semibold">1. What matters to you? (choose one or more)</legend>
        <div className="mt-2 space-y-2">
          {START_WHAT_MATTERS.map((o) => (
            <label key={o.id} className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={chosen.includes(o.id)} onChange={() => toggle(o.id)} className="mt-1 h-4 w-4 shrink-0" />
              <span>
                <span className="font-medium">{o.label}</span>
                <span className="block text-xs text-foreground-muted">Rule: {o.rule}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5">
        <p className="text-sm font-semibold">2. Company size?</p>
        <p className="mt-1 text-xs text-foreground-muted">
          Any. A filter by company size (market value) is not in the Screener yet, so this question has no other option for now.
        </p>
      </div>

      <div className="mt-5">
        <label className="block text-sm font-semibold" htmlFor="start-sector">
          3. Sector?
        </label>
        <select id="start-sector" value={sector} onChange={(e) => setSector(e.target.value)} className="mt-2 h-10 w-full max-w-xs rounded-lg border border-border bg-surface px-2 text-sm">
          <option value="">Any sector</option>
          {START_SECTORS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-foreground-muted">Sectors follow the NSE index groups the Screener uses.</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link href={href} data-testid="start-show-stocks" className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground">
          Show matching stocks
        </Link>
        <span className="text-xs text-foreground-muted">Opens the Screener. Results are listed A to Z. Not a recommendation.</span>
      </div>
    </div>
  );
}
