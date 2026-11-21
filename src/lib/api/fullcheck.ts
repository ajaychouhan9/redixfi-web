import { apiGet, apiGetBlob, apiMutate, type FetchOpts } from "./client";

export interface FullCheckEstimateItem {
  symbol: string;
  cost: number;
  cached: boolean;
  reason: string;
}

export interface FullCheckEstimate {
  items: FullCheckEstimateItem[];
  total: number;
  max_companies: number;
  locked: boolean;
  locked_message: string | null;
}

export interface FullCheckItem {
  symbol: string;
  status: "queued" | "running" | "done" | "failed";
  pct: number;
  step: string;
  cost: number;
  cached: boolean;
}

export interface FullCheckRun {
  id: string;
  status: "queued" | "running" | "done";
  items: FullCheckItem[];
  total_cost: number | null;
  progress_pct: number;
  done: number;
  total: number;
  created_at: string | null;
  footer: string;
}

export interface FullCheckSection {
  id: string;
  title: string;
  status: "ok" | "not_available";
  answer: string;
  table: { columns: { key: string; label: string }[]; rows: Record<string, unknown>[] } | null;
  sources: { label: string | null; detail: string | null; url: string | null }[];
}

export interface FullCheckReport {
  symbol: string;
  company_name: string;
  generated_at: string;
  source_dates: Record<string, string | null>;
  sections: FullCheckSection[];
  numbers: { columns: { key: string; label: string }[]; rows: Record<string, string | number | null>[]; notes: string[]; as_of: string | null; available: boolean };
  ownership: { holdings: { label: string; text: string; source: string | null }[]; insiders: FullCheckSection; deals: FullCheckSection };
  /** The fifth question: price change and delivery for the last 10 days (reports made before 21 Nov 2026 do not have it). */
  price?: FullCheckSection;
  footer: string;
}

export const estimateFullCheck = async (symbols: string[], opts?: FetchOpts) =>
  (await apiMutate<FullCheckEstimate>("/fullcheck/estimate", "POST", { symbols }, opts)).data;

/** `link` ties the run to a saved result of a rule, so the rule's report can include these answers. */
export const startFullCheck = async (symbols: string[], opts?: FetchOpts, link?: { rule_id: string; rule_run_id: string }) =>
  (await apiMutate<{ run: FullCheckRun; charged: number }>("/fullcheck/runs", "POST", { symbols, ...(link ?? {}) }, opts)).data;

export const getFullCheckRun = async (id: string, opts?: FetchOpts) => (await apiGet<{ run: FullCheckRun }>(`/fullcheck/runs/${encodeURIComponent(id)}`, opts)).data.run;

export const listFullCheckRuns = async (opts?: FetchOpts) => (await apiGet<{ runs: FullCheckRun[] }>("/fullcheck/runs", opts)).data.runs;

export const getFullCheckReport = async (id: string, symbol: string, opts?: FetchOpts) =>
  (await apiGet<{ report: FullCheckReport }>(`/fullcheck/runs/${encodeURIComponent(id)}/${encodeURIComponent(symbol)}`, opts)).data.report;

export const downloadFullCheckPdf = (id: string, symbol: string, token: string) =>
  apiGetBlob(`/fullcheck/runs/${encodeURIComponent(id)}/${encodeURIComponent(symbol)}/pdf`, { token });

/** One row per stock per question for the whole run: the answer, its source and its date (the numbers-only CSV was removed). */
export const downloadFullCheckCsv = (id: string, token: string) => apiGetBlob(`/fullcheck/runs/${encodeURIComponent(id)}/answers.csv`, { token });
