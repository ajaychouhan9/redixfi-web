"use client";

import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import type { SourceCitation } from "@/lib/api/types";

/**
 * Ask-panel-upgrade session, Phase 1 — Screener-AI-parity source citations
 * ("Sources [5 Documents] ▼", expandable per-source list). Backed by
 * core/ask.py::compute_source_citations/generic_source_citations — richer
 * than the old bare `sources_used` category chips (still shown nowhere
 * else now; this replaces that rendering entirely).
 *
 * `investor_calls` entries carry a real filing_date + source_pdf_url
 * (same "View source filing →" link pattern as ResearchDetail.tsx); every
 * other source type is a single aggregate row with no link.
 */
export function SourcesSection({ citations }: { citations: SourceCitation[] }) {
  const [expanded, setExpanded] = useState(false);
  if (citations.length === 0) return null;

  const noun = citations.length === 1 ? "Source" : "Sources";

  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 text-[11px] font-medium text-foreground-faint hover:text-foreground"
      >
        <span>
          Sources <span className="text-accent-dim">[{citations.length} {noun}]</span>
        </span>
        <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <ul className="mt-1.5 space-y-1.5">
          {citations.map((c, i) => (
            <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-hover px-2.5 py-1.5 text-[11.5px]">
              <span className="flex min-w-0 items-center gap-1.5 text-foreground-muted">
                <FileText size={11} className="shrink-0 text-foreground-faint" />
                <span className="truncate">
                  {c.label}
                  {c.detail ? ` · ${c.detail}` : ""}
                </span>
              </span>
              {c.url && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[11px] font-medium text-accent-dim hover:text-accent"
                >
                  View source filing →
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
