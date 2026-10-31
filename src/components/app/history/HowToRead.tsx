"use client";

import { useState } from "react";

import { Fold } from "@/components/app/history/ui";

const POINTS: string[] = [
  "A session is a trading day of that stock. Sessions before and after a day are counted in the stock's own trading days, never calendar days: for a Monday move, -1 is the Friday, or the previous trading day if Friday was a holiday.",
  "A move is the close against the previous close, corrected for splits and bonuses. Days on which the exchange changed the previous close are left out.",
  "Volume vs 20d avg is the last 5 sessions' volume against the average of the 20 sessions before them.",
  "Trend (10d) is the change of the close over the last 10 sessions. Delivery is the share of traded volume that was delivered.",
  "Not available (n/a) means the reading could not be measured on that session, for example in the first weeks of a stock's stored history. It never means the reading was absent.",
  "Insider trade disclosed and Bulk or block deal use the date the information was published (for a disclosure, after 15:30 it counts from the next day), never the trade date, so nothing is used before it was public. They look at the session and the 4 sessions before it. Names of persons are never shown. Dates before our stored record show Not available.",
  "Counts are a past record of measured data only.",
];

export function HowToRead({ readings }: { readings: { key: string; label: string; rule: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Fold title="How to read this" open={open} onToggle={() => setOpen((o) => !o)} testid="history-how">
      <ul className="list-disc space-y-1.5 pl-5 text-xs text-foreground-muted">
        {POINTS.map((t) => (
          <li key={t}>{t}</li>
        ))}
        {readings.map((r) => (
          <li key={r.key}>
            <span className="font-medium text-foreground">{r.label}:</span> {r.rule}
          </li>
        ))}
      </ul>
    </Fold>
  );
}
