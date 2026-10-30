import { apiGet, apiGetBlob, ApiError, type FetchOpts } from "./client";

export interface ReportQuota {
  plan: "anonymous" | "free" | "basic" | "pro" | "trial";
  limit: number;
  used: number;
  remaining: number;
  period: "month" | "trial";
  downloaded: string[];
  sample_only: boolean;
  text: string;
}

export type ReportLock = "login_required" | "plan_locked" | "quota_used" | null;

export interface ReportStatus {
  symbol: string;
  available: boolean;
  code: string | null;
  reason: string | null;
  lock: ReportLock;
  already_downloaded: boolean;
  quota: ReportQuota;
}

export interface SampleReportInfo {
  available: boolean;
  symbol?: string;
  company_name?: string;
  sector?: string | null;
  generated_on?: string;
  generated_at?: string;
  data_as_of?: string;
}

export const getReportStatus = (symbol: string, opts?: FetchOpts) =>
  apiGet<ReportStatus>(`/reports/${encodeURIComponent(symbol)}/status`, opts);

export const getReportQuota = (opts?: FetchOpts) => apiGet<ReportQuota>("/reports/quota", opts);

export const getSampleReportInfo = (opts?: FetchOpts) => apiGet<SampleReportInfo>("/reports/sample/info", opts);

export const downloadReportPdf = (symbol: string, token: string) =>
  apiGetBlob(`/reports/${encodeURIComponent(symbol)}/pdf`, { token });

export const downloadShareCard = (symbol: string) => apiGetBlob(`/reports/${encodeURIComponent(symbol)}/share`);

/** The plain message for a failed report request (the API's own `detail`, else a fixed fallback). */
export function reportErrorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message || "The report could not be prepared. Please try again.";
  if (e instanceof DOMException && e.name === "TimeoutError") return "The report took too long to prepare. Please try again.";
  return "The report could not be prepared. Please try again.";
}
