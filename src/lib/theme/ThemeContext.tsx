"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "slate";
export const THEMES: { id: Theme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "slate", label: "Slate" },
];

/** Nothing saved: Light (the former Premium look, renamed 21 Nov 2026). A saved choice always wins. */
export const DEFAULT_THEME: Theme = "light";

/** A saved choice of the old "premium" theme is now the Light theme. */
export function readTheme(stored: string | null): Theme {
  return stored === "dark" || stored === "slate" || stored === "light" ? stored : DEFAULT_THEME;
}

const STORAGE_KEY = "redixfi:theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Server and first client render both use the default (Light), the same value the html tag carries, so hydration matches; a saved
  // choice is applied in the effect below, the same pattern as AuthContext reading localStorage only after mount.
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const initial = readTheme(window.localStorage.getItem(STORAGE_KEY));
    setThemeState(initial); // eslint-disable-line react-hooks/set-state-in-effect
    applyTheme(initial);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode: the choice just is not remembered */
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
