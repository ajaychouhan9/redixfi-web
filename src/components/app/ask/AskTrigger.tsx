"use client";

import { Sparkles } from "lucide-react";

import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";

/** Top-ribbon entry point. Same Sparkles mark as the sidebar nav item. */
export function AskRedixFiTrigger() {
  const { open, setOpen } = useAskPanel();
  return (
    <button
      onClick={() => setOpen(!open)}
      aria-label="RedixFi AI"
      aria-pressed={open}
      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold min-h-[44px]"
      style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
    >
      <Sparkles size={12} /> <span>Ask AI</span>
    </button>
  );
}
