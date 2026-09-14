"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ASK_PANEL_MODE_STORAGE_KEY,
  DEFAULT_ASK_PANEL_MODE,
  restoreAskPanelMode,
  type AskPanelMode,
} from "@/lib/ask-panel/panelMode";

/**
 * Shared open/close state for the single RedixFi AI panel (locked design:
 * ONE persistent AI entry point). Two triggers open the SAME panel
 * instance — the top-ribbon "RedixFi AI" button (AskRedixFiTrigger) and the
 * sidebar's "RedixFi AI" nav item — never a second panel/entry point.
 *
 * Responsive surface (RedixFi AI chat UI session, 2026-09-11): the panel
 * itself now decides how to present based on viewport — a persistent
 * right-hand dock that pushes content at >=1024px, a dismissible right
 * drawer with a scrim at 768–1023px, and a bottom sheet at <768px. The old
 * `expanded` full-overlay mode (and its Maximize/Minimize toggle) is gone;
 * this context only tracks whether the panel is open.
 */
interface AskPanelContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  mode: AskPanelMode;
  setMode: (mode: AskPanelMode) => void;
  /** Open on top of whatever is on screen (sidebar nav item's "destination"). */
  openPanel: () => void;
}

const AskPanelContext = createContext<AskPanelContextValue | null>(null);

export function AskPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setModeState] = useState<AskPanelMode>(DEFAULT_ASK_PANEL_MODE);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setModeState(restoreAskPanelMode(window.localStorage.getItem(ASK_PANEL_MODE_STORAGE_KEY)));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const setMode = (nextMode: AskPanelMode) => {
    setModeState(nextMode);
    window.localStorage.setItem(ASK_PANEL_MODE_STORAGE_KEY, nextMode);
  };
  const openPanel = () => setOpen(true);
  const value = useMemo(() => ({ open, setOpen, openPanel, mode, setMode }), [open, mode]);
  return <AskPanelContext.Provider value={value}>{children}</AskPanelContext.Provider>;
}

export function useAskPanel(): AskPanelContextValue {
  const ctx = useContext(AskPanelContext);
  if (!ctx) throw new Error("useAskPanel must be used within AskPanelProvider");
  return ctx;
}
