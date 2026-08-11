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
 *
 * Primary-text fix (2026-08-11): summary reverted to `text-foreground`
 * (this project's real primary/full-strength text tier — same one the
 * main body text uses; no "white"/"text-primary" utility exists,
 * confirmed via grep) per explicit founder direction that this is key
 * content, not secondary/muted text.
 *
 * Label-color fix (2026-08-11): "Key takeaway:" label uses `text-accent`
 * (was `text-foreground-muted`) so it draws the eye; takeaway text stays
 * `text-foreground` (primary tier) + `font-medium`. NOT wrapped in a
 * callout box — an earlier version of this fix boxed this whole line,
 * but per direct correction the callout box belongs on `tone_note`
 * instead (the short one-sentence tone explanation that renders below
 * this component, confirmed against data-pipeline/concall_summarizer.py:
 * `summary` here is a 120-180 WORD paragraph — the line-clamped/
 * expandable content below — while `tone_note` is "one short neutral
 * sentence" — the actual box-worthy standalone content). See
 * ResearchDetail.tsx's concalls block for that box.
 */
export function ConcallSummary({ summary }: { summary: string }) {
  const [expanded, setExpanded] = useState(false);

  // Only worth a toggle when the text is long enough to actually be
  // truncated by line-clamp-3 at this card's typical width — avoids a
  // "Show more" link that would reveal nothing new.
  const long = summary.length > 220;

  return (
    <div className="mt-2">
      <p className={clsx("text-sm leading-relaxed", long && !expanded && "line-clamp-3")}>
        <span className="font-medium text-accent">Key takeaway: </span>
        <span className="font-medium text-foreground">{summary}</span>
      </p>
      {long && (
        <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-1 text-sm font-medium text-accent">
          {expanded ? "Show less ↑" : "Show more →"}
        </button>
      )}
    </div>
  );
}
