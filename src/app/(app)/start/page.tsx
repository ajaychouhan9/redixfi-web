import type { Metadata } from "next";
import Link from "next/link";

import { StartHere } from "@/components/app/start/StartHere";

// The page makes no request of its own; a refresh window keeps the cached copy from outliving a deploy (a fully static page is sent with a one-year cache lifetime).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Start here: check an NSE stock in plain words",
  description:
    "New to stocks? Read four plain lines on how to read a company, tick what matters to you, and see the matching NSE companies listed A to Z with their profit, sales growth and dividend yield. Facts only, no buy or sell advice.",
  alternates: { canonical: "/start" },
  openGraph: {
    title: "Start here: check an NSE stock in plain words",
    description: "Four plain lines, three tick boxes and the matching NSE companies A to Z. Facts only, no advice.",
    type: "website",
  },
};

// What this site does and does not do, in plain words. No company is named here, on purpose.
const NOT_DO = "RedixFi shows measured data with its dates and sources. It gives no buy or sell advice, no price forecasts and no ratings. What you do with the facts is your decision, or one to take with a registered adviser.";

/** Static, cacheable page (no server fetch): the steps run in the browser. */
export default function StartHerePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Start here</h1>
      <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
        New to stocks? Read four plain lines, tick what matters to you and see the matching NSE companies, listed A to Z. Open any company and the Overview
        answers seven plain questions from its own reported numbers.
      </p>

      <div className="mt-5">
        <StartHere />
      </div>

      <section className="mt-8 rounded-xl border border-border bg-surface px-4 py-3" aria-labelledby="start-not-do" data-testid="start-guide-card">
        <h2 id="start-not-do" className="text-sm font-semibold">What this site does not do</h2>
        <p className="mt-1 text-sm leading-relaxed text-foreground-muted">{NOT_DO}</p>
      </section>

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
