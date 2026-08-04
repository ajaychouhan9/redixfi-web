import Link from "next/link";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { IntradaySession } from "@/lib/api/types";

const STATE_LABEL: Record<string, string> = {
  premarket: "Pre-market",
  live: "Live",
  postmarket: "Closed — recap available",
};

export function IntradayNowCard({ session }: { session: IntradaySession | null }) {
  return (
    <Card>
      {session ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock size={16} className="text-foreground-muted" />
            <div>
              <p className="text-sm font-semibold">Intraday now — {STATE_LABEL[session.state] ?? session.state}</p>
              <p className="mt-0.5 text-xs text-foreground-faint">
                {session.high_severity_events_today} high-severity event(s) today
                {session.risk_off && " · risk-off tone"}
              </p>
            </div>
          </div>
          <Link href="/intraday" className="shrink-0 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground">
            Open
          </Link>
        </div>
      ) : (
        <p className="text-sm text-foreground-muted">Intraday data unavailable right now.</p>
      )}
    </Card>
  );
}
