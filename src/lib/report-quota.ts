"use client";

import { useEffect, useState } from "react";

import { apiGet } from "@/lib/api/client";
import { REPORT_QUOTA_FALLBACK, type ReportQuotaConfig } from "@/lib/report-copy";

let cached: ReportQuotaConfig | null = null;
let inflight: Promise<ReportQuotaConfig> | null = null;

/** The report allowances from GET /config/public (one source: the API settings). */
export async function fetchReportQuotaConfig(): Promise<ReportQuotaConfig> {
  if (cached) return cached;
  if (!inflight) {
    inflight = apiGet<{ report_quota?: Partial<ReportQuotaConfig> }>("/config/public", { revalidate: 300 })
      .then((env) => {
        const q = env.data?.report_quota ?? {};
        const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
        cached = {
          basic_monthly: num(q.basic_monthly, REPORT_QUOTA_FALLBACK.basic_monthly),
          pro_monthly: num(q.pro_monthly, REPORT_QUOTA_FALLBACK.pro_monthly),
          trial: num(q.trial, REPORT_QUOTA_FALLBACK.trial),
        };
        return cached;
      })
      .catch(() => ({ ...REPORT_QUOTA_FALLBACK }))
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useReportQuotaConfig(): ReportQuotaConfig {
  const [q, setQ] = useState<ReportQuotaConfig>(cached ?? { ...REPORT_QUOTA_FALLBACK });
  useEffect(() => {
    let live = true;
    fetchReportQuotaConfig().then((v) => {
      if (live) setQ(v);
    });
    return () => {
      live = false;
    };
  }, []);
  return q;
}
