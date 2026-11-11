// Common questions: the same reviewed Q&A that Ask AI answers as fixed text (no model call, no quota, every plan).
// Generated from api/docs/metric_explainers.json; keep the two in step. Answers are descriptive and carry no internal weights.

export interface CommonQuestion {
  id: string;
  q: string;
  a: string;
}

export interface CommonQuestionGroup {
  topic: string;
  items: CommonQuestion[];
}

export const COMMON_QUESTION_GROUPS: CommonQuestionGroup[] = [
  {
    "topic": "Delivery %",
    "items": [
      {
        "id": "delivery_pct_q1",
        "q": "What is delivery, exactly?",
        "a": "When a trade settles, the buyer can either take the shares into their demat account (delivery) or square the position off within the same day (intraday). Exchanges publish the delivered portion of each day's volume, which is how this figure is measured."
      },
      {
        "id": "delivery_pct_q2",
        "q": "Is high delivery always a good sign?",
        "a": "Delivery shows the share of traded volume that was taken and held rather than squared off the same day. The same delivery level can come with a price rise or a price fall, so it is read together with price and volume and compared with the stock's own average."
      },
      {
        "id": "delivery_pct_q3",
        "q": "What does low delivery suggest?",
        "a": "A larger share of the day's volume was squared off intraday rather than held — traders have historically read this as thinner, more short-term-driven participation behind a price move, in either direction."
      },
      {
        "id": "delivery_pct_q4",
        "q": "Why compare today's delivery to a 20-day average instead of a fixed number?",
        "a": "Typical delivery levels vary a lot by stock — some names routinely settle 60%+ as delivery, others rarely clear 20%. Comparing a stock against its own recent average avoids treating one company's normal range as another's anomaly."
      }
    ]
  },
  {
    "topic": "Volume ratio",
    "items": [
      {
        "id": "volume_ratio_q1",
        "q": "Why compare to the stock's own average instead of a fixed number?",
        "a": "Normal volume varies enormously between a large, liquid stock and a thinly-traded small-cap. Comparing each stock to its own recent history puts a large-cap and a small-cap on the same relative scale."
      },
      {
        "id": "volume_ratio_q2",
        "q": "Does high volume always confirm a price move?",
        "a": "Traders have historically read elevated volume alongside a price move as broader participation behind that move, in either direction — up or down equally. It has not been a reliable standalone predictor of what follows, which is why it's read alongside delivery and price rather than on its own."
      },
      {
        "id": "volume_ratio_q3",
        "q": "What does a ratio below 1 mean for a quiet stock?",
        "a": "It means today's activity was lighter than that stock's own recent norm — not necessarily unusual in absolute terms, since some stocks trade thin most days. The ratio format is what makes 'lighter than usual for this stock' comparable across very different-sized names."
      }
    ]
  },
  {
    "topic": "10-day trend",
    "items": [
      {
        "id": "trend_10d_pct_q2",
        "q": "Does a positive 10-day trend mean the stock is in an uptrend?",
        "a": "It means price was higher 10 sessions later than it started — a measured fact about that window. Whether that constitutes a durable 'trend' in a trader's sense usually depends on volume and delivery alongside it, which is why those sit next to this figure rather than replacing it."
      }
    ]
  },
  {
    "topic": "20-day moving average",
    "items": [
      {
        "id": "above_20dma_q2",
        "q": "Is staying above the 20-DMA for a long streak meaningful?",
        "a": "Traders have historically read a sustained streak on one side as a stock in a consistent phase, and frequent crossings back and forth as directionless. Neither reading has been a guarantee of what happens next — it's a description of recent consistency, not a signal."
      }
    ]
  },
  {
    "topic": "RSI (14)",
    "items": [
      {
        "id": "rsi_14_q1",
        "q": "What do RSI readings above 70 and below 30 mean here?",
        "a": "These are conventional cut-offs, readings above roughly 70 or below roughly 30 — describing that recent gains (or losses) were unusually large and one-sided relative to the stock's own 14-session history, nothing more."
      },
      {
        "id": "rsi_14_q2",
        "q": "Does an RSI above 70 mean the price will fall?",
        "a": "RSI measures recent price momentum. Readings above 70 are a conventional cut-off for strong recent gains, but RSI describes what has already happened; it does not show what comes next. In strong phases it has stayed at high readings for extended periods."
      },
      {
        "id": "rsi_14_q3",
        "q": "Why 14 sessions specifically?",
        "a": "It's the standard, widely-used window for this indicator — roughly three trading weeks — long enough to smooth day-to-day noise while still reflecting recent momentum. It's fixed and disclosed, not tuned per stock."
      },
      {
        "id": "rsi_14_q4",
        "q": "Can RSI stay near 50 for a long time?",
        "a": "Yes — a reading near the middle of the 0-100 scale describes a period where gains and losses over the last 14 sessions were roughly balanced, i.e. no strongly one-sided momentum in either direction."
      }
    ]
  },
  {
    "topic": "Sector standing",
    "items": [
      {
        "id": "sector_rank_q1",
        "q": "Why rank within an industry instead of the whole market?",
        "a": "Comparing against direct peers separates stock-specific behaviour from behaviour shared across an entire industry. A stock's reading on its own can look low while being the highest in its industry, or the reverse."
      },
      {
        "id": "sector_rank_q2",
        "q": "What if there aren't many peers to rank against?",
        "a": "Industries with very few classified members produce a rank out of a small total (e.g. #2 of 3), which is disclosed plainly as the total count alongside the rank rather than hidden. A small peer group makes the rank less statistically meaningful, which is why the count is always shown next to it."
      }
    ]
  },
  {
    "topic": "PCR (Put-Call Ratio)",
    "items": [
      {
        "id": "pcr_q1",
        "q": "What is a Put Option?",
        "a": "A put option is a contract that gains value when the underlying stock's price falls — the buyer has the right (not the obligation) to sell the stock at a fixed price. It's one of the two basic options contract types, alongside calls."
      },
      {
        "id": "pcr_q2",
        "q": "What is Open Interest?",
        "a": "Open interest is the total number of options contracts (puts or calls) that are currently outstanding — bought and not yet closed or exercised. It's a measure of how many positions exist, not how many trades happened today."
      },
      {
        "id": "pcr_q3",
        "q": "Why compare put OI to call OI instead of looking at each separately?",
        "a": "The ratio gives one comparable number instead of two separate counts, making it easy to see at a glance whether more capital sits on the put side or the call side of the market for that stock's current expiry."
      },
      {
        "id": "pcr_q4",
        "q": "What is a Call Option?",
        "a": "A call option is the mirror of a put — a contract that gains value when the underlying stock's price rises, giving the buyer the right to buy the stock at a fixed price. Comparing outstanding calls against outstanding puts is what PCR measures."
      },
      {
        "id": "pcr_q5",
        "q": "Who writes (sells) puts and calls?",
        "a": "Options can be bought or sold (written) by different market participants for different reasons — hedging an existing position, generating income, or taking a leveraged view. The open interest figure counts both sides of every outstanding contract together, without distinguishing why each position was taken."
      },
      {
        "id": "pcr_q6",
        "q": "Does PCR always indicate direction?",
        "a": "PCR is total put open interest divided by total call open interest. A high or low reading can be explained in more than one way (for example puts bought as protection, or puts written by sellers), so PCR alone does not show a direction."
      }
    ]
  },
  {
    "topic": "Tension in the data",
    "items": [
      {
        "id": "conflict_q1",
        "q": "Why show disagreement instead of just picking a side?",
        "a": "Real analysis is mostly about these disagreements — experienced traders spend more time on contradictions than on confirmations, because agreement across signals is common and rarely informative on its own. Showing the tension plainly is the analysis, not a gap in it."
      }
    ]
  }
];

export const COMMON_QUESTION_NOTE = "General explanation of how these measures are read. Not investment advice.";

// Offered as chips in the Ask AI panel (same wording the backend matches).
export const COMMON_QUESTION_CHIPS: string[] = [
  "What is delivery, exactly?",
  "Is high delivery always a good sign?",
  "Does PCR always indicate direction?",
  "Why compare to the stock's own average instead of a fixed number?",
  "Does high volume always confirm a price move?",
  "Why rank within an industry instead of the whole market?"
];
