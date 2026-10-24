import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { COMMON_QUESTION_GROUPS, COMMON_QUESTION_NOTE } from "@/lib/common-questions";

export const metadata: Metadata = {
  title: "How the composite score works",
  description:
    "What the 0–100 RedixFi composite score measures, which market inputs it uses, how often it updates, and what it does not tell you.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How the composite score works",
    description:
      "The inputs behind the 0–100 composite score, how often it updates, how to read a change, and the limits.",
    type: "website",
  },
};

const INPUT_GROUPS = [
  {
    name: "Price trend",
    weight: "a larger part",
    what: "Whether the stock is moving with or against its recent path.",
    example: "Up over the last ten sessions and above its 20-day average.",
  },
  {
    name: "Industry standing",
    weight: "a larger part",
    what: "How the stock's measured setup compares with other stocks in the same industry.",
    example: "Ranked near the top of its industry group.",
  },
  {
    name: "Delivery",
    weight: "a larger part",
    what: "How much of the traded quantity in the latest delivery session available at the score run was actually delivered, compared with the stock's own recent average.",
    example: "Delivery well above its 20-session average.",
  },
  {
    name: "Volume",
    weight: "a smaller part",
    what: "Whether participation is heavier or lighter than usual.",
    example: "Five-session volume running above the prior average.",
  },
  {
    name: "Momentum (RSI)",
    weight: "a smaller part",
    what: "A 14-session momentum reading on a 0–100 scale.",
    example: "RSI in the upper half of its range.",
  },
  {
    name: "Options positioning",
    weight: "a smaller part",
    what: "A put-call ratio from the options market.",
    example: "The ratio sitting near the middle of its usual band.",
  },
  {
    name: "Promoter pledge",
    weight: "a smaller part",
    what: "The share of promoter holding pledged, and whether it is rising or falling.",
    example: "Pledged shares low and unchanged over the last few months.",
  },
  {
    name: "FII backdrop",
    weight: "a smaller part",
    what: "Market-wide foreign-institutional buying over the last five sessions.",
    example: "Net buyers on three of the last five sessions.",
  },
];

const SOURCES = [
  ["Prices and volume", "Daily exchange data for the completed session."],
  ["Delivery", "NSE end-of-day delivery data. It is published after the daily score run, so the score uses the latest delivery available at run time — usually the previous session."],
  ["Industry", "The industry classification for the stock, used to build its peer group."],
  ["Options", "Daily open-interest data. A reading older than seven days is ignored."],
  ["Promoter pledge", "Company filings, latest reading compared with an earlier reading in the past few months."],
  ["FII flows", "Daily cash-market flows for foreign institutions."],
  ["News", "Classified events from the last five days."],
] as const;

const FAQ = [
  {
    q: "Is the composite score a buy or sell recommendation?", // compliance-ignore — it is the question being answered, not a recommendation
    a: "No. It summarises measured market data. It is not advice, a forecast, a target, or a buy or sell signal.",
  },
  {
    q: "What does a higher score mean?",
    a: "More of the measured inputs currently read stronger than weaker. It is not a probability, and it does not say what happens next.",
  },
  {
    q: "Which session's delivery does the score use?",
    a: "NSE publishes end-of-day delivery data after the daily score run. The score uses the latest delivery available at run time, which is usually the previous session. The stock page and Score history show the delivery date where it is known.",
  },
  {
    q: "Why can the score change from one day to the next?",
    a: "The inputs change with each session: price trend, delivery, volume, momentum, options positioning, pledge and market flows. Small daily moves are normal.",
  },
  {
    q: "Why is a score or its change sometimes missing?",
    a: "An input may be unavailable, or the stock may be held while a corporate action is checked. In that case the price-based readings and the change are withheld, and a note on the page explains why.",
  },
  {
    q: "How often is the score updated?",
    a: "Once per trading day, after the market closes. The app serves the latest stored session, so it does not change during the day.",
  },
  {
    q: "Where can I see previous scores?",
    a: "On a stock page, under Score history. Free shows the last 3 sessions, Basic 5 and Pro 10.",
  },
  {
    q: "Is volatility part of the score?",
    a: "No: volatility is a separate measure of how much a stock's closing price has moved from day to day over the last 21 sessions, shown under Volatility on the stock page and in the Volatility ranking, and it does not change the composite score.",
  },
];

export default function HowItWorksPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [...FAQ, ...COMMON_QUESTION_GROUPS.flatMap((g) => g.items.map((it) => ({ q: it.q, a: it.a })))].map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header>
        <h1 className="text-xl font-semibold">How the composite score works</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          The composite score is a 0–100 summary of measured market data for one stock on one trading
          session. It is built from several groups of inputs, each measuring something different. It is
          not a recommendation.
        </p>
      </header>

      <Card title="What goes into the score">
        <p className="mb-3 text-sm text-foreground-muted">
          Each group is measured from stored market data and combined into one score. Some groups carry
          a larger part of the score; others carry a smaller part. The exact weights are internal.
        </p>
        <ul className="space-y-3">
          {INPUT_GROUPS.map((g) => (
            <li key={g.name} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
              <p className="text-sm font-medium">
                {g.name} <span className="font-normal text-foreground-faint">— {g.weight}</span>
              </p>
              <p className="mt-0.5 text-sm text-foreground-muted">{g.what}</p>
              <p className="mt-0.5 text-xs text-foreground-faint">Example: {g.example}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-border pt-3 text-xs text-foreground-muted">
          A flagged news event in the last five days applies a fixed deduction. Insider activity is shown
          on the stock page but does not change the score.
        </p>
      </Card>

      <Card title="Where the data comes from">
        <ul className="space-y-2">
          {SOURCES.map(([name, text]) => (
            <li key={name} className="text-sm">
              <span className="font-medium">{name}:</span>{" "}
              <span className="text-foreground-muted">{text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-border pt-3 text-sm text-foreground-muted">
          The score is computed once per trading day, after the session closes (the run is scheduled for
          16:30 IST). It is stored, and the app serves the latest stored session — it does not change
          during the day.
        </p>
      </Card>

      <Card title="How to read a change">
        <p className="text-sm text-foreground-muted">
          A score can move from one day to the next because the inputs moved. Small daily changes are
          normal; one day is not a trend.
        </p>
        <ul className="mt-2 space-y-2 text-sm text-foreground-muted">
          <li>
            <span className="font-medium text-foreground">Score history</span> shows one row per stored
            session: the inputs, the score, the change, direction chips and a plain-words reason line. It
            shows what moved, not how many points each input contributed.
          </li>
          <li>
            <span className="font-medium text-foreground">Why did this change?</span> lists the components
            that changed. If a classified news event was matched to that stock on that day, it names the
            event; otherwise it says the cause is not in the data. The cause is never inferred.
          </li>
          <li>
            When the price basis changed — for example after a split — the change is withheld rather than
            reported as a move.
          </li>
        </ul>
      </Card>

      <section id="common-questions" aria-labelledby="common-questions-title" className="space-y-3">
        <div>
          <h2 id="common-questions-title" className="text-base font-semibold">Common questions</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Short explanations of the measures on a stock page. The same answers are available in Ask AI at no cost to your question
            allowance. {COMMON_QUESTION_NOTE}
          </p>
        </div>
        {COMMON_QUESTION_GROUPS.map((g) => (
          <Card key={g.topic} title={g.topic}>
            <div className="divide-y divide-border">
              {g.items.map((it) => (
                <details key={it.id} className="group py-2 first:pt-0 last:pb-0">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-medium text-foreground">
                    <span className="min-w-0">{it.q}</span>
                    <span aria-hidden className="shrink-0 text-foreground-faint transition-transform group-open:rotate-180">▾</span>
                  </summary>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground-muted">{it.a}</p>
                </details>
              ))}
            </div>
          </Card>
        ))}
      </section>

      <Card title="What the score is not">
        <ul className="space-y-2 text-sm text-foreground-muted">
          <li>It is not investment advice.</li>
          <li>It is not a forecast of what will happen next.</li>
          <li>It is not a target.</li>
          <li>It is not a buy or sell signal.</li>
        </ul>
        <p className="mt-3 text-sm font-medium">Measured market data, not investment advice.</p>
      </Card>

      <Card title="Limits">
        <ul className="space-y-2 text-sm text-foreground-muted">
          <li>
            <span className="font-medium text-foreground">Splits, bonuses, demergers and consolidations.</span>{" "}
            Confirmed splits and bonuses are adjusted before scoring. While a corporate action is being
            checked, or after an unexplained large price jump, price-based readings and the score change
            are held back, and some earlier days are marked “not comparable”.
          </li>
          <li>
            <span className="font-medium text-foreground">New or illiquid stocks.</span> Fewer sessions can
            mean fewer inputs; small industry groups are not ranked. The score is then built from what is
            available.
          </li>
          <li>
            <span className="font-medium text-foreground">BE and BZ (trade-for-trade) stocks.</span> Delivery in
            the BE and BZ series is close to 100% by construction, so it is not used as a signal and is shown
            as not applicable.
          </li>
          <li>
            <span className="font-medium text-foreground">Data can be delayed or missing.</span> The page
            shows the date of the score it is serving.
          </li>
          <li>
            <span className="font-medium text-foreground">One reading, one day.</span> The score is a
            relative summary of measured data, updated once a day.
          </li>
        </ul>
      </Card>

      <Card title="Common questions">
        <dl className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q}>
              <dt className="text-sm font-medium">{item.q}</dt>
              <dd className="mt-0.5 text-sm text-foreground-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <p className="text-sm text-foreground-muted">
        You can see the score and its history on any{" "}
        <Link href="/signals" className="text-accent underline">
          stock page
        </Link>
        .
      </p>
    </div>
  );
}
