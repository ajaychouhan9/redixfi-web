"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { useAuth } from "@/lib/auth/AuthContext";
import { getSevenDayReview } from "@/lib/api/endpoints";
import type { SevenDayReview } from "@/lib/api/types";

const Ctx = createContext<SevenDayReview | null>(null);

/** The page is built for everyone without a token (Stock Condition locked outside the free sample). A signed-in visitor's browser asks again with the
 *  token and every block below shows that copy. Logged out: nothing more is requested. */
export function ReviewDataProvider({ asOf, children }: { asOf: string; children: ReactNode }) {
  const { user, loading, getToken } = useAuth();
  const [own, setOwn] = useState<SevenDayReview | null>(null);
  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const env = await getSevenDayReview(asOf, { token });
        if (!cancelled) setOwn(env.data);
      } catch {
        // keep the page's own copy
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, getToken, asOf]);
  return <Ctx.Provider value={own}>{children}</Ctx.Provider>;
}

export function useReviewData(fallback: SevenDayReview): SevenDayReview {
  return useContext(Ctx) ?? fallback;
}
