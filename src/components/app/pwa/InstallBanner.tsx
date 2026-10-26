"use client";

import { IOS_HINT, INSTALL_TITLE } from "@/lib/pwa";

import { usePwa } from "./PwaProvider";

/** Small dismissible banner (from the second visit): the browser's install button on Android, the Share hint on iPhone. */
export function InstallBanner() {
  const { kind, showBanner, install, dismissBanner } = usePwa();
  if (!showBanner) return null;
  return (
    <div className="border-b border-border bg-surface px-4 py-2.5 md:px-6" data-testid="install-banner">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-foreground-muted">
          <span className="font-semibold text-foreground">{INSTALL_TITLE}.</span>{" "}
          {kind === "ios" ? IOS_HINT : "One tap, opens like an app."}
        </p>
        <div className="flex items-center gap-1.5">
          {kind === "prompt" && (
            <button
              type="button"
              onClick={install}
              className="rounded-lg border border-accent px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/10"
            >
              Install RedixFi
            </button>
          )}
          <button
            type="button"
            onClick={dismissBanner}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-foreground-muted hover:text-foreground"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
