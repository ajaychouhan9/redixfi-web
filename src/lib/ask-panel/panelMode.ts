export type AskPanelMode = "compact" | "half" | "full";

export const ASK_PANEL_MODE_STORAGE_KEY = "redixfi.ask.panelMode.v1";
export const DEFAULT_ASK_PANEL_MODE: AskPanelMode = "half";

export const ASK_PANEL_WIDTHS: Record<AskPanelMode, string> = {
  compact: "clamp(360px, 34vw, 520px)",
  half: "clamp(480px, 48vw, 820px)",
  full: "min(calc(100vw - 14rem), 1440px)",
};

export function isAskPanelMode(value: unknown): value is AskPanelMode {
  return value === "compact" || value === "half" || value === "full";
}

export function restoreAskPanelMode(value: string | null): AskPanelMode {
  return isAskPanelMode(value) ? value : DEFAULT_ASK_PANEL_MODE;
}
