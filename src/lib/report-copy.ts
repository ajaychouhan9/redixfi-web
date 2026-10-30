/**
 * Texts and numbers for the company report. The allowances live in ONE place: the API settings
 * (REPORT_QUOTA_BASIC_MONTHLY / REPORT_QUOTA_PRO_MONTHLY / REPORT_QUOTA_TRIAL), served at GET /config/public as
 * `report_quota`. DISPLAY_FALLBACK is used only until the API answers; it mirrors the API defaults and is not a setting.
 */
export const REPORT_DISCLAIMER = "Measured data, not investment advice. Not a recommendation or a forecast.";

export const REPORT_QUOTA_FALLBACK = { basic_monthly: 3, pro_monthly: 15, trial: 3 } as const;

export interface ReportQuotaConfig {
  basic_monthly: number;
  pro_monthly: number;
  trial: number;
}

export function lockedText(q: ReportQuotaConfig = REPORT_QUOTA_FALLBACK): string {
  return `Company report PDFs are included in Basic (${q.basic_monthly} different stocks a month) and Pro (${q.pro_monthly} a month). The free sample report is open to everyone.`;
}

export const SAMPLE_INSIDE = [
  "Snapshot: price, 52-week range, Conditions Reading with its last 5 sessions, volatility, delivery and volume",
  "Is it growing: revenue, profit and margin, with an 8-quarter chart",
  "Versus peers: P/E, P/B, ROE, net margin, debt-to-equity and dividend yield",
  "Who owns it: promoter, FII and MF holding with the change since last quarter, pledge, insider trades, bulk and block deals",
  "Upcoming and recent events",
  "Annual report and concall summaries, with the source and date of each",
  "Governance items in three separate parts: what filings state, calculated metrics, automated observations",
  "Data sources with as-of dates, method notes and limits",
] as const;
