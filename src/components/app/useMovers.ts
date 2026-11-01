"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth/AuthContext";
import { getSignalMovers } from "@/lib/api/endpoints";
import type { SignalsMovers } from "@/lib/api/types";

/** The movers from the server's anonymous copy, replaced by the signed-in visitor's own copy (Stock Condition shown for every stock to paid
 *  callers) once their token is ready. Logged out: nothing more is requested. */
export function useMovers(initial: SignalsMovers | null, limit: number): SignalsMovers | null {
  const { user, loading, getToken } = useAuth();
  const [data, setData] = useState<SignalsMovers | null>(initial);
  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const env = await getSignalMovers(undefined, limit, { token });
        if (!cancelled) setData(env.data);
      } catch {
        // keep the server copy
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, getToken, limit]);
  return data;
}
