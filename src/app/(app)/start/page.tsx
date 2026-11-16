import type { Metadata } from "next";
import Link from "next/link";

import { StartHere } from "@/components/app/start/StartHere";

export const metadata: Metadata = {
  title: "Start here: check an NSE stock in plain words",
  description:
    "New to stocks? Answer three questions and see the NSE companies that match, listed A to Z. Then read any company in the simple view: profit, sales, debt, promoters, insider trades, points to watch and price, in plain words. Facts only, no buy or sell advice.",
  alternates: { canonical: "/start" },
  openGraph: {
    title: "Start here: check an NSE stock in plain words",
    description: "Three questions, then the matching NSE companies A to Z, and a plain-words view of any stock. Facts only, no advice.",
    type: "website",
  },
};

// Plain-words guide cards. No company is named here, on purpose.
const GUIDES = [
  {
    title: "What is a share?",
    body: "A share is a small piece of a company. When you own one you own that piece: a part of what it earns and what it owns. Its price is simply what the last person paid for one on the exchange.",
  },
  {
    title: "Why people spread their money",
    body: "One company can have a year that goes wrong for reasons nobody saw coming. Holding several different companies, or sectors, means one surprise moves a smaller part of your money. This is called diversification.",
  },
  {
    title: "How to read “points to watch”",
    body: "These are statements we found in a company’s own annual report or earnings call: an auditor’s remark, a pending court case, dealings with related companies, pledged promoter shares. Each one links to the filing, so read it yourself. An item is a fact to look into, not a verdict on the company.",
  },
  {
    title: "What this site does not do",
    body: "RedixFi shows measured data with its dates and sources. It gives no buy or sell advice, no price forecasts and no ratings. What you do with the facts is your decision, or one to take with a registered adviser.",
  },
];

/** Static, cacheable page (no server fetch): the three questions run in the browser. */
export default function StartHerePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Start here</h1>
      <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
        New to stocks? Answer three questions to see which NSE companies match, listed A to Z. Then open any company and read it in the
        simple view: seven plain questions answered from its own reported numbers.
      </p>

      <div className="mt-5">
        <StartHere />
      </div>

      <p className="mt-4 text-sm">
        Or type a company name on the{" "}
        <Link href="/" className="font-medium text-accent hover:underline">
          home page
        </Link>{" "}
        and open its stock page. The simple view is the default there.
      </p>

      <h2 className="mt-8 text-base font-semibold">Four things in plain words</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <div key={g.title} className="rounded-xl border border-border bg-surface px-4 py-3" data-testid="start-guide-card">
            <h3 className="text-sm font-semibold">{g.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground-muted">{g.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm">
        Know markets already?{" "}
        <Link href="/signals" className="font-medium text-accent hover:underline">
          Open the full Screener
        </Link>
        .
      </p>
    </div>
  );
}
