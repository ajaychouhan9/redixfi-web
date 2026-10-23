"use client";

import { useEffect, useState } from "react";

import { getMarketState } from "@/lib/api/endpoints";
import type { MarketState } from "@/lib/api/types";

// One shared request for every component on the page (30 s), refreshed each minute while mounted.
let cached: { at: number; data: MarketState } | null = null;
let inflight: Promise<MarketState | null> | null = null;

async function load(): Promise<MarketState | null> {
  if (cached && Date.now() - cached.at < 30_000) return cached.data;
  if (!inflight) {
    inflight = getMarketState()
      .then((r) => {
        cached = { at: Date.now(), data: r.data };
        return r.data;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** The market state (live / closing data updating / pre-market / holiday / weekend ...). `initial` is what the
 *  server rendered, so the first paint already carries the right labels; null when it cannot be loaded. */
export function useMarketState(initial?: MarketState | null): MarketState | null {
  const [state, setState] = useState<MarketState | null>(initial ?? null);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const s = await load();
      if (alive && s) setState(s);
    };
    void tick();
    const id = setInterval(tick, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return state;
}
