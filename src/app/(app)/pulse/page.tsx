import type { Metadata } from "next";

import { PulseTab } from "@/components/app/market/PulseTab";

const TITLE = "Market Pulse: Nifty 50, Bank Nifty and how many NSE stocks rose or fell | RedixFi";
const DESCRIPTION = "The Nifty 50 and Bank Nifty levels, how many stocks rose and fell, and the Market Pulse card, each with its date. Not a forecast or a recommendation.";

// No request on the server (the figures load in the browser); a refresh window stops the cached page outliving a deploy.
export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/pulse" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", url: "https://www.redixfi.com/pulse" },
};

export default function PulsePage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <h1 className="text-xl font-semibold">Market Pulse</h1>
      <PulseTab />
      <p className="text-xs text-foreground-muted">Past record of measured data. Not a forecast or a recommendation.</p>
    </div>
  );
}
