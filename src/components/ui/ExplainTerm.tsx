"use client";

import { useEffect, useRef, useState } from "react";
import { getExplainer } from "@/data/metric-explainers";

const OPEN_COUNT_KEY = (metricKey: string) => `redixfi:explain-opens:${metricKey}`;
const FADE_AFTER = 4;

// No dedicated telemetry endpoint exists in the live API yet (checked the
// OpenAPI surface) — this counts opens locally so the progressive-
// disclosure fade still works, and logs to console as a stand-in for the
// "log explainer-taps" engagement instrumentation named in the spec.
function recordOpen(metricKey: string): number {
  if (typeof window === "undefined") return 0;
  const key = OPEN_COUNT_KEY(metricKey);
  const n = Number(window.localStorage.getItem(key) ?? "0") + 1;
  window.localStorage.setItem(key, String(n));
  console.debug("[engagement] explainer_open", { metricKey, count: n });
  return n;
}

function getOpenCount(metricKey: string): number {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(OPEN_COUNT_KEY(metricKey)) ?? "0");
}

/**
 * Contextual tap-template — dotted underline; tap/hover opens a
 * one-breath popup with live values injected; "learn more" expands one
 * further level. This is the PRIMARY layer of the education system
 * (spec Part 3) — no glossary/FAQ/academy pages exist anywhere else.
 */
export function ExplainTerm({
  metricKey,
  ctx,
  children,
}: {
  metricKey: string;
  ctx: Record<string, string | number>;
  children: React.ReactNode;
}) {
  const explainer = getExplainer(metricKey);
  const [open, setOpen] = useState(false);
  const [deeper, setDeeper] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setOpenCount(getOpenCount(metricKey));
  }, [metricKey]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setDeeper(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (!explainer) return <>{children}</>;

  const faded = openCount >= FADE_AFTER;

  function toggle() {
    if (!open) setOpenCount(recordOpen(metricKey));
    setOpen((o) => !o);
    if (open) setDeeper(false);
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
          className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-border bg-surface-raised p-3 text-xs leading-relaxed text-foreground shadow-lg"
        >
          <span className="block font-semibold text-foreground-muted">{explainer.term}</span>
          <span className="mt-1 block">{explainer.summary(ctx)}</span>
          {!deeper ? (
            <button type="button" onClick={() => setDeeper(true)} className="mt-2 font-medium text-accent">
              Learn more
            </button>
          ) : (
            <span className="mt-2 block space-y-1.5 border-t border-border pt-2">
              <span className="block"><b className="font-medium">What it measures:</b> {explainer.deeper.whatItMeasures}</span>
              <span className="block"><b className="font-medium">Why traders watch it:</b> {explainer.deeper.whyTradersWatch}</span>
              <span className="block"><b className="font-medium">Pattern note:</b> {explainer.deeper.patternNote}</span>
            </span>
          )}
        </span>
      )}
    </span>
  );
}
