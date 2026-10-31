"use client";

import { useEffect, useState } from "react";

import { apiGet } from "@/lib/api/client";

let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

/** The Market Rewind feature flag from GET /config/public (one API setting hides the page, the More item and the links). Off until the API says on. */
export async function fetchHistoryEnabled(): Promise<boolean> {
  if (cached !== null) return cached;
  if (!inflight) {
    inflight = apiGet<{ history_explorer?: boolean }>("/config/public", { revalidate: 300 })
      .then((env) => (cached = env.data?.history_explorer === true))
      .catch(() => false)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useHistoryEnabled(): boolean {
  const [on, setOn] = useState<boolean>(cached ?? false);
  useEffect(() => {
    let live = true;
    fetchHistoryEnabled().then((v) => {
      if (live) setOn(v);
    });
    return () => {
      live = false;
    };
  }, []);
  return on;
}
