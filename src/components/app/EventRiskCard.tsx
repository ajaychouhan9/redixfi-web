import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { AiLabel } from "@/components/ui/AiLabel";
import { formatTimeIst } from "@/lib/format";
import type { NewsItem, NewsToday } from "@/lib/api/types";

const SEVERITY_TONE = { high: "down", medium: "amber", low: "neutral", none: "neutral" } as const;

export function EventRiskCard({ newsToday, items }: { newsToday: NewsToday | null; items: NewsItem[] }) {
  return (
    <Card title="Event Risk Today" action={<AiLabel />}>
      {newsToday && (
        <p className="mb-2 text-xs text-foreground-muted">
          AI read {newsToday.items_read} item(s) today — {newsToday.items_flagged} flagged.
        </p>
      )}
      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.uuid} className="text-sm">
            <div className="mb-0.5 flex items-center gap-2 text-xs text-foreground-faint">
              <Chip tone={SEVERITY_TONE[(n.severity as keyof typeof SEVERITY_TONE) ?? "none"] ?? "neutral"}>{n.severity}</Chip>
              {n.category !== "none" && <Chip tone="accent">{n.category.replace(/_/g, " ")}</Chip>}
              <span>{formatTimeIst(n.published_at)}</span>
            </div>
            <a href={n.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
              {n.headline}
            </a>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-foreground-faint">No flagged events right now.</li>}
      </ul>
      <Link href="/news" className="mt-2 inline-block text-xs font-medium text-accent">
        See all news
      </Link>
    </Card>
  );
}
