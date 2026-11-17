/**
 * The tabs of the one stock page (17 Nov 2026). Overview opens first. A tab can be opened by an address fragment (/stocks/INFY#rewind),
 * which is how the old Rewind and concall pages redirect into it. Pure data and helpers, tested without a browser.
 */
export type StockTabId = "overview" | "annual-report" | "concall" | "points-to-watch" | "news" | "insiders" | "rewind" | "ask-ai";

export const STOCK_TABS: { id: StockTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "annual-report", label: "Annual report" },
  { id: "concall", label: "Concall" },
  { id: "points-to-watch", label: "Points to watch" },
  { id: "news", label: "News" },
  { id: "insiders", label: "Insiders & promoters" },
  { id: "rewind", label: "Rewind" },
  { id: "ask-ai", label: "Ask AI" },
];

export const DEFAULT_STOCK_TAB: StockTabId = "overview";

const IDS = new Set<string>(STOCK_TABS.map((t) => t.id));

/** The tab named by "#rewind" (or "rewind"); null when the fragment names no tab (it may be an anchor inside a tab). */
export function tabFromHash(hash: string | null | undefined): StockTabId | null {
  const id = String(hash ?? "").replace(/^#/, "").trim().toLowerCase();
  return IDS.has(id) ? (id as StockTabId) : null;
}

/** Old ?tab=concall style addresses are read too. */
export function tabFromSearch(search: string | null | undefined): StockTabId | null {
  const v = new URLSearchParams(String(search ?? "")).get("tab");
  return tabFromHash(v);
}

/** The tab to show next after an arrow key (wraps around). */
export function neighbourTab(current: StockTabId, step: 1 | -1): StockTabId {
  const i = STOCK_TABS.findIndex((t) => t.id === current);
  return STOCK_TABS[(i + step + STOCK_TABS.length) % STOCK_TABS.length].id;
}
