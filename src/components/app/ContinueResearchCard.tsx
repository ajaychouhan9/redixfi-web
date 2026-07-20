"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getRecentlyViewed, type RecentlyViewedEntry } from "@/lib/recently-viewed";

export function ContinueResearchCard() {
  const [items, setItems] = useState<RecentlyViewedEntry[]>([]);

  useEffect(() => {
    setItems(getRecentlyViewed());
  }, []);

  if (items.length === 0) return null;

  return (
    <Card title="Continue research">
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.symbol}>
            <Link href={`/research/${item.symbol}`} className="flex items-center justify-between py-2 text-sm hover:text-accent">
              <span>
                <span className="font-medium">{item.symbol}</span>{" "}
                <span className="text-foreground-muted">{item.company_name}</span>
              </span>
              <span aria-hidden>›</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
