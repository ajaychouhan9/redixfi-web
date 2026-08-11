"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { DailyBrief } from "@/lib/api/types";

/**
 * Splits the brief into a 2-3 sentence lead and the remainder. Pure display
 * restructuring — the full body is still rendered in full once expanded,
 * nothing is dropped or truncated permanently.
 */
function splitSummary(body: string, maxSentences = 3): { summary: string; rest: string } {
  const sentences = body.match(/[^.!?]+[.!?]+(\s+|$)/g);
  if (!sentences || sentences.length <= maxSentences) {
    return { summary: body.trim(), rest: "" };
  }
  return {
    summary: sentences.slice(0, maxSentences).join("").trim(),
    rest: sentences.slice(maxSentences).join("").trim(),
  };
}

export function AiDailyBriefCard({ brief }: { brief: DailyBrief | null }) {
  const { summary, rest } = brief ? splitSummary(brief.body) : { summary: "", rest: "" };
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border"
      style={{
        background: "linear-gradient(135deg, color-mix(in srgb, var(--surface-raised) 88%, var(--accent) 12%), var(--surface-raised))",
        borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
      }}
    >
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: "linear-gradient(180deg, var(--accent), var(--accent-dim))" }} />
      <div className="p-5 pl-6 sm:p-6 sm:pl-7">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-accent/15">
              <Sparkles size={14} className="text-accent" />
            </span>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-accent">AI Daily Brief</div>
              {brief && <div className="font-mono text-[11px] text-foreground-faint">{brief.period === "close" ? "Close session" : "Morning session"}</div>}
            </div>
          </div>
          <span className="shrink-0 rounded-md bg-accent/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-accent-dim">AI-generated</span>
        </div>
        {brief ? (
          <>
            <p className="text-[15px] leading-[1.75] text-foreground">{summary}</p>
            {rest && expanded && <p className="mt-2 text-[15px] leading-[1.75] text-foreground">{rest}</p>}
            {rest && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="mt-2 block cursor-pointer text-left text-sm font-medium text-accent"
              >
                {expanded ? "Show less ↑" : "Read full brief →"}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-foreground-muted">No brief generated yet today — check back after market open.</p>
        )}
      </div>
    </div>
  );
}
