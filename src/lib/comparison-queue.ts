"use client";

// Task 13 — lightweight client-side queue backing the "add to comparison"
// chip on stock detail pages. Same localStorage pattern as
// lib/recently-viewed.ts. Purely a UI convenience: it never talks to the
// API by itself — SmartScreenerBox reads the queue and turns it into a
// plain "Compare X, Y, Z" query through the existing chat box, so the
// compare intent is always resolved server-side the same way a typed
// query would be.

const KEY = "redixfi:comparison-queue";
const MAX = 5;
const EVENT = "redixfi:comparison-queue-changed";

export interface ComparisonQueueEntry {
  symbol: string;
  company_name: string | null;
}

export function getComparisonQueue(): ComparisonQueueEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persist(next: ComparisonQueueEntry[]) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

/** Returns false (no-op) if the symbol is already queued or the queue is
 * already at the 2-5 symbol cap the compare intent accepts. */
export function addToComparisonQueue(entry: ComparisonQueueEntry): boolean {
  if (typeof window === "undefined") return false;
  const existing = getComparisonQueue();
  if (existing.some((e) => e.symbol === entry.symbol) || existing.length >= MAX) return false;
  persist([...existing, entry]);
  return true;
}

export function removeFromComparisonQueue(symbol: string) {
  if (typeof window === "undefined") return;
  persist(getComparisonQueue().filter((e) => e.symbol !== symbol));
}

export function clearComparisonQueue() {
  if (typeof window === "undefined") return;
  persist([]);
}

/** Fires on every add/remove/clear, including from other components on the
 * same page (localStorage's own "storage" event only fires for OTHER tabs,
 * not the tab that made the change — this custom event covers same-tab
 * listeners like SmartScreenerBox's tray). */
export function onComparisonQueueChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export const COMPARISON_QUEUE_MAX = MAX;
