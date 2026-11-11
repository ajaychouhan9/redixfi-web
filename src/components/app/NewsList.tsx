import { Chip } from "@/components/ui/Chip";
import { formatDateTimeIst } from "@/lib/format";
import type { NewsItem } from "@/lib/api/types";
import { sourceName } from "@/lib/news-source";

export function NewsList({ items, emptyText = "No related news." }: { items: NewsItem[]; emptyText?: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-foreground-muted">{emptyText}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((n) => (
        <li key={n.uuid} className="text-sm">
          <div className="mb-0.5 flex flex-wrap items-center gap-1.5 text-xs text-foreground-faint">
            <span>{sourceName(n.source)}</span>
            <span>· {formatDateTimeIst(n.published_at)}</span>
            {n.category !== "none" && <Chip tone="accent">{n.category.replace(/_/g, " ")}</Chip>}
          </div>
          <a href={n.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-accent">
            {n.headline}
          </a>
        </li>
      ))}
    </ul>
  );
}
