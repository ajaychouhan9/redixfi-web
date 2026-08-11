"use client";

import { useState } from "react";
import clsx from "clsx";

/**
 * A1 (2026-08-11) — same collapsed-by-default / expand-on-click / collapse-
 * link-at-the-bottom pattern as AiDailyBriefCard's "Show less" fix (a prior
 * session), useState-based rather than native <details> for the same
 * reason: <summary> is structurally pinned to the top of <details> by HTML
 * spec, which can't produce "toggle link at the bottom of expanded
 * content". Client leaf — ResearchDetail.tsx itself stays a Server
 * Component, same reason Collapsible is split out on its own.
 */
export function ConcallSummary({ summary }: { summary: string }) {
  const [expanded, setExpanded] = useState(false);

  // Only worth a toggle when the text is long enough to actually be
  // truncated by line-clamp-3 at this card's typical width — avoids a
  // "Show more" link that would reveal nothing new.
  if (summary.length <= 220) {
    return <p className="mt-2 text-sm leading-relaxed">{summary}</p>;
  }

  return (
    <>
      <p className={clsx("mt-2 text-sm leading-relaxed", !expanded && "line-clamp-3")}>{summary}</p>
      <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-1 text-sm font-medium text-accent">
        {expanded ? "Show less ↑" : "Show more →"}
      </button>
    </>
  );
}
