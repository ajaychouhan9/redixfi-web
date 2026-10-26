"use client";

import { Download } from "lucide-react";

import { IOS_HINT, INSTALL_TITLE } from "@/lib/pwa";

import { usePwa } from "./PwaProvider";

/** The permanent "Install app" row on the More page. Hidden only when RedixFi already runs as an installed app. */
export function InstallRow() {
  const { kind, install } = usePwa();
  if (typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches) return null;
  return (
    <li data-testid="install-row">
      <div className="flex items-center justify-between gap-3 py-3 text-sm">
        <span className="flex min-w-0 items-center gap-3">
          <Download size={16} className="shrink-0 text-accent" />
          <span className="min-w-0">
            <span className="block font-medium">Install app</span>
            <span className="block text-xs text-foreground-muted">
              {kind === "ios" ? `${INSTALL_TITLE}. ${IOS_HINT}.` : kind === "prompt" ? INSTALL_TITLE : `${INSTALL_TITLE}: open the browser menu and choose Add to Home screen.`}
            </span>
          </span>
        </span>
        {kind === "prompt" && (
          <button type="button" onClick={install} className="shrink-0 rounded-lg border border-accent px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/10">
            Install
          </button>
        )}
      </div>
    </li>
  );
}
