"use client";

import { useEffect, useState } from "react";
import { apiGetPaged } from "@/lib/api/client";
import type { NewsItem } from "@/lib/api/types";
import { NewsList } from "@/components/app/NewsList";
import { AiLabel } from "@/components/ui/AiLabel";

export function EventsTab() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetPaged<NewsItem>("/news", { params: { today: true, intraday: true, size: 30 } })
      .then((env) => {
        setItems(env.data);
        setTotal(env.page_info.total);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <AiLabel />
        <p className="text-xs text-foreground-muted">AI read and classified {total} live event(s) today.</p>
      </div>
      {loading ? <p className="text-sm text-foreground-muted">Loading…</p> : <NewsList items={items} emptyText="No live events flagged yet today." />}
    </div>
  );
}
