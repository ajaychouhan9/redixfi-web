"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  installKind,
  isStandalone,
  readDismissedUntil,
  recordVisit,
  shouldShowBanner,
  writeDismissed,
  type BeforeInstallPromptEvent,
  type InstallKind,
} from "@/lib/pwa";

interface PwaState {
  kind: InstallKind;
  showBanner: boolean;
  install: () => Promise<void>;
  dismissBanner: () => void;
}

const Ctx = createContext<PwaState>({ kind: "none", showBanner: false, install: async () => {}, dismissBanner: () => {} });

export function usePwa(): PwaState {
  return useContext(Ctx);
}

/**
 * Registers the service worker (production only; it caches only the static shell, see public/sw.js) and keeps the
 * "Add RedixFi to your home screen" state: the browser's install prompt on Android/Chrome, the Share-sheet hint on
 * iPhone, nothing when the site is already running as an installed app.
 */
export function PwaProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [visits, setVisits] = useState(0);
  const [dismissedUntil, setDismissedUntil] = useState<number | null>(null);
  const [ua, setUa] = useState("");
  const [touch, setTouch] = useState(0);
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    setStandalone(isStandalone());
    setVisits(recordVisit());
    setDismissedUntil(readDismissedUntil());
    setNowMs(Date.now());
    setUa(navigator.userAgent);
    setTouch(navigator.maxTouchPoints || 0);

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep the event for our own button
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setPrompt(null);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const kind = installKind({ ua, maxTouchPoints: touch, hasPrompt: !!prompt, standalone });
  const showBanner = shouldShowBanner({ kind, visits, dismissedUntil, nowMs });

  const install = useCallback(async () => {
    if (!prompt) return;
    await prompt.prompt();
    try {
      await prompt.userChoice;
    } finally {
      setPrompt(null);
    }
  }, [prompt]);

  const dismissBanner = useCallback(() => {
    writeDismissed();
    setDismissedUntil(readDismissedUntil());
    setNowMs(Date.now());
  }, []);

  const value = useMemo(() => ({ kind, showBanner, install, dismissBanner }), [kind, showBanner, install, dismissBanner]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
