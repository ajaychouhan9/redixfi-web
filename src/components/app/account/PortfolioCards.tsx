import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { PortfolioAnalytics, PortfolioBrief } from "@/lib/api/types";

/**
 * Task 16 Parts A + B — personalized portfolio brief + portfolio-level
 * analytics. Both render server-templated text verbatim (data-pipeline/
 * portfolio_brief_builder.py and core/portfolio_analytics.py) — this
 * component adds no wording of its own beyond labels/structure, same
 * "the text is generated server-side, never here" posture
 * SummaryCard.tsx's own docstring already documents for the sibling
 * watchlist/sector summary cards.
 */

export function PortfolioBriefCard({ brief }: { brief: PortfolioBrief | null }) {
  if (!brief) {
    return (
      <Card title="Your portfolio brief">
        <p className="text-sm text-foreground-muted">
          No portfolio brief yet — one is generated after each trading day's close for accounts with a watchlist.
        </p>
      </Card>
    );
  }
  return (
    <Card title={brief.title}>
      <p className="text-sm leading-relaxed">{brief.body}</p>
      {brief.biggest_movers.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {brief.biggest_movers.map((m) => (
            <li key={m.symbol} className="flex items-center justify-between py-1.5 text-sm">
              <Link href={`/signals/${m.symbol}`} className="font-medium hover:text-accent">
                {m.symbol}
              </Link>
              <span className={m.delta_1d > 0 ? "text-up" : m.delta_1d < 0 ? "text-down" : "text-neutral"}>
                {m.delta_1d > 0 ? "+" : ""}
                {m.delta_1d}
                {m.note ? ` · ${m.note}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-foreground-faint">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export function PortfolioAnalyticsCard({ data }: { data: PortfolioAnalytics }) {
  const { concentration, delivery_trend, event_risk, pledge_exposure } = data;

  if (data.symbol_count === 0) {
    return (
      <Card title="Portfolio analytics">
        <p className="text-sm text-foreground-muted">
          Add stocks to your watchlist to see concentration, delivery, event-risk and pledge exposure here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card title="Industry concentration">
        <p className="text-sm leading-relaxed">{concentration.summary}</p>
        {concentration.groups.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {concentration.groups.map((g) => (
              <li key={g.industry} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">{g.industry}</span>
                <span className="whitespace-nowrap text-foreground-muted">
                  {g.count} ({g.pct.toFixed(0)}%)
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Delivery trend">
        <p className="text-sm leading-relaxed">{delivery_trend.summary}</p>
      </Card>

      <Card title="Event-risk exposure">
        <p className="text-sm leading-relaxed">{event_risk.summary}</p>
        {event_risk.symbols.length > 0 && (
          <ul className="mt-3 divide-y divide-border">
            {event_risk.symbols.map((s) => (
              <li key={s.symbol} className="flex items-center justify-between py-1.5 text-sm">
                <Link href={`/signals/${s.symbol}`} className="font-medium hover:text-accent">
                  {s.symbol}
                </Link>
                <span className="text-xs text-foreground-muted">{s.categories.join(", ")}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Pledge exposure">
        <p className="text-sm leading-relaxed">{pledge_exposure.summary}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat label="Highest pledge" value={pledge_exposure.max_symbol ? `${pledge_exposure.max_symbol} · ${pledge_exposure.max_pledge_pct?.toFixed(0)}%` : "Not available"} />
          <Stat label="Stocks above high-pledge threshold" value={String(pledge_exposure.high_count)} />
        </div>
      </Card>
    </div>
  );
}
