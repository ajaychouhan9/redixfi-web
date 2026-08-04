"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
            <Link href={`/research/${item.symbol}`} className="flex items-center justify-between py-2.5 text-sm transition-colors hover:text-accent">
              <span className="flex items-center gap-2">
                <span className="font-mono font-semibold">{item.symbol}</span>
                <span className="text-foreground-faint">{item.company_name}</span>
              </span>
              <ChevronRight size={14} className="text-foreground-faint" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
