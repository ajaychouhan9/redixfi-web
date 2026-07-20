import { Card } from "@/components/ui/Card";
import { AiLabel } from "@/components/ui/AiLabel";
import type { DailyBrief } from "@/lib/api/types";

export function AiDailyBriefCard({ brief }: { brief: DailyBrief | null }) {
  return (
    <Card title="AI Daily Brief" action={<AiLabel />}>
      {brief ? (
        <p className="text-sm leading-relaxed text-foreground">{brief.brief_text}</p>
      ) : (
        <p className="text-sm text-foreground-muted">No brief generated yet today — check back after market open.</p>
      )}
    </Card>
  );
}
