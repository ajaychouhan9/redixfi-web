"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { useAuth } from "@/lib/auth/AuthContext";
import { getSevenDayMine } from "@/lib/api/endpoints";
import type { SevenDayMine } from "@/lib/api/types";

type MineState = { status: "loading" } | { status: "anonymous" } | { status: "error" } | { status: "ready"; data: SevenDayMine };

const Ctx = createContext<MineState>({ status: "loading" });

/** One request for the signed-in user's watchlist over the window, shared by "Your stocks" and the watchlist line of "What happened this week".
 *  Logged out: nothing is requested. */
export function MineProvider({ asOf, children }: { asOf: string; children: ReactNode }) {
  const { user, loading, getToken } = useAuth();
  const [state, setState] = useState<MineState>({ status: "loading" });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setState({ status: "anonymous" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) setState({ status: "anonymous" });
          return;
        }
        const env = await getSevenDayMine(asOf, { token });
        if (!cancelled) setState({ status: "ready", data: env.data });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, getToken, asOf]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useMine(): MineState {
  return useContext(Ctx);
}
