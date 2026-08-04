import type { Metadata } from "next";
import { getMarketOverview } from "@/lib/api/endpoints";
import { FreshnessDot } from "@/components/ui/FreshnessDot";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Data sources & update times" };

// Cross-checked against prediction_engine/scheduler.py's live DAILY_JOBS
// (per this task's explicit "verify against the real source script, don't
// trust the list as given" instruction — Task 15 caught a worse version of
// this same mistake with the predictions_snapshot/attribution_reports
// naming). "Composite signal scores" was stale here (~07:50, pre-Task-10)
// — measured_signals_builder.py moved to 16:30 in Task 10 so the score
// reflects the session that just closed; fixed to match.
//
// UNRESOLVED, flagged not fixed: nse_delivery_sync.py (delivery %) and
// macro_fi_di.py (FII/DII flow) do not appear ANYWHERE in
// prediction_engine/scheduler.py's job list, nor in any other scheduler in
// this repo — grepped the whole tree, zero hits beyond each script's own
// filename. data_freshness_check.py DOES monitor both collections (2-day
// staleness tolerance), so they're plausibly kept current by something
// outside this repo (VM-level cron?) rather than genuinely abandoned, but
// that could not be confirmed from this sandbox (no live Mongo/VM access).
// Left both at "Daily" rather than guess in either direction — founder
// should confirm what actually populates these two before this cadence
// claim is fully trustworthy.
const SOURCES = [
  { name: "Price & volume history", cadence: "Daily, after market close", detail: "NSE/BSE exchange candle data." },
  { name: "Delivery percentage", cadence: "Daily", detail: "Exchange delivery-vs-volume data per stock." },
  { name: "Composite signal scores", cadence: "Daily, ~16:30 IST", detail: "Computed after market close from the day's measured signals." },
  { name: "FII / DII flow", cadence: "Daily", detail: "Institutional net-flow figures." },
  { name: "Options positioning (PCR)", cadence: "Intraday snapshots", detail: "Put-call ratio and open interest by expiry." },
  { name: "Promoter pledge", cadence: "Quarterly", detail: "NSE pledge disclosures." },
  { name: "Insider filings", cadence: "As disclosed", detail: "Exchange insider-trading disclosures." },
  { name: "News classification", cadence: "Several times daily", detail: "AI-classified for category, scope and severity." },
  { name: "Intraday scanner", cadence: "Live during market hours", detail: "Volume ratio, VWAP side and range state, computed from 15-minute candles." },
];

export default async function DataSourcesPage() {
  let fresh: boolean | null = null;
  try {
    const env = await getMarketOverview();
    fresh = env.meta.data_fresh;
  } catch {
    fresh = null;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-xl font-semibold">Data sources & update times</h1>
      {fresh !== null && (
        <div className="mb-4">
          <FreshnessDot fresh={fresh} />
        </div>
      )}
      <Card>
        <ul className="divide-y divide-border">
          {SOURCES.map((s) => (
            <li key={s.name} className="py-3 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-foreground-faint">{s.cadence}</span>
              </div>
              <p className="mt-0.5 text-foreground-muted">{s.detail}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
