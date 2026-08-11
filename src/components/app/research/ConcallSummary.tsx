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
 * Callout-box fix (2026-08-11): the whole "Key takeaway: …" line (plus
 * its Show more/less toggle, when present) now sits inside a bordered
 * callout — `border-l-2 border-accent` + `bg-accent/10`, the app's real
 * gold-accent tokens at low opacity (no separate "highlight" token
 * exists; reused the same `--accent`/`--accent-dim` pair every other
 * gold CTA/active-state already uses). Label uses `text-accent` (was
 * `text-foreground-muted` — now the label is what draws the eye, not
 * what recedes); takeaway text stays `text-foreground` + gains
 * `font-medium`. Position unchanged — still renders between the
 * metadata row above and the tone_note/attribution lines below, in
 * ResearchDetail.tsx's concalls block.
 */
export function ConcallSummary({ summary }: { summary: string }) {
  const [expanded, setExpanded] = useState(false);

  // Only worth a toggle when the text is long enough to actually be
  // truncated by line-clamp-3 at this card's typical width — avoids a
  // "Show more" link that would reveal nothing new.
  const long = summary.length > 220;

  return (
    <div className="mt-2 border-l-2 border-accent bg-accent/10 px-3 py-2">
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
