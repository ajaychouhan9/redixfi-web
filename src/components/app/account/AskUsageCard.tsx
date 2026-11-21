"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { getUsage } from "@/lib/api/mutations";
import type { AskUsageInfo } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthContext";

const left = (limit: number | null, used: number | null) => (limit === null ? null : Math.max(0, limit - (used ?? 0)));

/** Ask AI question counts on the Account page (21 Nov 2026). The Ask AI panel shows only "Today"; the month and the add-on balance are here. */
export function AskUsageCard() {
  const { getToken } = useAuth();
  const [u, setU] = useState<AskUsageInfo | null>(null);
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      try { setU((await getUsage(token)).ask_redixfi); } catch { /* the card just stays hidden */ }
    })();
  }, [getToken]);
  if (!u) return null;
  const today = left(u.daily_limit, u.daily_used);
  const month = left(u.monthly_limit, u.monthly_used);
  return (
    <Card title="Ask AI questions">
      <dl className="grid grid-cols-2 gap-y-2 text-sm" data-testid="ask-usage-card">
        <dt className="text-foreground-muted">Today</dt>
        <dd data-testid="ask-usage-today">{today === null ? "—" : `${today} remaining of ${u.daily_limit}`}</dd>
        {u.monthly_limit !== null && (
          <>
            <dt className="text-foreground-muted">This month</dt>
            <dd data-testid="ask-usage-month">{month} remaining of {u.monthly_limit}</dd>
          </>
        )}
        <dt className="text-foreground-muted">Add-on</dt>
        <dd data-testid="ask-usage-addon">{u.topup_questions_remaining} remaining</dd>
      </dl>
    </Card>
  );
}
