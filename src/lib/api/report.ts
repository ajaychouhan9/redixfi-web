// "Create report" (24 Nov 2026): the estimate, the job and its progress, the on-screen report and the typed-question check. All calls are the person's own.
import { apiGet, apiMutate } from "./client";

const base = (ruleId: string, runId: string) => `/my-screens/${encodeURIComponent(ruleId)}/runs/${encodeURIComponent(runId)}`;

export interface ReportEstimate {
  fits: boolean;
  free_one_stock?: boolean;
  message?: string;
  stocks?: number;
  per_stock?: number;
  total_pairs?: number;
  already_answered?: number;
  uses?: number;
  left?: { plan: number; addon: number; resets_on: string | null; daily: boolean };
  after?: number | null;
  options?: { stocks: number; questions: number; uses: number }[];
  free?: boolean;
  max_stocks?: number;
  max_answers?: number;
}
export interface ReportJob {
  id: string;
  run_id: string;
  rule_id: string;
  status: "queued" | "running" | "done";
  total: number;
  done: number;
  failed: number;
  /** 25 Nov 2026: answers this result already had (not asked, not charged) and answers this report made. */
  reused?: number;
  new_answers?: number;
  progress_pct: number;
}
export interface ReportBody {
  symbols: string[];
  questions: string[];
  custom: string[];
}
export interface OnScreenReport {
  name: string;
  run_date: string | null;
  figures_as_of: string | null;
  chosen: { symbol: string; company: string; slots: { key: string; question: string; asked: boolean; text: string; date: string; sources: { label?: string; detail?: string }[] }[] }[];
}

export async function questionCheck(token: string, question: string): Promise<{ ok: boolean; message?: string; question?: string }> {
  const env = await apiMutate<{ ok: boolean; message?: string; question?: string }>("/my-screens/question-check", "POST", { question }, { token });
  return env.data;
}
export async function reportEstimate(token: string, ruleId: string, runId: string, body: ReportBody): Promise<ReportEstimate> {
  const env = await apiMutate<ReportEstimate>(`${base(ruleId, runId)}/report/estimate`, "POST", body, { token });
  return env.data;
}
export async function reportCreate(token: string, ruleId: string, runId: string, body: ReportBody): Promise<{ job: ReportJob; uses: number; already_answered: number }> {
  const env = await apiMutate<{ job: ReportJob; uses: number; already_answered: number }>(`${base(ruleId, runId)}/report`, "POST", body, { token });
  return env.data;
}
export async function reportJob(token: string, ruleId: string, runId: string, jobId: string): Promise<ReportJob> {
  const env = await apiGet<{ job: ReportJob }>(`${base(ruleId, runId)}/report/jobs/${encodeURIComponent(jobId)}`, { token });
  return env.data.job;
}
export async function reportActive(token: string, ruleId: string, runId: string): Promise<ReportJob | null> {
  const env = await apiGet<{ job: ReportJob | null }>(`${base(ruleId, runId)}/report/active`, { token });
  return env.data.job;
}
export async function reportOnScreen(token: string, ruleId: string, runId: string): Promise<{ report: OnScreenReport; answered_stocks: number }> {
  const env = await apiGet<{ report: OnScreenReport; answered_stocks: number }>(`${base(ruleId, runId)}/report.json`, { token });
  return env.data;
}
export async function reportsActive(token: string): Promise<ReportJob[]> {
  const env = await apiGet<{ jobs: ReportJob[] }>("/my-screens/_reports/active", { token });
  return env.data.jobs;
}
