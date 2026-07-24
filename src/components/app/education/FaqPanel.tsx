"use client";

import { useEffect, useState } from "react";
import { fetchEducation } from "@/lib/education/useEducationContent";
import { logEducationEngagement } from "@/lib/api/mutations";
import { useAuth } from "@/lib/auth/AuthContext";
import type { EducationContent, EducationFaqNode } from "@/lib/api/types";

// FAQ node ids follow `{metric}_q{n}` throughout metric_explainers.json
// (enforced by the content-authoring script) — this recovers which metric
// owns a given id without a dedicated lookup endpoint, so a "suggests" chip
// that points into another metric's tree (a genuine cross-metric link, e.g.
// composite_score_q1 -> conflict_q1) can be resolved with one more fetch.
function metricFromFaqId(id: string): string | null {
  const m = id.match(/^(.*)_q\d+$/);
  return m ? m[1] : null;
}

/**
 * The guided-questions feature (Task 12 Surface: FAQ trees). Starts showing
 * every question in `metric`'s tree as tappable chips; tapping one reveals
 * the pre-written answer plus its own "suggests" follow-up chips, which may
 * belong to a different metric's tree entirely.
 */
export function FaqPanel({ metric, initialQuestionId, symbol }: { metric: string; initialQuestionId?: string; symbol?: string }) {
  const { getToken } = useAuth();
  const [homeContent, setHomeContent] = useState<EducationContent | null | undefined>(undefined);
  const [activeMetric, setActiveMetric] = useState(metric);
  const [activeContent, setActiveContent] = useState<EducationContent | null | undefined>(undefined);
  const [activeNode, setActiveNode] = useState<EducationFaqNode | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await fetchEducation(metric);
      if (cancelled) return;
      setHomeContent(c);
      setActiveContent(c);
      setActiveMetric(metric);
      setActiveNode(null);
      if (initialQuestionId) {
        const node = c?.faq.find((n) => n.id === initialQuestionId) ?? null;
        if (node) await openNode(metric, node);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, initialQuestionId]);

  async function openNode(nodeMetric: string, node: EducationFaqNode) {
    setLoading(true);
    let content = nodeMetric === activeMetric ? activeContent : undefined;
    if (nodeMetric !== activeMetric || !content) {
      content = await fetchEducation(nodeMetric);
      setActiveMetric(nodeMetric);
      setActiveContent(content);
    }
    setActiveNode(node);
    setLoading(false);
    const token = await getToken();
    logEducationEngagement(token, { type: "faq_open", metric: nodeMetric, question_id: node.id, symbol });
  }

  async function openSuggestion(id: string) {
    const owner = metricFromFaqId(id);
    if (!owner) return;
    const content = owner === activeMetric ? activeContent : await fetchEducation(owner);
    const node = content?.faq.find((n) => n.id === id);
    if (!node) return;
    const token = await getToken();
    logEducationEngagement(token, { type: "faq_suggest_tap", metric: owner, question_id: id, symbol });
    await openNode(owner, node);
  }

  function backToQuestions() {
    setActiveMetric(metric);
    setActiveContent(homeContent);
    setActiveNode(null);
  }

  if (homeContent === undefined) {
    // FaqPanel is only ever mounted once the user has actually opened it
    // (see InsightChips/ExplainTerm below) — so fetching on mount here
    // still means nothing loads until the user asks for it.
    return <p className="text-xs text-foreground-faint">Loading…</p>;
  }
  if (!homeContent) {
    return <p className="text-xs text-foreground-faint">No guided questions available for this yet.</p>;
  }

  return (
    <div className="space-y-2">
      {activeNode ? (
        <div className="space-y-2">
          <button type="button" onClick={backToQuestions} className="text-xs font-medium text-accent">
            ← All questions
          </button>
          <p className="text-sm font-semibold text-foreground">{activeNode.q}</p>
          <p className="text-sm leading-relaxed text-foreground-muted">{activeNode.a}</p>
          {activeNode.suggests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activeNode.suggests.map((id) => (
                <SuggestChip key={id} id={id} onClick={() => openSuggestion(id)} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {(homeContent.faq ?? []).map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => openNode(metric, node)}
              className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground-muted hover:border-accent hover:text-accent"
            >
              {node.q}
            </button>
          ))}
        </div>
      )}
      {loading && <p className="text-xs text-foreground-faint">Loading…</p>}
    </div>
  );
}

function SuggestChip({ id, onClick }: { id: string; onClick: () => void }) {
  // The chip's own label is the target question's `q` text — fetched lazily
  // via a tiny self-contained loader so the parent doesn't need to await
  // every suggested id's content just to render its label.
  const owner = metricFromFaqId(id);
  const [label, setLabel] = useState<string>(id.replace(/_/g, " "));

  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    fetchEducation(owner).then((c) => {
      if (cancelled) return;
      const node = c?.faq.find((n) => n.id === id);
      if (node) setLabel(node.q);
    });
    return () => {
      cancelled = true;
    };
  }, [owner, id]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:border-accent"
    >
      {label}
    </button>
  );
}
