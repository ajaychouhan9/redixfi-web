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
  /** Open the panel with a question already typed in the input (not sent; the person presses Send). */
  openWithQuestion: (question: string, symbol?: string) => void;
  /** Open a NEW session about these stocks (up to the lookup cap): the stocks are shown in the panel and the five questions are offered as suggestions. Nothing is sent. */
  openWithStocks: (symbols: string[]) => void;
  pendingStocks: string[] | null;
  clearPendingStocks: () => void;
  /** The company the question is about, when it was opened from a page that is not a stock page. */
  pendingSymbol: string | null;
  pendingQuestion: string | null;
  clearPendingQuestion: () => void;
}

const AskPanelContext = createContext<AskPanelContextValue | null>(null);

export function AskPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setModeState] = useState<AskPanelMode>(DEFAULT_ASK_PANEL_MODE);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null);
  const [pendingStocks, setPendingStocks] = useState<string[] | null>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setModeState(restoreAskPanelMode(window.localStorage.getItem(ASK_PANEL_MODE_STORAGE_KEY)));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  // Wide to narrow: the panel is docked beside the page from 1024 px and is a drawer over the page below that. If the window is made narrower
  // while it is open, close it so a drawer never lands on top of the page the person did not ask to cover. They can open it again.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (!e.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const setMode = (nextMode: AskPanelMode) => {
    setModeState(nextMode);
    window.localStorage.setItem(ASK_PANEL_MODE_STORAGE_KEY, nextMode);
  };
  const openPanel = () => setOpen(true);
  const openWithQuestion = (question: string, symbol?: string) => {
    setPendingQuestion(question);
    setPendingSymbol(symbol ?? null);
    setOpen(true);
  };
  const clearPendingQuestion = () => {
    setPendingQuestion(null);
    setPendingSymbol(null);
  };
  const openWithStocks = (symbols: string[]) => {
    const list = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)));
    if (!list.length) return;
    setPendingStocks(list);
    setPendingQuestion(null);
    setPendingSymbol(null);
    setOpen(true);
  };
  const clearPendingStocks = () => setPendingStocks(null);
  const value = useMemo(
    () => ({ open, setOpen, openPanel, mode, setMode, openWithQuestion, pendingQuestion, pendingSymbol, clearPendingQuestion, openWithStocks, pendingStocks, clearPendingStocks }),
    [open, mode, pendingQuestion, pendingSymbol, pendingStocks],
  );
  return <AskPanelContext.Provider value={value}>{children}</AskPanelContext.Provider>;
}

export function useAskPanel(): AskPanelContextValue {
  const ctx = useContext(AskPanelContext);
  if (!ctx) throw new Error("useAskPanel must be used within AskPanelProvider");
  return ctx;
}
