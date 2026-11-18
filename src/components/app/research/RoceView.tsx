import { DataTable } from "@/components/seo/DataTable";
import {
  ROCE_FORMULA, ROCE_HOW_BODY, ROCE_HOW_TITLE, ROCE_LABEL, ROCE_NOT_APPLICABLE, ROCE_NOT_AVAILABLE, ROCE_SOURCE, ROCE_TABLE_HEAD, ROCE_TABLE_NOTE, ROCE_TABLE_TITLE,
  roceState, roceTableRows, type RoceBlock,
} from "@/lib/roce";

/** Return on capital employed, next to return on equity on the Annual report tab (19 Nov 2026). Static markup; no script, no request. */
export function RoceView({ roce }: { roce: RoceBlock | null | undefined }) {
  const state = roceState(roce);
  const rows = roceTableRows(roce);
  return (
    <div className="mt-3 rounded-lg border border-border bg-surface px-3 py-2" data-testid="roce-block">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-faint">{ROCE_LABEL}</p>
      {state.kind === "figure" && (
        <>
          <p className="text-sm font-medium tabular-nums" data-testid="roce-value">
            {state.value} <span className="text-xs font-normal text-foreground-muted" data-testid="roce-year">({state.year})</span>
          </p>
          <p className="text-[11px] text-foreground-muted">{ROCE_SOURCE}</p>
          {state.caution && <p className="text-[11px] text-foreground-muted" data-testid="roce-caution">{state.caution}</p>}
        </>
      )}
      {state.kind === "not_applicable" && <p className="text-sm text-foreground-muted" data-testid="roce-not-applicable">{ROCE_NOT_APPLICABLE}</p>}
      {state.kind === "missing" && <p className="text-sm text-foreground-muted" data-testid="roce-missing">{ROCE_NOT_AVAILABLE}</p>}
      {state.kind !== "not_applicable" && (
        <details className="mt-1 text-xs text-foreground-muted" data-testid="roce-how">
          <summary className="cursor-pointer underline-offset-2 hover:underline">{ROCE_HOW_TITLE}</summary>
          <p className="mt-1">{ROCE_FORMULA}</p>
          <p className="mt-1">{ROCE_HOW_BODY}</p>
        </details>
      )}
      {rows.length > 0 && (
        <div className="mt-2" data-testid="roce-table">
          <p className="mb-1 text-[11px] text-foreground-muted">{ROCE_TABLE_NOTE}</p>
          <DataTable caption={ROCE_TABLE_TITLE} head={ROCE_TABLE_HEAD} rows={rows} />
        </div>
      )}
    </div>
  );
}
