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
  // ---- Task 09: fundamentals derived layer ----
  {
    key: "revenue_growth",
    term: "Revenue growth (YoY)",
    summary: (c) => `Revenue for the quarter ended ${c.quarterEnd} was ${c.pct}% versus the same quarter a year earlier${c.accel ? `, the ${c.accel} straight quarter of accelerating growth` : ""}.`,
    deeper: {
      whatItMeasures: "The percentage change in reported revenue versus the same quarter one year earlier (YoY), from the company's own filed financial statements.",
      whyTradersWatch: "A run of quarters where the YoY growth rate itself keeps rising has historically been read as accelerating momentum; a run where it keeps falling has historically been read as decelerating momentum.",
      patternNote: "Describes quarters that have already been reported — it says nothing about the quarter still in progress.",
    },
  },
  {
    key: "operating_margin",
    term: "Operating margin",
    summary: (c) => `Operating margin was ${c.pct}% this quarter, ${c.vsAvg} its own 8-quarter average.`,
    deeper: {
      whatItMeasures: "Operating income as a percentage of revenue for the quarter, compared with the same company's own trailing 8-quarter average — not a comparison to any other company.",
      whyTradersWatch: "A margin running above its own average has historically been read as improving operating efficiency; below has historically been read as margin pressure.",
      patternNote: "A single-quarter measurement against the company's own history, not a forecast of next quarter's margin.",
    },
  },
  {
    key: "pe_vs_sector",
    term: "P/E vs sector",
    summary: (c) => `This stock's trailing P/E of ${c.pe} sits ${c.rel} the sector average P/E of ${c.sectorPe}.`,
    deeper: {
      whatItMeasures: "Trailing-twelve-month price-to-earnings ratio for this stock versus the average P/E of its listed sector peers.",
      whyTradersWatch: "Traders use relative P/E as one input into how a stock is priced against its peer group — it is one fact among several, not a verdict on whether the price is fair.",
      patternNote: "A snapshot comparison of two measured numbers today — a higher or lower P/E than peers has historically meant different things for different companies, and is not itself a signal of direction.",
    },
  },
  {
    key: "promoter_holding",
    term: "Promoter holding",
    summary: (c) => `Promoters held ${c.pct}% as of ${c.date}, a change of ${c.change} percentage points from the previous quarter (${c.streak}).`,
    deeper: {
      whatItMeasures: "The percentage of total shares held by the company's promoter group, as filed each quarter, plus the quarter-over-quarter change and the current streak of same-direction moves.",
      whyTradersWatch: "A sustained multi-quarter rise in promoter holding has historically been read differently from a single-quarter blip in either direction; the same applies symmetrically to a sustained fall.",
      patternNote: "A filed shareholding fact as of the stated date — not an indicator of what promoters will do next quarter.",
    },
  },
  {
    key: "fii_holding",
    term: "FII holding",
    summary: (c) => `FIIs held ${c.pct}% as of ${c.date}, a change of ${c.change} percentage points from the previous quarter (${c.streak}).`,
    deeper: {
      whatItMeasures: "The percentage of total shares held by Foreign Institutional Investors, as filed each quarter, plus the quarter-over-quarter change and current streak.",
      whyTradersWatch: "A multi-quarter streak in either direction has historically been read as a stronger signal than one quarter's move alone.",
      patternNote: "A filed shareholding fact as of the stated date — not a prediction of future FII activity.",
    },
  },
  {
    key: "debt_to_equity",
    term: "Debt-to-equity",
    summary: (c) => `Total debt stood at ${c.ratio}x total equity as of the latest filed balance sheet.`,
    deeper: {
      whatItMeasures: "Total debt divided by total shareholder equity from the company's most recent filed balance sheet.",
      whyTradersWatch: "Higher leverage has historically been read as higher financial risk in a downturn; lower leverage as more balance-sheet headroom — traders weigh this alongside the business's cash flow, not in isolation.",
      patternNote: "A single filed balance-sheet snapshot — not a comment on how the company will manage its debt going forward.",
    },
  },
  {
    key: "volatility_risk",
    term: "Volatility / risk category",
    summary: (c) => `This stock is classified as "${c.category}" risk, with a measured price-volatility (std. dev.) of ${c.stddev}.`,
    deeper: {
      whatItMeasures: "A standard-deviation-based volatility measure of historical price movement, bucketed into a risk category.",
      whyTradersWatch: "Higher historical volatility has meant wider price swings in both directions — traders size positions differently for high- vs low-volatility names.",
      patternNote: "Describes how much this stock's price has moved historically — not which direction it will move next.",
    },
  },
  {
    key: "next_results_date",
    term: "Results date",
    summary: (c) => `The company's board last announced quarterly results on ${c.date}.`,
    deeper: {
      whatItMeasures: "The most recent board-meeting date on file for quarterly results, from filed corporate-action data.",
      whyTradersWatch: "Traders track results dates to know when a company's next filed numbers are due to update every other metric on this page.",
      patternNote: "A calendar fact from filed corporate-action records, not a comment on what the results will show.",
    },
  },
];

const EXPLAINER_MAP = new Map(EXPLAINERS.map((e) => [e.key, e]));

export function getExplainer(key: string): MetricExplainer | undefined {
  return EXPLAINER_MAP.get(key);
}

export { EXPLAINERS };
