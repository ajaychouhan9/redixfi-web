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
    "topic": "Stock Condition",
    "items": [
      {
        "id": "composite_score_q1",
        "q": "What counts as a 'good' reading?",
        "a": "There is no 'good' reading. A higher reading means more of the measured signals lined up in the same way; a lower reading means fewer did. It describes the measured signals, not future price."
      },
      {
        "id": "composite_score_q2",
        "q": "Why did the reading change so much in one day?",
        "a": "Large single-day moves have historically traced back to one underlying signal flipping state — a delivery spike, a trend crossing its moving average, a fresh event flag — rather than everything shifting a little at once. The Signal Change Log on each stock page names exactly which signal moved."
      },
      {
        "id": "composite_score_q3",
        "q": "Does a high reading mean the stock will go up?",
        "a": "No. The reading summarizes what has already been measured — it carries no forward claim. A high reading has historically coincided with broad agreement across signals on a given day; it has not reliably predicted the next day's move, and this product does not track or claim that it does."
      },
      {
        "id": "composite_score_q4",
        "q": "Can two stocks with the same reading look completely different?",
        "a": "Yes. The same number can be reached by very different combinations of underlying signals — one stock might show 65 on high delivery and a lower sector rank, another might reach 65 the opposite way. That's why the full breakdown sits right below the number rather than the reading standing alone."
      }
    ]
  },
  {
    "topic": "Stock Condition change (1 day)",
    "items": [
      {
        "id": "delta_1d_q1",
        "q": "Is a big reading change always driven by price?",
        "a": "Not necessarily. Because the Stock Condition blends trend, delivery, volume, sector standing, options positioning and event risk together, a large move can come from any one of those changing state — price is only one input among several."
      },
      {
        "id": "delta_1d_q2",
        "q": "What does it mean if the reading barely moved?",
        "a": "A small delta usually means the underlying signals stayed in roughly the same state as the previous session — no single signal crossed a threshold. It says the picture was stable that day, not that nothing at all happened to the stock."
      },
      {
        "id": "delta_1d_q3",
        "q": "Can the reading fall even if the price rose?",
        "a": "Yes — this is exactly the kind of disagreement the Tension panel is built to surface. Price and the Stock Condition are not the same measurement; delivery weakening, sector standing slipping, or an event flag appearing can all pull the composite down on a day the price closed higher."
      },
      {
        "id": "delta_1d_q4",
        "q": "Does a string of positive deltas mean anything special?",
        "a": "It shows the underlying signals kept moving in the same direction over several sessions rather than shifting once."
      }
    ]
  },
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
      },
      {
        "id": "volume_ratio_q4",
        "q": "Can volume spike without any news?",
        "a": "Yes — bulk deals, block deals, index rebalancing, and F&O expiry effects can all drive volume without a classified news event that day. The Event Risk panel on the same page shows whether any classified news was matched; volume and news are measured and reported separately."
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
        "q": "What do 'overbought' and 'oversold' actually mean here?",
        "a": "They are conventional labels for readings above roughly 70 or below roughly 30 — describing that recent gains (or losses) were unusually large and one-sided relative to the stock's own 14-session history, nothing more."
      },
      {
        "id": "rsi_14_q2",
        "q": "Does an overbought reading mean the price will fall?",
        "a": "RSI measures recent price momentum. Readings above 70 are conventionally called overbought, but RSI describes what has already happened; it does not show what comes next. In strong phases it has stayed at high readings for extended periods."
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
      },
      {
        "id": "sector_rank_q3",
        "q": "Does #1 in the sector mean the stock is a buy?",
        "a": "No — it means this stock's Stock Condition was the highest among its classified peers today, nothing more. The rank carries no forward claim and is recomputed fresh from scratch every day."
      },
      {
        "id": "sector_rank_q4",
        "q": "Can a rank swing a lot day to day?",
        "a": "Yes, especially in smaller peer groups, since each member's Stock Condition is itself a same-day snapshot. A rank moving from #3 to #7 describes a change in relative standing that day — it says nothing about direction on its own."
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
    "topic": "Event risk",
    "items": [
      {
        "id": "event_risk_q1",
        "q": "What counts as a classified news event?",
        "a": "A headline that our AI reads and sorts into one of the defined categories (regulatory, promoter/legal, short-seller report, corporate action, macro, sector policy) with an assigned severity and scope. Headlines that don't fit any category are classified as 'none' and don't raise this flag."
      },
      {
        "id": "event_risk_q2",
        "q": "Why can't price/volume signals catch this on their own?",
        "a": "Signals computed from price and volume alone have no way to see a regulatory notice or legal development that arrived today — they can only react to the price/volume effects of an event after the fact, if any. This flag exists specifically to surface the event itself."
      },
      {
        "id": "event_risk_q3",
        "q": "Does an event flag mean the stock will move a lot?",
        "a": "Stocks with active high-severity events have historically shown wider price ranges than usual, in either direction. This is a documented tendency, not a rule for every case."
      },
      {
        "id": "event_risk_q4",
        "q": "Why does 'why did it change' sometimes not name a cause?",
        "a": "A cause is only offered when a classified news event actually matched that stock on that day. If no matching event exists, the honest answer is that the data shows the change but not its cause — several explanations are usually possible, and this product does not invent one."
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
  "What counts as a 'good' reading?",
  "Why compare to the stock's own average instead of a fixed number?",
  "Why show disagreement instead of just picking a side?"
];
