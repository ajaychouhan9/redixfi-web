"use client";

import dynamic from "next/dynamic";

// The two interactive tabs are fetched only when a visitor opens them (26 Nov 2026), so their scripts are not part of the stock page's first load.
export const LazyRewindTab = dynamic(() => import("@/components/app/stock/RewindTab").then((m) => m.RewindTab), { ssr: false });
export const LazyAskAiTab = dynamic(() => import("@/components/app/stock/AskAiTab").then((m) => m.AskAiTab), { ssr: false });
