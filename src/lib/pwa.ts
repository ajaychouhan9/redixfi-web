// "Add RedixFi to your home screen": small, pure helpers for the install prompt (decisions are testable without a browser).

export const DISMISS_KEY = "redixfi:install-dismissed-until";
export const VISITS_KEY = "redixfi:visits";
export const DISMISS_DAYS = 30;
export const MIN_VISITS = 2;

export const IOS_HINT = "Tap Share, then Add to Home Screen";
export const INSTALL_TITLE = "Add RedixFi to your home screen";

export type InstallKind = "prompt" | "ios" | "none";

/** iPhone, iPad (also when it reports itself as a Mac with a touch screen) and iPod: no install prompt exists there. */
export function isIos(ua: string, maxTouchPoints = 0): boolean {
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
}

/** How this visitor can add the site: the browser's install prompt (Android/Chrome), the Share-sheet hint (iOS), or not at all. */
export function installKind(opts: { ua: string; maxTouchPoints?: number; hasPrompt: boolean; standalone: boolean }): InstallKind {
  if (opts.standalone) return "none";
  if (opts.hasPrompt) return "prompt";
  if (isIos(opts.ua, opts.maxTouchPoints ?? 0)) return "ios";
  return "none";
}

/** The dismissal is remembered for 30 days. */
export function isDismissed(untilMs: number | null | undefined, nowMs: number): boolean {
  return typeof untilMs === "number" && Number.isFinite(untilMs) && untilMs > nowMs;
}

export function dismissUntil(nowMs: number, days = DISMISS_DAYS): number {
  return nowMs + days * 86_400_000;
}

/** The small banner shows from the visitor's second visit, never when installed, never inside the dismissal window. */
export function shouldShowBanner(opts: { kind: InstallKind; visits: number; dismissedUntil: number | null | undefined; nowMs: number }): boolean {
  return opts.kind !== "none" && opts.visits >= MIN_VISITS && !isDismissed(opts.dismissedUntil, opts.nowMs);
}

// ---- browser side (every call is guarded: storage and matchMedia can be unavailable) ----

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

/** Counts one visit per browser session (a tab or app launch), so reloads do not add up. */
export function recordVisit(): number {
  try {
    if (!window.sessionStorage.getItem("redixfi:visit-counted")) {
      window.sessionStorage.setItem("redixfi:visit-counted", "1");
      const n = Number(window.localStorage.getItem(VISITS_KEY) || "0") + 1;
      window.localStorage.setItem(VISITS_KEY, String(n));
      return n;
    }
    return Number(window.localStorage.getItem(VISITS_KEY) || "0");
  } catch {
    return 0;
  }
}

export function readDismissedUntil(): number | null {
  try {
    const v = Number(window.localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function writeDismissed(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(dismissUntil(Date.now())));
  } catch {
    /* ignore */
  }
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
