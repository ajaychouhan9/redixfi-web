"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
/** What the Shortlist Lab lets Ask AI do with answers for the stocks ticked there (23 Nov 2026): attach them to the open rule's latest saved result, or save the result first. */
export interface LabLink {
  ruleId: string | null;
  ruleName: string | null;
  /** The open saved rule already has a saved result to attach answers to. */
  hasResult: boolean;
  /** The result the answers are attached to (the one the ticked stocks belong to), when there is one. */
  runId: string | null;
  /** Save the result (and the rule too, under `name`, when the rule is not saved yet). Returns the rule and the result the answers belong to. */
  saveResult: (name?: string) => Promise<{ ruleId: string; runId: string }>;
  /** The five questions (keys) already answered for one stock on the result the answers go to. Empty when there is no saved result yet. */
  answeredKeys: (symbol: string) => string[];
  /** Read the answers of that result again (after new answers were saved), so the stock rows and the count are up to date. */
  refreshAnswers: () => void;
}

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
  openWithStocks: (symbols: string[], opts?: { fromLab?: boolean }) => void;
  pendingStocks: string[] | null;
  /** The pending stocks were ticked on the Shortlist Lab page, so their answers may be saved to a rule's result. */
  pendingFromLab: boolean;
  /** The Shortlist Lab page registers (and on leaving removes) a way to read its current rule and result. */
  setLabLink: (get: (() => LabLink | null) | null) => void;
  getLabLink: () => LabLink | null;
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
  const [pendingFromLab, setPendingFromLab] = useState(false);
  const labRef = useRef<(() => LabLink | null) | null>(null);
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
  const setLabLink = (get: (() => LabLink | null) | null) => {
    labRef.current = get;
  };
  const getLabLink = (): LabLink | null => (labRef.current ? labRef.current() : null);
  const openWithStocks = (symbols: string[], opts?: { fromLab?: boolean }) => {
    const list = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)));
    if (!list.length) return;
    setPendingStocks(list);
    setPendingFromLab(!!opts?.fromLab);
    setPendingQuestion(null);
    setPendingSymbol(null);
    setOpen(true);
  };
  const clearPendingStocks = () => setPendingStocks(null);
  const value = useMemo(
    () => ({ open, setOpen, openPanel, mode, setMode, openWithQuestion, pendingQuestion, pendingSymbol, clearPendingQuestion, openWithStocks, pendingStocks, pendingFromLab, setLabLink, getLabLink, clearPendingStocks }),
    [open, mode, pendingQuestion, pendingSymbol, pendingStocks, pendingFromLab],
  );
  return <AskPanelContext.Provider value={value}>{children}</AskPanelContext.Provider>;
}

export function useAskPanel(): AskPanelContextValue {
  const ctx = useContext(AskPanelContext);
  if (!ctx) throw new Error("useAskPanel must be used within AskPanelProvider");
  return ctx;
}
