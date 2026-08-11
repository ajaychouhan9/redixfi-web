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
  // Ask-panel-upgrade session, Phase 5 — full-page/expanded overlay mode
  // (task brief: sidebar's "AI Assistant" should feel like a real
  // destination, not just the small floating sheet). Shared here, not
  // local state in AskRedixFi, so a trigger OTHER than the panel itself
  // (Sidebar) can request the expanded view directly on open.
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  openExpanded: () => void;
}

const AskPanelContext = createContext<AskPanelContextValue | null>(null);

export function AskPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const openExpanded = () => {
    setExpanded(true);
    setOpen(true);
  };
  const value = useMemo(() => ({ open, setOpen, expanded, setExpanded, openExpanded }), [open, expanded]);
  return <AskPanelContext.Provider value={value}>{children}</AskPanelContext.Provider>;
}

export function useAskPanel(): AskPanelContextValue {
  const ctx = useContext(AskPanelContext);
  if (!ctx) throw new Error("useAskPanel must be used within AskPanelProvider");
  return ctx;
}
