"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { DeltaValue } from "@/components/ui/DeltaValue";
import { ProLock } from "@/components/ui/ScValue";
import { getPriceMovers } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthContext";
import { displayName } from "@/lib/company-name";
import { formatNumber } from "@/lib/format";
import { stockPath } from "@/lib/seo/stock-symbol";
import type { PriceMoverRow, PriceMovers } from "@/lib/api/types";

function Rows({ rows, title }: { rows: PriceMoverRow[]; title: string }) {
  return (
    <div className="min-w-0 flex-1">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">{title}</h3>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.symbol}>
            <Link href={stockPath("/signals", r.symbol)} className="block hover:text-accent" data-testid="price-mover-row">
              <span className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-medium">{displayName(r.name) || r.symbol}</span>
                <DeltaValue value={r.pct} kind="pct" />
              </span>
              <span className="flex items-baseline justify-between gap-2 text-xs text-foreground-muted">
                <span>{r.symbol}{typeof r.price === "number" ? ` · ₹${formatNumber(r.price, 2)}` : ""}</span>
                <span className="text-foreground-faint">{r.sc_locked || r.sc === null ? <ProLock /> : `Stock Condition ${r.sc}`}</span>
              </span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-foreground-faint">No stocks to list yet.</li>}
      </ul>
    </div>
  );
}

/** Today's price movers: the top 5 up and down by price (liquid EQ stocks). Name, price and % move are public; the Stock Condition is a second line. */
export function PriceMoversCard({ initial }: { initial: PriceMovers | null }) {
  const { user, loading, getToken } = useAuth();
  const [data, setData] = useState(initial);
  useEffect(() => {
    if (loading || !user) return;
    let alive = true;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const env = await getPriceMovers({ token });
        if (alive) setData(env.data);
      } catch {
        /* keep the server copy */
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, loading, getToken]);

  const title = data?.date && data.as_of_label && !data.as_of_label.includes("IST") ? "Price movers" : "Today\u2019s price movers";
  return (
    <Card title={title} data-testid="price-movers-card">
      {!data ? (
        <p className="text-sm text-foreground-muted">Price movers are not available right now.</p>
      ) : (
        <>
          <p className="mb-2 text-[11px] text-foreground-faint" data-testid="price-movers-asof">{data.as_of_label} · {data.universe}</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Rows rows={data.up} title="Largest price rises" />
            <Rows rows={data.down} title="Largest price falls" />
          </div>
          <p className="mt-3 text-[11px] text-foreground-faint">{data.note}</p>
        </>
      )}
    </Card>
  );
}
