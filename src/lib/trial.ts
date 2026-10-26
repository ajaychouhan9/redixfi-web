"use client";

import { useEffect, useState } from "react";

import { apiGet } from "@/lib/api/client";

/**
 * Length of the new-account Pro trial, in days. The value lives in ONE place: the API's PRO_TRIAL_DAYS setting, served at
 * GET /config/public. Every text that names the length reads it from here. DISPLAY_FALLBACK_DAYS is used only until the
 * API answers (or if it cannot be reached) so a text never renders blank; it is not a second setting.
 */
export const DISPLAY_FALLBACK_DAYS = 5;

let cached: number | null = null;
let inflight: Promise<number> | null = null;

export async function fetchTrialDays(): Promise<number> {
  if (cached !== null) return cached;
  if (!inflight) {
    inflight = apiGet<{ pro_trial_days: number }>("/config/public", { revalidate: 300 })
      .then((env) => {
        const n = Number(env.data?.pro_trial_days);
        cached = Number.isFinite(n) && n > 0 ? n : DISPLAY_FALLBACK_DAYS;
        return cached;
      })
      .catch(() => DISPLAY_FALLBACK_DAYS)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** "5 days", "1 day". */
export function trialLabel(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

export function useTrialDays(): number {
  const [days, setDays] = useState<number>(cached ?? DISPLAY_FALLBACK_DAYS);
  useEffect(() => {
    let alive = true;
    fetchTrialDays().then((n) => {
      if (alive) setDays(n);
    });
    return () => {
      alive = false;
    };
  }, []);
  return days;
}
