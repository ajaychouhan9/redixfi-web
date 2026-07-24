"use client";

import { useEffect, useRef, useState } from "react";
import { useEducationContent } from "@/lib/education/useEducationContent";
import { interpolate } from "@/lib/education/interpolate";
import { logEducationEngagement } from "@/lib/api/mutations";
import { useAuth } from "@/lib/auth/AuthContext";
import { FaqPanel } from "@/components/app/education/FaqPanel";

const OPEN_COUNT_KEY = (metricKey: string) => `redixfi:explain-opens:${metricKey}`;
const FADE_AFTER = 4;

function recordOpenCount(metricKey: string): number {
  if (typeof window === "undefined") return 0;
  const key = OPEN_COUNT_KEY(metricKey);
  const n = Number(window.localStorage.getItem(key) ?? "0") + 1;
  window.localStorage.setItem(key, String(n));
  return n;
}

function getOpenCount(metricKey: string): number {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(OPEN_COUNT_KEY(metricKey)) ?? "0");
}

/**
 * Contextual tap-template — dotted underline; tap/hover opens a one-breath
 * popup with live values injected; "learn more" expands a second level
 * (what / why traders watch / how it's calculated / historical pattern),
 * plus a fictional worked example and a link into the guided FAQ tree.
 *
 * Task 12: content now comes from GET /education/{metric} (fetch-only,
 * zero live model requests) instead of a static local content map —
 * mechanics are unchanged, per the task doc's Surface 4 note.
 */
export function ExplainTerm({
  metricKey,
  ctx,
  symbol,
  children,
}: {
  metricKey: string;
  ctx: Record<string, string | number>;
  symbol?: string;
  children: React.ReactNode;
}) {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [deeper, setDeeper] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const containerRef = useRef<HTMLSpanElement>(null);

  const content = useEducationContent(metricKey, open);

  useEffect(() => {
    setOpenCount(getOpenCount(metricKey));
  }, [metricKey]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setDeeper(false);
        setShowFaq(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const faded = openCount >= FADE_AFTER;

  async function toggle() {
    const willOpen = !open;
    if (willOpen) {
      setOpenCount(recordOpenCount(metricKey));
      const token = await getToken();
      logEducationEngagement(token, { type: "explainer_open", metric: metricKey, symbol });
    }
    setOpen(willOpen);
    if (!willOpen) {
      setDeeper(false);
      setShowFaq(false);
    }
  }

  return (
    <span ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={toggle}
        className={
          faded
            ? "cursor-pointer text-inherit"
            : "cursor-pointer text-inherit decoration-dotted decoration-1 underline underline-offset-2 decoration-foreground-faint hover:decoration-accent"
        }
        aria-expanded={open}
      >
        {children}
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1 w-80 rounded-lg border border-border bg-surface-raised p-3 text-xs leading-relaxed text-foreground shadow-lg"
        >
          {content === undefined ? (
            <span className="block text-foreground-faint">Loading…</span>
          ) : content === null ? (
            <span className="block text-foreground-faint">No explainer available for this yet.</span>
          ) : (
            <>
              <span className="block font-semibold text-foreground-muted">{content.label}</span>
              <span className="mt-1 block">{interpolate(content.short, ctx)}</span>
              {!deeper && !showFaq && (
                <span className="mt-2 flex gap-3">
                  <button type="button" onClick={() => setDeeper(true)} className="font-medium text-accent">
                    Learn more
                  </button>
                  {content.faq.length > 0 && (
                    <button type="button" onClick={() => setShowFaq(true)} className="font-medium text-accent">
                      Common questions
                    </button>
                  )}
                </span>
              )}
              {deeper && (
                <span className="mt-2 block space-y-1.5 border-t border-border pt-2">
                  <span className="block"><b className="font-medium">What it measures:</b> {content.deeper.what}</span>
                  <span className="block"><b className="font-medium">Why traders watch it:</b> {content.deeper.why_traders_watch}</span>
                  <span className="block"><b className="font-medium">How it's calculated:</b> {content.deeper.how_calculated}</span>
                  {content.deeper.historical_pattern && (
                    <span className="block"><b className="font-medium">Historical pattern:</b> {content.deeper.historical_pattern}</span>
                  )}
                  {content.example && (
                    <span className="block"><b className="font-medium">Example:</b> {content.example}</span>
                  )}
                  {content.faq.length > 0 && (
                    <button type="button" onClick={() => { setDeeper(false); setShowFaq(true); }} className="font-medium text-accent">
                      Common questions →
                    </button>
                  )}
                </span>
              )}
              {showFaq && (
                <span className="mt-2 block border-t border-border pt-2">
                  <FaqPanel metric={metricKey} symbol={symbol} />
                </span>
              )}
            </>
          )}
        </span>
      )}
    </span>
  );
}
