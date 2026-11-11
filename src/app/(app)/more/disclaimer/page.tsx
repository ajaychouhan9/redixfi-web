import { STANDARD_LINE } from "@/lib/compliance/standard-line";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "RedixFi publishes measured market data and AI-written summaries for information only. It is not investment advice or a recommendation to trade.",
  alternates: { canonical: "/more/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 text-sm leading-relaxed">
      <h1 className="text-xl font-semibold">Disclaimer</h1>

      <section>
        <h2 className="mb-1 font-semibold">Registration status</h2>
        <p>
          {STANDARD_LINE}
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">What this product is</h2>
        <p>
          RedixFi reports measured, historical and current market data — price and volume history, delivery
          percentages, options positioning, foreign/domestic institutional flow, promoter pledge levels, insider
          filings, and AI-classified news. Every figure describes something that has already happened or is
          currently observed. Nothing on this platform states or implies what a stock will do next.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">AI-generated content</h2>
        <p>
          Narratives, summaries and the smart screener are AI-generated from the same measured data shown elsewhere
          on the page, and are labeled &ldquo;AI-generated&rdquo; wherever they appear. They use past/present tense
          only and translate user-authored filters — they do not rank stocks, express a view, or answer
          forward-looking questions.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">No ranking, no recommendation</h2>
        <p>
          Default sort order on every list is by name or market capitalization — never by a model-derived reading.
          Any sort or filter applied is chosen by the user, not by RedixFi.
        </p>
      </section>


      <section>
        <h2 className="mb-1 font-semibold">Data quality & freshness</h2>
        <p>
          Data is sourced from exchange feeds and third-party providers and may be delayed or occasionally
          incomplete. A &ldquo;data delayed&rdquo; indicator is shown wherever freshness cannot be confirmed, in
          place of numbers that could otherwise look current.
        </p>
      </section>
    </div>
  );
}
