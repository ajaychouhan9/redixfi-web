import { FULL_DISCLAIMER_LINE } from "@/lib/compliance/standard-line";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "RedixFi shows market data for information only. It is not advice to buy or sell any stock and it makes no predictions.",
  alternates: { canonical: "/more/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 text-sm leading-relaxed" data-testid="disclaimer-page">
      <h1 className="text-xl font-semibold">Disclaimer</h1>

      <section>
        <h2 className="mb-1 font-semibold">In plain words</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>RedixFi shows market data for information only.</li>
          <li>It is not advice to buy or sell any stock.</li>
          <li>It makes no predictions.</li>
          <li>Data may be delayed or incomplete.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Status</h2>
        <p data-testid="full-disclaimer-line">{FULL_DISCLAIMER_LINE}</p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">What this product is</h2>
        <p>
          RedixFi reports measured, historical and current market data: price and volume history, delivery
          percentages, options positioning, institutional flow, promoter pledge levels, insider filings, and
          AI-classified news. Every figure describes something that has already happened or is currently observed.
          Nothing on this platform states or implies what a stock will do next.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">AI-generated content</h2>
        <p>
          Summaries and the smart screener are AI-generated from the same measured data shown elsewhere on the page,
          and are labelled &ldquo;AI-generated&rdquo; where they appear. They can miss or misstate items, so check the
          source filing. They do not rank stocks, express a view, or answer forward-looking questions.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Data quality and freshness</h2>
        <p>
          Data comes from NSE and company filings and may be delayed or occasionally incomplete. NSE prices are
          delayed by 15 minutes. A &ldquo;data delayed&rdquo; mark is shown wherever freshness cannot be confirmed.
        </p>
      </section>
    </div>
  );
}
