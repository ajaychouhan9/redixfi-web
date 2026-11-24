"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { getUsage } from "@/lib/api/mutations";
import type { AskUsageInfo } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthContext";
import { fmtDay } from "@/lib/my-rules";

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
  const chat = typeof u.chat_limit === "number" ? left(u.chat_limit, u.chat_used ?? 0) : left(u.monthly_limit, u.monthly_used);
  const chatLimit = typeof u.chat_limit === "number" ? u.chat_limit : u.monthly_limit;
  const report = typeof u.report_limit === "number" ? left(u.report_limit, u.report_used ?? 0) : null;
  const resets = u.resets_on ? fmtDay(u.resets_on) ?? u.resets_on : null;
  const free = u.tier === "free" && !u.is_pro_trial;
  return (
    <Card title="Ask AI questions">
      <dl className="grid grid-cols-2 gap-y-2 text-sm" data-testid="ask-usage-card">
        <dt className="text-foreground-muted">{free || u.is_pro_trial ? "Today (chat and reports)" : "Chat, today"}</dt>
        <dd data-testid="ask-usage-today">{today === null ? "—" : `${today} remaining of ${u.daily_limit}`}</dd>
        {chatLimit !== null && (
          <>
            <dt className="text-foreground-muted">Chat, this month</dt>
            <dd data-testid="ask-usage-month">{chat} remaining of {chatLimit}</dd>
          </>
        )}
        {report !== null && (
          <>
            <dt className="text-foreground-muted">Reports, this month</dt>
            <dd data-testid="ask-usage-report">{report} remaining of {u.report_limit}</dd>
          </>
        )}
        {resets && chatLimit !== null && (
          <>
            <dt className="text-foreground-muted">Pools reset on</dt>
            <dd data-testid="ask-usage-resets">{resets}. Nothing carries over.</dd>
          </>
        )}
        <dt className="text-foreground-muted">Add-on</dt>
        <dd data-testid="ask-usage-addon">{u.topup_questions_remaining} remaining (used in chat and in reports, after your plan questions)</dd>
      </dl>
    </Card>
  );
}
