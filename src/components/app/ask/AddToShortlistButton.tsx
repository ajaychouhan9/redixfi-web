"use client";

import { useState } from "react";

import { addToWatchlist } from "@/lib/api/mutations";

type State = "idle" | "adding" | "added" | "error";

/** "Add to shortlist" for one row of an Ask AI table. The shortlist is the watchlist. */
export function AddToShortlistButton({ symbol, getToken }: { symbol: string; getToken: () => Promise<string | null | undefined> }) {
  const [state, setState] = useState<State>("idle");

  async function add() {
    setState("adding");
    try {
      const token = await getToken();
      if (!token) throw new Error("no token");
      await addToWatchlist(token, symbol);
      setState("added");
    } catch {
      setState("error");
    }
  }

  const label = state === "added" ? "On shortlist" : state === "adding" ? "Adding…" : state === "error" ? "Could not add. Try again" : "Add to shortlist";
  return (
    <button
      type="button"
      onClick={add}
      disabled={state === "adding" || state === "added"}
      aria-label={`${label}: ${symbol}`}
      className="whitespace-nowrap rounded-md border border-border bg-hover px-2 py-1 text-[11.5px] font-medium text-foreground-muted transition-colors hover:border-accent hover:text-foreground disabled:opacity-60"
      data-testid="add-to-shortlist"
    >
      {label}
    </button>
  );
}
