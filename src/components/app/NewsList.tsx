import { Chip } from "@/components/ui/Chip";
import { formatDateTimeIst } from "@/lib/format";
import type { NewsItem } from "@/lib/api/types";

const SEVERITY_TONE = { high: "down", medium: "amber", low: "neutral", none: "neutral" } as const;

export function NewsList({ items, emptyText = "No related news." }: { items: NewsItem[]; emptyText?: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-foreground-muted">{emptyText}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((n) => (
        <li key={n.uuid} className="text-sm">
          <div className="mb-0.5 flex flex-wrap items-center gap-1.5 text-xs text-foreground-faint">
            <Chip tone={SEVERITY_TONE[(n.severity as keyof typeof SEVERITY_TONE) ?? "none"] ?? "neutral"}>{n.severity}</Chip>
            {n.category !== "none" && <Chip tone="accent">{n.category.replace(/_/g, " ")}</Chip>}
            <span>{n.source}</span>
            <span>· {formatDateTimeIst(n.published_at)}</span>
          </div>
          <a href={n.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-accent">
            {n.headline}
          </a>
        </li>
      ))}
    </ul>
  );
}
