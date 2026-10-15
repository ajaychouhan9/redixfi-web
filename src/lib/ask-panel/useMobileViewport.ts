"use client";

import { useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

export interface MobileViewport {
  /** Height of the area the user can actually see (shrinks when the on-screen keyboard opens). */
  height: number;
  /** Space between the bottom of the visible area and the bottom of the layout viewport (iOS keyboard). */
  bottomInset: number;
}

function subscribe(onChange: () => void): () => void {
  const vv = window.visualViewport;
  const mq = window.matchMedia(MOBILE_QUERY);
  vv?.addEventListener("resize", onChange);
  vv?.addEventListener("scroll", onChange);
  window.addEventListener("resize", onChange);
  mq.addEventListener("change", onChange);
  return () => {
    vv?.removeEventListener("resize", onChange);
    vv?.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
    mq.removeEventListener("change", onChange);
  };
}

// A string snapshot so an unchanged viewport never re-renders.
function getSnapshot(): string {
  const vv = window.visualViewport;
  if (!vv || !window.matchMedia(MOBILE_QUERY).matches) return "";
  const bottomInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  return `${Math.round(vv.height)}:${Math.round(bottomInset)}`;
}

function getServerSnapshot(): string {
  return "";
}

/**
 * Phone-width visible viewport, tracked through the VisualViewport API.
 * iOS Safari shrinks only the visual viewport when the keyboard opens, so a
 * sheet pinned to `bottom: 0` of the layout viewport ends up behind the
 * keyboard; positioning from these numbers keeps the input above it.
 * Null at tablet/desktop widths.
 */
export function useMobileViewport(): MobileViewport | null {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!snap) return null;
  const [height, bottomInset] = snap.split(":").map(Number);
  return { height, bottomInset };
}
