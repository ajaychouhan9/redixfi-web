"use client";

import type { FundamentalsCoverage } from "@/lib/api/types";
import type { SignalsListParams } from "@/lib/api/endpoints";
import { FILTERS_NOTE } from "@/data/fundamental-screens";
import { quarterDate } from "@/lib/seo/stock-facts";

/** The Screener's filters on reported figures. A stock with no figure for a field is not matched by a filter on that field. */
export interface FundFilterState {
  peMax: string;
  roeMin: string;
  epsPositive: boolean;
  profitGrowthMin: string;
  salesGrowthMin: string;
  ema200: "" | "above" | "below";
}

export const EMPTY_FUND: FundFilterState = { peMax: "", roeMin: "", epsPositive: false, profitGrowthMin: "", salesGrowthMin: "", ema200: "" };

const num = (v: string): number | undefined => {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export function fundParams(f: FundFilterState): Partial<SignalsListParams> {
  return {
    pe_max: num(f.peMax),
    roe_min: num(f.roeMin),
    eps_positive: f.epsPositive ? true : undefined,
    profit_growth_min: num(f.profitGrowthMin),
    sales_growth_min: num(f.salesGrowthMin),
    ema200_state: f.ema200 || undefined,
  };
}

export function fundChips(f: FundFilterState, set: (patch: Partial<FundFilterState>) => void): { key: string; text: string; clear: () => void }[] {
  const out: { key: string; text: string; clear: () => void }[] = [];
  if (num(f.peMax) !== undefined) out.push({ key: "pe", text: `P/E ≤ ${f.peMax}`, clear: () => set({ peMax: "" }) });
  if (num(f.roeMin) !== undefined) out.push({ key: "roe", text: `ROE ≥ ${f.roeMin}%`, clear: () => set({ roeMin: "" }) });
  if (f.epsPositive) out.push({ key: "eps", text: "EPS above zero", clear: () => set({ epsPositive: false }) });
  if (num(f.profitGrowthMin) !== undefined) out.push({ key: "pg", text: `Profit growth ≥ ${f.profitGrowthMin}%`, clear: () => set({ profitGrowthMin: "" }) });
  if (num(f.salesGrowthMin) !== undefined) out.push({ key: "sg", text: `Sales growth ≥ ${f.salesGrowthMin}%`, clear: () => set({ salesGrowthMin: "" }) });
  if (f.ema200) out.push({ key: "ema", text: `Price ${f.ema200} 200-day EMA`, clear: () => set({ ema200: "" }) });
  return out;
}

export const fundActive = (f: FundFilterState) => fundChips(f, () => undefined).length > 0;

const label = "flex flex-col gap-1 text-[11px] text-foreground-muted";
const control = "h-9 rounded-lg border border-border bg-hover px-2 text-sm text-foreground";
const count = (n: number | undefined) => (n === undefined ? "" : ` · checks ${n.toLocaleString("en-IN")} stocks`);

export function FundamentalFilters({ value, onChange, coverage }: { value: FundFilterState; onChange: (patch: Partial<FundFilterState>) => void; coverage: FundamentalsCoverage }) {
  const q = coverage.quarter_end_latest ? `Quarterly figures: each company's latest reported quarter, ended ${quarterDate(coverage.quarter_end_earliest)} to ${quarterDate(coverage.quarter_end_latest)} (most are ${quarterDate(coverage.quarter_end_median)}).` : "";
  return (
    <fieldset className="mt-2 rounded-lg border border-border/70 p-2" data-testid="fundamental-filters">
      <legend className="px-1 text-xs font-semibold text-foreground">Reported figures</legend>
      <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <label className={label}>
          P/E at most{count(coverage.pe)}
          <input type="number" min={0} value={value.peMax} onChange={(e) => onChange({ peMax: e.target.value })} placeholder="e.g. 30" className={control} />
        </label>
        <label className={label}>
          ROE at least (%){count(coverage.roe)}
          <input type="number" value={value.roeMin} onChange={(e) => onChange({ roeMin: e.target.value })} placeholder="e.g. 20" className={control} />
        </label>
        <label className={label}>
          Profit growth at least (%){count(coverage.profit_growth)}
          <input type="number" value={value.profitGrowthMin} onChange={(e) => onChange({ profitGrowthMin: e.target.value })} placeholder="e.g. 20" className={control} />
        </label>
        <label className={label}>
          Sales growth at least (%){count(coverage.sales_growth)}
          <input type="number" value={value.salesGrowthMin} onChange={(e) => onChange({ salesGrowthMin: e.target.value })} placeholder="e.g. 20" className={control} />
        </label>
        <label className={label}>
          Price vs 200-day EMA{count(coverage.ema200)}
          <select value={value.ema200} onChange={(e) => onChange({ ema200: e.target.value as FundFilterState["ema200"] })} className={control}>
            <option value="">Any</option>
            <option value="above">Above the 200-day EMA</option>
            <option value="below">Below the 200-day EMA</option>
          </select>
        </label>
        <label className="flex h-9 items-center gap-2 self-end rounded-lg border border-border bg-hover px-2 text-xs text-foreground-muted">
          <input type="checkbox" checked={value.epsPositive} onChange={(e) => onChange({ epsPositive: e.target.checked })} /> EPS above zero{count(coverage.eps)}
        </label>
      </div>
      <p className="mt-2 text-[11px] text-foreground-faint">
        {FILTERS_NOTE} A stock with no reported figure for a filter is not matched by it. Profit and sales growth compare the latest quarter with the same quarter a year earlier.
        {q ? ` ${q}` : ""}
      </p>
    </fieldset>
  );
}
