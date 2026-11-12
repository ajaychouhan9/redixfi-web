"use client";

import type { FundamentalsCoverage } from "@/lib/api/types";
import { FILTERS_NOTE } from "@/data/fundamental-screens";
import { quarterDate } from "@/lib/seo/stock-facts";

export { EMPTY_FUND, fundActive, fundChips, fundParams, type FundFilterState } from "./fund-filter-model";
import type { FundFilterState } from "./fund-filter-model";


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
      {coverage.promoter !== undefined && (<>
      <p className="mt-3 text-xs font-semibold text-foreground">Holding, dividend and disclosed activity</p>
      <div className="mt-1 grid grid-cols-2 items-end gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <label className={label}>
          Debt-to-equity at most{count(coverage.de)}
          <input type="number" min={0} step="0.1" value={value.deMax} onChange={(e) => onChange({ deMax: e.target.value })} placeholder="e.g. 1" className={control} />
        </label>
        <label className={label}>
          Promoter holding at least (%){count(coverage.promoter)}
          <input type="number" min={0} max={100} value={value.promoterMin} onChange={(e) => onChange({ promoterMin: e.target.value })} placeholder="e.g. 50" className={control} />
        </label>
        <label className={label}>
          Dividend yield at least (%){count(coverage.dividend_yield)}
          <input type="number" min={0} step="0.1" value={value.dividendYieldMin} onChange={(e) => onChange({ dividendYieldMin: e.target.value })} placeholder="e.g. 2" className={control} />
        </label>
        <label className={label}>
          Promoter pledge at most (%){count(coverage.pledge)}
          <input type="number" min={0} max={100} value={value.pledgeMax} onChange={(e) => onChange({ pledgeMax: e.target.value })} placeholder="e.g. 10" className={control} />
        </label>
        <label className={label}>
          Delivery at least (%){count(coverage.delivery)}
          <input type="number" min={0} max={100} value={value.deliveryMin} onChange={(e) => onChange({ deliveryMin: e.target.value })} placeholder="e.g. 60" className={control} />
        </label>
        <label className={label}>
          Insider trades disclosed, last 30 days{count(coverage.insider_30d)}
          <select value={value.insider} onChange={(e) => onChange({ insider: e.target.value as FundFilterState["insider"] })} className={control}>
            <option value="">Any</option>
            <option value="net_buying">Net buying as disclosed</option>
            <option value="net_selling">Net selling as disclosed</option>
          </select>
        </label>
        <label className="flex h-9 items-center gap-2 self-end rounded-lg border border-border bg-hover px-2 text-xs text-foreground-muted">
          <input type="checkbox" checked={value.deal30d} onChange={(e) => onChange({ deal30d: e.target.checked })} /> Bulk/block deal, last 30 days{count(coverage.deal_30d)}
        </label>
      </div>
      <p className="mt-2 text-[11px] text-foreground-faint">
        Dates of the figures: promoter holding is from the shareholding pattern of {coverage.shareholding_date_latest ? quarterDate(coverage.shareholding_date_latest) : "the latest filing"}; delivery, pledge and insider figures are as of {coverage.measured_as_of ?? "the latest session"}; deals are those disclosed up to {coverage.deal_latest ?? "the latest session"}. Insider filters use the net value of insider trades disclosed in the last 30 days, by trade date. ROCE is not stored, so it cannot be filtered.
      </p>
      </>)}
      <p className="mt-2 text-[11px] text-foreground-faint">
        {FILTERS_NOTE} A stock with no reported figure for a filter is not matched by it. Profit and sales growth compare the latest quarter with the same quarter a year earlier.
        {q ? ` ${q}` : ""}
      </p>
    </fieldset>
  );
}
