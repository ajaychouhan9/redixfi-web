import type { ResearchRedFlags, RedFlagCategoryGroup } from "@/lib/api/types";
import { Card } from "@/components/ui/Card";
import { AiLabel } from "@/components/ui/AiLabel";
import { formatDateIst } from "@/lib/format";
import {
  SUMMARY_HEADING,
  SUMMARY_NOTE,
  RED_FLAG_CATEGORY_LABELS,
  RED_FLAG_RADAR_TITLE,
} from "@/lib/redFlagCategories";

/**
 * Red Flags (Task 2, 2026-09-19) — core/red_flag_view.py::get_symbol_red_flags().
 * Zero LLM generation at request time: every `finding` string here was
 * written once, at classification time, by data-pipeline/risk_flag_backfill.py —
 * this component only renders what the backend already grouped/sorted.
 *
 * Grouped by category, each with its FULL chronological occurrence
 * history (never flattened into one synthetic statement — the task's
 * locked requirement), mirroring AnnualReportSummaryCard/ConcallSummary's
 * chip-row + finding-text + source-link visual pattern so this section
 * reads as a natural sibling of the two sections directly above it.
 *
 * Coverage is surfaced explicitly so an empty/short result is never
 * misread as "no governance risk" — the historical classification
 * backlog is still processing (see docs/00_MASTER_CONTEXT.md).
 */

function occurrenceDateLabel(fiscalYear: string | null, filingDate: string | null): string {
  if (filingDate && fiscalYear) return `${formatDateIst(filingDate)} (${fiscalYear})`;
  if (filingDate) return formatDateIst(filingDate);
  if (fiscalYear) return fiscalYear;
  return "Date not available";
}

const GROUP_LABELS: Record<string, string> = {
  Recent: "Recent (last 12 months)",
  Earlier: "Earlier (1-3 years ago)",
  Older: "Older (3+ years ago)",
};

function CategoryBlock({ group }: { group: RedFlagCategoryGroup }) {
  return (
    <div className="border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-foreground-faint">Disclosure type</span>
        <h3 className="text-sm font-semibold text-foreground">{RED_FLAG_CATEGORY_LABELS[group.category] ?? group.category_label}</h3>
        <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
          {group.occurrence_count} occurrence{group.occurrence_count === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-3">
        {group.occurrences.map((occ, i) => {
          const grp = occ.recency_group;
          const prevGrp = i > 0 ? group.occurrences[i - 1].recency_group : undefined;
          return (
          <div
            key={`${occ.filing_id ?? "pledge"}-${i}`}
            className={`${i > 0 ? "border-t border-border pt-3" : ""} ${grp === "Older" ? "opacity-60" : ""}`}
          >
            {grp && grp !== prevGrp && (
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                {GROUP_LABELS[grp] ?? grp}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="rounded-full bg-neutral-bg px-2 py-0.5 font-semibold uppercase tracking-wide text-foreground-muted">
                  {occ.source_type_label}
                </span>
                <span className="text-foreground-faint">{occurrenceDateLabel(occ.fiscal_year, occ.filing_date)}</span>
                {occ.quality_note && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground-faint">{occ.quality_note}</span>
                )}
                {occ.chunk_count > 1 && (
                  <span className="text-foreground-faint">· {occ.chunk_count} passages</span>
                )}
              </div>
              {occ.source_pdf_url && (
                <a
                  href={occ.source_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-hover px-3 py-1.5 text-[13px] font-medium text-foreground-muted hover:text-foreground"
                >
                  View source filing →
                </a>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{occ.finding}</p>
          </div>
          );
        })}
      </div>
    </div>
  );
}

export function RedFlagSection({ data }: { data: ResearchRedFlags | undefined }) {
  // Defensive against a frontend deploy landing before the backend restart
  // that adds this field (see MarketActivityCard.tsx's identical note) —
  // renders nothing rather than an ErrorBoundary fallback during that gap.
  if (!data) return null;
  const coverage = data.coverage;
  const summaryLine = data.categories
    .map((g) => `${RED_FLAG_CATEGORY_LABELS[g.category] ?? g.category_label} (${g.occurrence_count} ${g.occurrence_count === 1 ? "item" : "items"})`)
    .join("; ");
  // `coverage` is null when per-stock coverage isn't measured; that says
  // nothing about this stock, so no note (the empty state already says "yet").
  const coverageNote =
    coverage && !coverage.complete
      ? `Governance classification is still in progress for this stock (${coverage.classified_chunks} of ${coverage.total_chunks} filed-document sections reviewed so far) — additional disclosures may surface as it continues.`
      : null;

  return (
    <Card
      title={RED_FLAG_RADAR_TITLE}
      titleClassName="text-base"
      headerClassName="flex-wrap gap-y-2"
      action={<AiLabel className="shrink-0 whitespace-nowrap" />}
    >
      {data.categories.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          No governance disclosures identified in {data.symbol}&apos;s filed documents{coverage === null ? " yet" : ""}.
        </p>
      ) : (
        <div className="space-y-4">
          <div data-testid="governance-summary" className="rounded-lg border border-border bg-hover px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{SUMMARY_HEADING}</p>
            <p className="mt-1 text-sm text-foreground">{summaryLine}</p>
            <p className="mt-1 text-xs text-foreground-faint">{SUMMARY_NOTE}</p>
          </div>
          {data.categories.map((group) => (
            <CategoryBlock key={group.category} group={group} />
          ))}
        </div>
      )}
      {coverageNote && <p className="mt-3 border-t border-border pt-2 text-xs text-foreground-faint">{coverageNote}</p>}
    </Card>
  );
}
