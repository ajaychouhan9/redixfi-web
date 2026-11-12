import type { SignalsListParams } from "@/lib/api/endpoints";

// Pure model of the Screener's reported-figure filters (kept out of the .tsx so it can be tested without a browser).
/** The Screener's filters on reported figures. A stock with no figure for a field is not matched by a filter on that field. */
export interface FundFilterState {
  peMax: string;
  roeMin: string;
  epsPositive: boolean;
  profitGrowthMin: string;
  salesGrowthMin: string;
  ema200: "" | "above" | "below";
  deMax: string;
  promoterMin: string;
  dividendYieldMin: string;
  pledgeMax: string;
  deliveryMin: string;
  insider: "" | "net_buying" | "net_selling";
  deal30d: boolean;
}

export const EMPTY_FUND: FundFilterState = { peMax: "", roeMin: "", epsPositive: false, profitGrowthMin: "", salesGrowthMin: "", ema200: "",
  deMax: "", promoterMin: "", dividendYieldMin: "", pledgeMax: "", deliveryMin: "", insider: "", deal30d: false };

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
    de_max: num(f.deMax),
    promoter_min: num(f.promoterMin),
    dividend_yield_min: num(f.dividendYieldMin),
    pledge_max: num(f.pledgeMax),
    delivery_pct_min: num(f.deliveryMin),
    insider_30d: f.insider || undefined,
    deal_30d: f.deal30d ? true : undefined,
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
  if (num(f.deMax) !== undefined) out.push({ key: "de", text: `Debt-to-equity ≤ ${f.deMax}`, clear: () => set({ deMax: "" }) });
  if (num(f.promoterMin) !== undefined) out.push({ key: "pro", text: `Promoter holding ≥ ${f.promoterMin}%`, clear: () => set({ promoterMin: "" }) });
  if (num(f.dividendYieldMin) !== undefined) out.push({ key: "dy", text: `Dividend yield ≥ ${f.dividendYieldMin}%`, clear: () => set({ dividendYieldMin: "" }) });
  if (num(f.pledgeMax) !== undefined) out.push({ key: "pl", text: `Promoter pledge ≤ ${f.pledgeMax}%`, clear: () => set({ pledgeMax: "" }) });
  if (num(f.deliveryMin) !== undefined) out.push({ key: "dl", text: `Delivery ≥ ${f.deliveryMin}%`, clear: () => set({ deliveryMin: "" }) });
  if (f.insider) out.push({ key: "in", text: f.insider === "net_buying" ? "Insider net buying (disclosed, 30 days)" : "Insider net selling (disclosed, 30 days)", clear: () => set({ insider: "" }) });
  if (f.deal30d) out.push({ key: "bb", text: "Bulk/block deal disclosed (30 days)", clear: () => set({ deal30d: false }) });
  return out;
}

export const fundActive = (f: FundFilterState) => fundChips(f, () => undefined).length > 0;
