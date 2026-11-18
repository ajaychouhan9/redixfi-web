"use client";

import { useEffect } from "react";

import { askQuestionFor } from "@/lib/read-company";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";

/**
 * Opens Ask AI with one of five fixed questions typed in, when the address carries ?ask=<key> (the chips on /start link here). Nothing is sent:
 * the person reads the question and presses Send. Any other value is ignored. It reads the address in the browser only, so the stock page stays static.
 */
export function AskPrefill() {
  const { openWithQuestion } = useAskPanel();
  useEffect(() => {
    let key: string | null = null;
    try {
      key = new URLSearchParams(window.location.search).get("ask");
    } catch {
      return;
    }
    const question = askQuestionFor(key);
    if (!question) return;
    openWithQuestion(question);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("ask");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    } catch {
      /* the address is only a convenience */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
