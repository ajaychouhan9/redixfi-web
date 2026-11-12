import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { COMMON_QUESTION_GROUPS, COMMON_QUESTION_NOTE } from "@/lib/common-questions";

export const metadata: Metadata = {
  title: "How RedixFi measures its readings",
  description:
    "What each measured reading on a RedixFi stock page is (trend, sector rank, delivery, volume, RSI, put-call ratio, promoter pledge, FII flow), where the data comes from, how often it updates and what it does not tell you.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How RedixFi measures its readings",
    description:
      "Each measured reading on a stock page, where its data comes from, how often it updates and the limits.",
    type: "website",
  },
};

const INPUT_GROUPS = [
  {
    name: "Trend",
    what: "Whether the stock is moving with or against its recent path. Calculated from price.",
    example: "Up over the last ten sessions and above its 20-day average.",
  },
  {
    name: "Sector rank",
    what: "Where the stock's measured setup sits among other stocks in the same industry.",
    example: "A position in the upper part of its industry group.",
  },
  {
    name: "Delivery",
    what: "How much of the traded quantity in the latest delivery session available at the daily run was actually delivered, compared with the stock's own recent average.",
    example: "Delivery well above its 20-session average.",
  },
  {
    name: "Volume",
    what: "Whether participation is heavier or lighter than usual.",
    example: "Five-session volume running above the prior average.",
  },
  {
    name: "RSI",
    what: "A 14-session momentum reading on a 0–100 scale. Calculated from price.",
    example: "RSI in the upper half of its range.",
  },
  {
    name: "Put-call ratio",
    what: "A put-call ratio from the options market.",
    example: "The ratio sitting near the middle of its usual band.",
  },
  {
    name: "Promoter pledge",
    what: "The share of promoter holding pledged, and whether it is rising or falling.",
    example: "Pledged shares low and unchanged over the last few months.",
  },
  {
    name: "FII flow",
    what: "Market-wide foreign-institutional buying over the last five sessions.",
    example: "Net buyers on three of the last five sessions.",
  },
];

const ALSO_SHOWN = [
  {
    name: "Screener",
    text: "Lists stocks that match filters you choose, such as price against the 200-day EMA, P/E, ROE, profit and sales growth, debt-to-equity, promoter holding, promoter pledge, dividend yield, delivery, insider trades and bulk/block deals. Every filter you use adds a column showing the measured value for each stock, with its unit and the date of the figure, and \"n/a\" where the source gave none. A filter is a filter on reported data, not a recommendation. You can choose your columns and, on Pro or during the free trial, export the result as CSV.",
    href: "/signals",
  },
  {
    name: "Saved screens",
    text: "Save a set of filters, sort order and columns under a name, reopen it later and see which stocks are new in it since you last looked. Free keeps 1, Basic 5 and Pro 20.",
  },
  {
    name: "Ask AI",
    text: "Answers questions from the measured data RedixFi stores, and says where a figure is missing. It declines questions that ask for advice or for what a stock will do next.",
  },
  {
    name: "Market Activity",
    text: "Insider trades, bulk and block deals and concall summaries, shown as disclosed by the exchange and the companies.",
    href: "/market-activity",
  },
  {
    name: "Market Rewind",
    text: "Shows how often a measured condition occurred in the past, as counts and dates only.",
    href: "/rewind",
  },
  {
    name: "7-Day Review and weekly pages",
    text: "A look back at the last seven sessions across the market, and a page for each week, built from the same stored data.",
    href: "/signals/7-day-review",
  },
  {
    name: "Company report PDF",
    text: "A downloadable report for one company with price, growth, peers, ownership, filings and sources.",
    href: "/sample-report",
  },
];

const SOURCES = [
  ["Prices and volume", "Daily exchange data for the completed session."],
  ["Delivery", "NSE end-of-day delivery data. It is published after the daily run, so the reading uses the latest delivery available at run time — usually the previous session."],
  ["Industry", "The industry classification for the stock, used to build its peer group."],
  ["Options", "Daily open-interest data. A reading older than seven days is ignored."],
  ["Promoter pledge", "Company filings, latest reading compared with an earlier reading in the past few months."],
  ["FII flows", "Daily cash-market flows for foreign institutions."],
  ["News", "Headlines from the last five days that name the company, shown with their source."],
] as const;

const FAQ = [
  {
    q: "Is a reading a buy or sell recommendation?", // compliance-ignore — it is the question being answered, not a recommendation
    a: "No. Each reading is a measured fact about stored market data. None of them is advice, a forecast, a target, or a buy or sell signal, and RedixFi does not combine them into one score.",
  },
  {
    q: "Which session's delivery do the readings use?",
    a: "NSE publishes end-of-day delivery data after the daily run. The readings use the latest delivery available at run time, which is usually the previous session. The stock page shows the date where it is known.",
  },
  {
    q: "Why can a reading change from one day to the next?",
    a: "The inputs change with each session: price trend, delivery, volume, momentum, options positioning, pledge and market flows. Small daily moves are normal.",
  },
  {
    q: "Why is a reading sometimes missing?",
    a: "An input may be unavailable, or the stock may be held while a corporate action is checked. In that case the price-based readings are withheld, and a note on the page explains why.",
  },
  {
    q: "How often are the readings updated?",
    a: "Once per trading day, after the market closes. The app serves the latest stored session, so they do not change during the day.",
  },
  {
    q: "Is volatility one of the readings?",
    a: "It is a separate measure of how much a stock's closing price has moved from day to day over the last 21 sessions, shown under Volatility on the stock page and in the Volatility ranking.",
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
        <h1 className="text-xl font-semibold">How RedixFi measures its readings</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          RedixFi shows measured facts about each stock, one reading at a time: each is calculated from stored market data for one stock on one
          trading session. They are not combined into a score and none of them is a recommendation.
        </p>
      </header>

      <Card title="The readings">
        <p className="mb-3 text-sm text-foreground-muted">
          Each reading below is measured from stored market data and shown on its own.
        </p>
        <ul className="space-y-3">
          {INPUT_GROUPS.map((g) => (
            <li key={g.name} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
              <p className="text-sm font-medium">
                {g.name}
              </p>
              <p className="mt-0.5 text-sm text-foreground-muted">{g.what}</p>
              <p className="mt-0.5 text-xs text-foreground-faint">Example: {g.example}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-border pt-3 text-xs text-foreground-muted">
          When some inputs are missing, the readings that can be measured are shown and the others are marked not available. Trend and RSI are
          calculated from price. Insider activity is shown on the stock page as disclosed.
        </p>
      </Card>

      <Card title="What else RedixFi shows">
        <ul className="space-y-3" data-testid="what-else">
          {ALSO_SHOWN.map((g) => (
            <li key={g.name} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
              <p className="text-sm font-medium">
                {g.href ? <Link href={g.href} className="hover:text-accent hover:underline">{g.name}</Link> : g.name}
              </p>
              <p className="mt-0.5 text-sm text-foreground-muted">{g.text}</p>
            </li>
          ))}
        </ul>
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
          The readings are computed once per trading day, after the session closes. They are stored, and the app serves the latest stored
          session. They do not change during the day.
        </p>
      </Card>

      <Card title="How to read a change">
        <p className="text-sm text-foreground-muted">
          A reading can move from one day to the next because the inputs moved. Small daily changes are normal; one day is not a trend.
          When the price basis changed, for example after a split, the price-based readings are withheld rather than reported as a move.
        </p>
      </Card>

      <section id="common-questions" aria-labelledby="common-questions-title" className="space-y-3">
        <div>
          <h2 id="common-questions-title" className="text-base font-semibold">Common questions</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Short explanations of the measures on a stock page. The same answers are available in Ask AI at no cost to your question
            allowance. {COMMON_QUESTION_NOTE}
          </p>
        </div>
        {[{ topic: "About the readings", items: FAQ.map((f, i) => ({ id: `about-${i}`, q: f.q, a: f.a })) }, ...COMMON_QUESTION_GROUPS].map((g) => (
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

      <Card title="What the readings are not">
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
            Confirmed splits and bonuses are adjusted before the readings are calculated. While a corporate action is being
            checked, or after an unexplained large price jump, price-based readings
            are held back, and some earlier days are marked “not comparable”.
          </li>
          <li>
            <span className="font-medium text-foreground">New or illiquid stocks.</span> Fewer sessions can
            mean fewer inputs; small industry groups are not ranked. The readings that can be measured are shown.
          </li>
          <li>
            <span className="font-medium text-foreground">BE and BZ (trade-for-trade) stocks.</span> Delivery in
            the BE and BZ series is close to 100% by construction, so it is not used as a signal and is shown
            as not applicable.
          </li>
          <li>
            <span className="font-medium text-foreground">Data can be delayed or missing.</span> The page
            shows the date of the data it is serving.
          </li>
          <li>
            <span className="font-medium text-foreground">One day at a time.</span> The readings describe
            measured data, updated once a day.
          </li>
        </ul>
      </Card>

      <p className="text-sm text-foreground-muted">
        You can see the readings on any{" "}
        <Link href="/signals" className="text-accent underline">
          stock page
        </Link>
        .
      </p>
    </div>
  );
}
