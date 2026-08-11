"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Shared open/close state for the single AskRedixFi panel (locked design:
 * ONE persistent AI entry point, rendered once in MarketRibbon — see that
 * component's own docstring for why a second floating bubble was tried and
 * removed). This context lets a SECOND trigger (Sidebar's "AI Assistant"
 * nav item) open the SAME panel instance instead of duplicating the chat
 * UI — not a second panel, just a second door into the existing one.
 */
interface AskPanelContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AskPanelContext = createContext<AskPanelContextValue | null>(null);

export function AskPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return <AskPanelContext.Provider value={value}>{children}</AskPanelContext.Provider>;
}

export function useAskPanel(): AskPanelContextValue {
  const ctx = useContext(AskPanelContext);
  if (!ctx) throw new Error("useAskPanel must be used within AskPanelProvider");
  return ctx;
}
