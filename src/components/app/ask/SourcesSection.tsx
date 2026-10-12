"use client";

import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import type { SourceCitation } from "@/lib/api/types";
import { formatDateIst } from "@/lib/format";

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
/**
 * Answers fetched from a public web page (type "web") are not from RedixFi's
 * database, so the footer is always visible rather than tucked into the
 * expandable Sources list.
 */
function WebSourceFooter({ citation }: { citation: SourceCitation }) {
  const name = citation.label.replace(/^Web · /, "");
  const fetched = citation.fetched_at ? formatDateIst(`${citation.fetched_at}T00:00:00+05:30`) : null;
  return (
    <div className="mt-2 border-t border-border pt-2 text-[11.5px] text-foreground-faint">
      <span>
        Source: online ({name}), not from RedixFi&apos;s database
        {fetched ? ` · fetched ${fetched}` : ""}
      </span>
      {citation.url && (
        <a
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 font-medium text-accent-dim hover:text-accent"
        >
          View source →
        </a>
      )}
      {citation.detail && <p className="mt-0.5">{citation.detail}</p>}
    </div>
  );
}

export function SourcesSection({ citations: allCitations }: { citations: SourceCitation[] }) {
  const [expanded, setExpanded] = useState(false);
  const webCitations = allCitations.filter((c) => c.type === "web");
  const citations = allCitations.filter((c) => c.type !== "web");
  if (allCitations.length === 0) return null;
  if (citations.length === 0) {
    return (
      <>
        {webCitations.map((c, i) => (
          <WebSourceFooter key={i} citation={c} />
        ))}
      </>
    );
  }

  const noun = citations.length === 1 ? "Source" : "Sources";

  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 text-[12px] font-medium text-foreground-faint hover:text-foreground"
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
                  className="shrink-0 text-[12px] font-medium text-accent-dim hover:text-accent"
                >
                  View source filing →
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      {webCitations.map((c, i) => (
        <WebSourceFooter key={`web-${i}`} citation={c} />
      ))}
    </div>
  );
}
