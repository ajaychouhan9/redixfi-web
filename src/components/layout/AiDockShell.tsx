"use client";

import type { CSSProperties, ReactNode } from "react";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";
import { AskRedixFi } from "@/components/app/ask/AskRedixFi";
import { ASK_PANEL_WIDTHS } from "@/lib/ask-panel/panelMode";

/**
 * RedixFi AI chat UI session (2026-09-11) — the responsive app shell that
 * lets the AI panel DOCK on desktop instead of floating over dashboard
 * cards. On lg+ an open panel reserves a 400px right column by pushing this
 * content wrapper with `lg:mr-[400px]`, so every dashboard card genuinely
 * reflows and none is covered. Below lg the panel is an overlay (right
 * drawer / bottom sheet) and the content wrapper is untouched.
 *
 * Server-rendered children (MarketRibbon, TrialStatusBar, <main>, footer)
 * are passed straight through — this client boundary only adds the
 * responsive margin and mounts the single panel instance.
 */
export function AiDockShell({ children }: { children: ReactNode }) {
  const { open, mode } = useAskPanel();
  return (
    <>
      <div
        className={`flex min-w-0 flex-1 flex-col transition-[margin] duration-300 md:ml-56 md:pt-[var(--header-height)] ${open && mode !== "full" ? "lg:mr-[var(--ask-panel-width)]" : ""}`}
        style={{ "--ask-panel-width": ASK_PANEL_WIDTHS[mode] } as CSSProperties}
      >
        {children}
      </div>
      <AskRedixFi />
    </>
  );
}
