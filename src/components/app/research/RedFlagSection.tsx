import type { ResearchRedFlags, RedFlagCategoryGroup } from "@/lib/api/types";
import { Card } from "@/components/ui/Card";
import { AiLabel } from "@/components/ui/AiLabel";
import { formatDateIst } from "@/lib/format";

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
  if (fiscalYear) return fiscalYear;
  if (filingDate) return formatDateIst(filingDate);
  return "";
}

function CategoryBlock({ group }: { group: RedFlagCategoryGroup }) {
  return (
    <div className="border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{group.category_label}</h3>
        <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
          {group.occurrence_count} occurrence{group.occurrence_count === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-3">
        {group.occurrences.map((occ, i) => (
          <div key={`${occ.filing_id ?? "pledge"}-${i}`} className={i > 0 ? "border-t border-border pt-3" : ""}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="rounded-full bg-neutral-bg px-2 py-0.5 font-semibold uppercase tracking-wide text-foreground-muted">
                  {occ.source_type_label}
                </span>
                <span className="text-foreground-faint">{occurrenceDateLabel(occ.fiscal_year, occ.filing_date)}</span>
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
        ))}
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
  const coverageNote =
    coverage === null
      ? "Governance classification has not yet run for this stock's filed documents."
      : !coverage.complete
        ? `Governance classification is still in progress for this stock (${coverage.classified_chunks} of ${coverage.total_chunks} filed-document sections reviewed so far) — additional flags may surface as it continues.`
        : null;

  return (
    <Card title="Red Flags" titleClassName="text-base" action={<AiLabel />}>
      {data.categories.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          No governance flags identified in {data.symbol}&apos;s filed documents{coverage === null ? " yet" : ""}.
        </p>
      ) : (
        <div className="space-y-4">
          {data.categories.map((group) => (
            <CategoryBlock key={group.category} group={group} />
          ))}
        </div>
      )}
      {coverageNote && <p className="mt-3 border-t border-border pt-2 text-xs text-foreground-faint">{coverageNote}</p>}
    </Card>
  );
}
