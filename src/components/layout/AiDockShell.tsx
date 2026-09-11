"use client";

import type { ReactNode } from "react";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";
import { AskRedixFi } from "@/components/app/ask/AskRedixFi";

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
  const { open } = useAskPanel();
  return (
    <>
      <div
        className={
          "flex min-w-0 flex-1 flex-col md:ml-56 md:pt-[var(--header-height)]" +
          (open ? " lg:mr-[400px]" : "")
        }
      >
        {children}
      </div>
      <AskRedixFi />
    </>
  );
}
