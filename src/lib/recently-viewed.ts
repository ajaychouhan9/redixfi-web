"use client";

const KEY = "redixfi:recently-viewed";
const MAX = 6;

export interface RecentlyViewedEntry {
  symbol: string;
  company_name: string;
  viewed_at: string;
}

export function getRecentlyViewed(): RecentlyViewedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function pushRecentlyViewed(entry: Omit<RecentlyViewedEntry, "viewed_at">) {
  if (typeof window === "undefined") return;
  const existing = getRecentlyViewed().filter((e) => e.symbol !== entry.symbol);
  const next = [{ ...entry, viewed_at: new Date().toISOString() }, ...existing].slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}
