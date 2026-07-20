// Education delivery system, Part 3 of the screen spec: ~25 static
// templates, one per metric, live values injected at render time, no LLM
// cost. Two-level ceiling — `summary` (one breath, always shown) and
// `deeper` (learn-more expansion: what/why/pattern). Never a third level.
//
// All copy follows the pattern-literacy rule ("has historically
// indicated", never "will") and explains both bullish and bearish
// readings with equal weight in the same template (compliance symmetry).

export interface MetricExplainer {
  key: string;
  term: string;
  summary: (ctx: Record<string, string | number>) => string;
  deeper: {
    whatItMeasures: string;
    whyTradersWatch: string;
    patternNote: string;
  };
}

const EXPLAINERS: MetricExplainer[] = [
  {
    key: "composite_score",
    term: "Composite Signal Score",
    summary: (c) => `${c.score}/100 is a measured summary of ${c.count ?? "several"} observed signals for ${c.symbol} — not a prediction.`,
    deeper: {
      whatItMeasures: "A 0-100 rollup of trend, delivery, sector standing, FII flow and options positioning, all measured from data that has already happened.",
      whyTradersWatch: "It compresses several checklist items into one comparable number across the whole universe.",
      patternNote: "A higher score has historically coincided with more signals pointing the same way, not with future direction.",
    },
  },
  {
    key: "delta_1d",
    term: "Score change",
    summary: (c) => `The score moved ${c.delta} point(s) since the previous session${c.reason ? ` — ${c.reason}` : ""}.`,
    deeper: {
      whatItMeasures: "The day-over-day change in composite score, driven by whichever underlying signal flipped state.",
      whyTradersWatch: "A same-direction streak of moves has historically been read differently from a single one-off jump.",
      patternNote: "This describes what already changed — it does not project tomorrow's move.",
    },
  },
  {
    key: "trend_10d",
    term: "10-session trend",
    summary: (c) => `${c.symbol} moved ${c.pct}% over the last 10 sessions and has spent ${c.dmaSessions ?? "some"} session(s) above its 20-day average.`,
    deeper: {
      whatItMeasures: "Price change over the last 10 trading sessions, plus how long price has held above/below its 20-day moving average.",
      whyTradersWatch: "Sustained time above the 20-DMA has historically been read as trend confirmation rather than a single day's move.",
      patternNote: "Describes a completed 10-session window — not a forecast of the next one.",
    },
  },
  {
    key: "delivery_pct",
    term: "Delivery %",
    summary: (c) => `${c.symbol}'s delivery was ${c.pct}% today vs a ${c.avg}% 20-day average — share of traded volume taken as actual delivery rather than intraday.`,
    deeper: {
      whatItMeasures: "The portion of traded volume that settled as delivery (shares actually taken/given, not squared off intraday).",
      whyTradersWatch: "Rising delivery alongside rising price has historically been read as conviction-based buying; the same combination on falling price has historically been read as conviction-based selling.",
      patternNote: "Delivery is a measured settlement fact for the day, not an indicator of what happens next.",
    },
  },
  {
    key: "sector_rank",
    term: "Sector rank",
    summary: (c) => `${c.symbol} ranks #${c.rank} of ${c.count} in ${c.sector} by composite score today.`,
    deeper: {
      whatItMeasures: "Where this stock's composite score sits relative to every other stock measured in its sector today.",
      whyTradersWatch: "Traders often compare a stock's setup against its sector peers rather than in isolation.",
      patternNote: "A rank is a same-day comparison, not a durable ordering.",
    },
  },
  {
    key: "fii_flow",
    term: "FII flow",
    summary: (c) => `Foreign institutional flow was net ${c.direction} on ${c.days} of the last 5 sessions.`,
    deeper: {
      whatItMeasures: "Net foreign institutional buy/sell activity, counted by session over the trailing 5-day window.",
      whyTradersWatch: "A multi-day streak in one direction has historically been watched more closely than a single day's flow.",
      patternNote: "This reports flow that already occurred, not an outlook on future flow.",
    },
  },
  {
    key: "pcr",
    term: "Put-Call Ratio (PCR)",
    summary: (c) => `PCR is ${c.pcr} today, read as ${c.band}.`,
    deeper: {
      whatItMeasures: "The ratio of open put option interest to open call option interest for the stock's current expiry.",
      whyTradersWatch: "A PCR skewed toward calls or puts has historically been read as a hint about where options writers are positioned — not a forecast.",
      patternNote: "PCR describes current options positioning, which can and does change session to session.",
    },
  },
  {
    key: "vwap",
    term: "VWAP",
    summary: (c) => `VWAP (₹${c.vwap}) is today's average price weighted by volume — ${c.symbol} trading ${c.side} it means buyers have paid ${c.side} the day's average, which traders read as ${c.side === "above" ? "buying strength" : "selling pressure"}.`,
    deeper: {
      whatItMeasures: "The volume-weighted average price paid for the stock so far today.",
      whyTradersWatch: "Price holding above or below VWAP through the session has historically been used as an intraday strength/weakness gauge.",
      patternNote: "VWAP resets every session — it is a same-day measurement, not a level with forward significance.",
    },
  },
  {
    key: "volume_ratio",
    term: "Volume ratio",
    summary: (c) => `Today's volume is ${c.ratio}x the 5-day average.`,
    deeper: {
      whatItMeasures: "Today's traded volume divided by the trailing 5-day average volume.",
      whyTradersWatch: "Elevated volume alongside a price move has historically been read as more participation behind that move; muted volume has historically been read as the opposite.",
      patternNote: "Describes today's participation level only.",
    },
  },
  {
    key: "rsi",
    term: "RSI (14)",
    summary: (c) => `RSI is ${c.rsi}, in the ${c.zone} zone.`,
    deeper: {
      whatItMeasures: "The 14-period Relative Strength Index, a momentum measure bounded between 0 and 100.",
      whyTradersWatch: "Readings above ~70 or below ~30 have historically been labeled overbought/oversold zones by traders.",
      patternNote: "A zone label describes current momentum positioning, not a forecast of reversal.",
    },
  },
  {
    key: "pledge",
    term: "Promoter pledge",
    summary: (c) => `${c.pct}% of promoter holding is pledged, trend ${c.trend}.`,
    deeper: {
      whatItMeasures: "The share of promoter holding pledged as loan collateral, and how that percentage has moved recently.",
      whyTradersWatch: "A rising pledge trend has historically been watched as a smart-money risk flag.",
      patternNote: "Reports the latest disclosed pledge position, not a projection of future pledging.",
    },
  },
  {
    key: "insider",
    term: "Insider activity (30d)",
    summary: (c) => `Net insider activity over the last 30 days was ${c.value}.`,
    deeper: {
      whatItMeasures: "Net value of insider buy vs sell transactions disclosed in the trailing 30 days.",
      whyTradersWatch: "Clusters of insider buying or selling have historically drawn attention as a smart-money checklist item.",
      patternNote: "Reflects disclosed transactions already made, not insider intent going forward.",
    },
  },
  {
    key: "event_risk",
    term: "Event risk",
    summary: (c) => (c.hasRisk === "true" ? `An AI-classified news event was matched to ${c.symbol} in the last 5 days.` : `No AI-classified news event was matched to ${c.symbol} in the last 5 days.`),
    deeper: {
      whatItMeasures: "Whether AI-classified news (promoter/legal, regulatory, sector-policy, corporate-action) matched this stock recently.",
      whyTradersWatch: "News-driven moves have historically behaved differently from technically-driven moves, so traders check for it separately.",
      patternNote: "Flags that a matching event occurred — it does not characterize what the stock will do about it.",
    },
  },
  {
    key: "range_state",
    term: "Range state",
    summary: (c) => `Price is currently reading as a ${c.state} versus today's opening range.`,
    deeper: {
      whatItMeasures: "Whether price has broken above, broken below, or stayed inside its opening range for the session.",
      whyTradersWatch: "A breakout from the opening range has historically been read as a shift in intraday control.",
      patternNote: "Describes the current session's range behavior only.",
    },
  },
  {
    key: "gap",
    term: "Pre-market gap",
    summary: (c) => `${c.symbol} is indicating a ${c.pct}% gap ${c.direction} in pre-market, on ${c.volState} pre-open volume.`,
    deeper: {
      whatItMeasures: "The difference between today's indicative pre-open price and yesterday's close, plus how pre-open volume compares to normal.",
      whyTradersWatch: "A gap backed by unusually high pre-open volume has historically been read differently from a thin, low-volume gap.",
      patternNote: "Describes the pre-open indication only — it says nothing about how the session will close.",
    },
  },
];

const EXPLAINER_MAP = new Map(EXPLAINERS.map((e) => [e.key, e]));

export function getExplainer(key: string): MetricExplainer | undefined {
  return EXPLAINER_MAP.get(key);
}

export { EXPLAINERS };
