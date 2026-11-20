"use client";

import { useState } from "react";
import { Palette } from "lucide-react";

import { THEMES, useTheme } from "@/lib/theme/ThemeContext";
import { useDismiss } from "@/components/layout/AccountMenu";

/** Three buttons in a row: Light, Dark, Slate. Used inside the account panel. The choice is kept in this browser only. */
export function ThemeChoice() {
  const { theme, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" data-testid="theme-choice" className="flex gap-1 px-3 pb-2">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={theme === t.id}
          data-testid={`theme-${t.id}`}
          onClick={() => setTheme(t.id)}
          className={`min-h-[44px] flex-1 rounded-md border px-2 text-xs font-medium md:min-h-[36px] ${
            theme === t.id ? "border-accent bg-hover text-foreground" : "border-border text-foreground-muted hover:bg-hover"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** The small header icon for a visitor who is not logged in: opens the three choices. */
export function ThemeToggle() {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Choose theme"
        aria-haspopup="true"
        aria-expanded={open}
        data-testid="theme-button"
        className="flex h-11 w-11 items-center justify-center rounded-md text-foreground-muted hover:bg-hover md:h-9 md:w-9"
      >
        <Palette size={16} aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface-raised pt-2 shadow-lg">
          <p className="px-3 pb-1 text-xs text-foreground-faint">Theme</p>
          <ThemeChoice />
        </div>
      )}
    </div>
  );
}
