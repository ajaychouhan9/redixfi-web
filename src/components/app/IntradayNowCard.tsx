import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { IntradaySession } from "@/lib/api/types";

const STATE_LABEL: Record<string, string> = {
  premarket: "Pre-market",
  live: "Live",
  postmarket: "Closed — recap available",
};

export function IntradayNowCard({ session }: { session: IntradaySession | null }) {
  return (
    <Card title="Intraday now">
      {session ? (
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="font-medium">{STATE_LABEL[session.state] ?? session.state}</p>
            <p className="text-xs text-foreground-muted">
              {session.high_severity_events_today} high-severity event(s) today
              {session.risk_off && " · risk-off tone"}
            </p>
          </div>
          <Link href="/intraday" className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
            Open
          </Link>
        </div>
      ) : (
        <p className="text-sm text-foreground-muted">Intraday data unavailable right now.</p>
      )}
    </Card>
  );
}
