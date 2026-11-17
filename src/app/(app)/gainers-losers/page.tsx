import type { Metadata } from "next";

import { TopMovers } from "@/components/app/market/TopMovers";

const TITLE = "Top Gainers and Losers on the NSE: the five largest price rises and falls | RedixFi";
const DESCRIPTION = "The five largest price rises and the five largest price falls among liquid NSE stocks, with the date of the figures. Not a forecast or a recommendation.";

// No request on the server (the list loads in the browser); a refresh window stops the cached page outliving a deploy.
export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/gainers-losers" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", url: "https://www.redixfi.com/gainers-losers" },
};

export default function GainersLosersPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <h1 className="text-xl font-semibold">Top Gainers &amp; Losers</h1>
      <TopMovers />
    </div>
  );
}
