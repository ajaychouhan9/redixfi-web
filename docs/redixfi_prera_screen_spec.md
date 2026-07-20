# RedixFi — Pre-RA Screen Design Spec v2 (AI-visible)
**Domains: Home · Signal Dashboard · Intraday Live · Research Pro · Free/Account**
**Positioning: "The AI that reads the entire market for you" — the AI
is visible as the analyst that reads, classifies, measures and summarizes;
the prediction AI is the explicitly promised sequel at RA day. Every AI
output is labeled "AI-generated" (pre-satisfies the RA-era AI-disclosure
duty). AI features run on whitelisted vocabulary: filters and measurements
only; forward/advice intents refused in code.**

*Every screen lists: layout → exact fields → data source → API endpoint.
Backend deltas consolidated in Part 8. Compliance rules from the copy
framework apply to every screen: past/present tense only, no default
model ranking, symmetric up/down, no direction/confidence/outlook.*

---

## PART 0 — APP FRAME

**Mobile:** bottom tabs `Home · Signals · Intraday · Research · More`
**Web:** left sidebar, same five + top market ribbon.

**Global components (all screens):**
- `MarketRibbon`: NIFTY & BANKNIFTY last close/change, market state chip
  (OPEN/CLOSED/PRE-OPEN), volatility badge when regime VOLATILE/CRASH,
  event-risk badge when macro news active.
  → `GET /market/overview`
- `FreshnessDot`: green/amber from latest data_freshness_log; amber
  suppresses stale panels with "data delayed" instead of wrong numbers.
  → included in /market/overview payload
- Persistent footer disclaimer (short) + full disclaimer in More.

---

## PART 1 — HOME

```
┌──────────────────────────────┐
│ MarketRibbon                 │
│ ┌─ Market Pulse card ──────┐ │
│ │ regime chip · FII/DII net│ │
│ │ sectors: 4↑ 13↓ · vol %  │ │
│ └──────────────────────────┘ │
│ ┌─ Top Signal Changes ─────┐ │
│ │ 3 gainers + 3 decliners  │ │  ← symmetric, always both
│ └──────────────────────────┘ │
│ ┌─ AI Daily Brief ─────────┐ │
│ │ AI-written market recap  │ │  ← "AI-generated" label
│ └──────────────────────────┘ │
│ ┌─ Event Risk Today ───────┐ │
│ │ "AI read 214 items — 3   │ │  ← AI counter line
│ │  flagged" + 3 events     │ │
│ └──────────────────────────┘ │
│ ┌─ Intraday now card ──────┐ │  ← state-aware (pre/live/post)
│ ┌─ Continue research ──────┐ │  ← last viewed companies
└──────────────────────────────┘
```

| Component | Fields | Source | Endpoint |
|---|---|---|---|
| Market Pulse | regime, fii_net, dii_net, sectors_up/down, vix-like vol note | global_data, Macro_FI_DI, macro_sectors_15m | GET /market/overview |
| Top Signal Changes | symbol, name, composite_score, delta_1d (3 up + 3 down) | measured_signals (B1) | GET /signals/movers?limit=3 |
| AI Daily Brief | brief_text (AI-written, labeled), period (morning/close) | daily_brief (B12) | GET /brief/latest |
| Event Risk Today | ai_read_count, flagged_count, then per event: headline, symbol(s), AI category/scope/severity chips, time | news_events + daily counters (B10) | GET /news?severity=high&limit=3 |
| Intraday card | session_state, movers count OR recap headline | phase-aware | GET /intraday/session |

---

## PART 2 — SIGNAL DASHBOARD (list)

```
┌──────────────────────────────┐
│ 🤖 AI Smart Screener ▢       │  ← natural language, B9
│ "energy stocks with rising   │
│  delivery, above VWAP, no    │
│  negative news this week"    │
│ Search ▢   Filters ⚙  Sort ⇅ │
│ ┌──────────────────────────┐ │
│ │ RELIANCE  Energy         │ │
│ │ Score 68 ▲+4   Del 58%   │ │
│ │ chips: DELIVERY↑ SECTOR↑ │ │
│ ├──────────────────────────┤ │
│ │ TCS  IT                  │ │
│ │ Score 55 ▼-2   Del 41%   │ │
│ └──────────────────────────┘ │
│    (750 rows, virtualized)   │
└──────────────────────────────┘
```

**Rules:** default sort = market-cap or A–Z (NEVER by score by default —
enforced server-side). User may sort by: score, score change, delivery,
sector rank, volume. Filters: sector, score band, has-event-risk,
watchlist-only.

| Field per row | Source |
|---|---|
| symbol, company_name, sector | symbols_master (G1) |
| composite_score (0–100), delta_1d | measured_signals (B1) |
| delivery_pct vs avg | measured_signals |
| top 2 signal chips (measured states, e.g. "DELIVERY↑") | measured_signals |
| event_risk flag | news_events matched_symbols (G5) |

Endpoint: `GET /signals?sort=&filter=&page=` — returns full universe,
paginated; **no rank field, no direction field, no model ordering**.

**AI Smart Screener:** `POST /signals/smart-screen {query}` → LLM maps
natural language onto the whitelisted filter schema (sector, score band,
delivery vs avg, volume ratio, VWAP side, DMA state, PCR band, event-risk
presence, watchlist) → executes the same /signals query → returns results
+ the parsed filters shown as removable chips ("here's how I read your
query"). Forward/advice intents ("best stocks to buy", "which will rise")
are refused in code with the branded line: "I can filter by what the data
measures — directional research launches after our SEBI RA registration."
The user authors the query; the AI only translates it.

---

## PART 3 — SIGNAL DASHBOARD (stock detail)

```
┌──────────────────────────────┐
│ RELIANCE · Energy · ₹2,914   │
│ Composite Signal Score       │
│      68/100   ▲ +4 today     │
│ "A measured summary of       │
│  observed signals. Not a     │
│  prediction."                │
├─ 🤖 AI Summary (labeled) ────┤
│ "Delivery volumes have       │
│ strengthened over the past   │
│ week while sector momentum   │
│ turned positive; options     │
│ positioning shows elevated   │
│ put writing. No significant  │
│ news events detected."       │
├─ What the data shows ────────┤
│ 📈 Trend      +3.2% /10 sess │
│    above 20-DMA 6 sessions   │
│ 🏭 Sector     Energy #3/17   │
│ 📊 Delivery   58% vs 46% avg │
│ 💰 FII flow   net buy 4/5 d  │
│ 📉 PCR        1.24 elevated  │
│ ⚠️ Events     none in 5 days │
├─ Signal Change Log ──────────┤
│ 15 Jul  +4  delivery ↑       │
│ 11 Jul  +2  sector turned +  │
├─ Chart (3M daily) ───────────┤
├─ Related news (if any) ──────┤
│ [🔔 Alert me on changes]     │
└──────────────────────────────┘
```

| Panel | Fields | Source | Endpoint |
|---|---|---|---|
| Score header | composite_score, delta_1d, delta_5d | measured_signals | GET /signals/{symbol} |
| AI Summary | narrative_text (nightly AI-written, past-tense, labeled) | measured_signals.narrative (B11) | same payload |
| Data rows | trend_10d_pct, above_dma_sessions, sector_rank, delivery_pct + avg, fii_days, pcr, event_risk_5d | measured_signals | same |
| Change log | date, delta, changed_signal, note (retrospective only) | signal_change_log (B2) | same payload |
| Chart | daily candles 3M | historical_candles | GET /charts/{symbol}?interval=1d |
| News | matched news_events | news_events (G5) | GET /news?symbol= |

**Analysis-enablement additions (v2.1 — core product identity):**
1. EXPLAIN-IN-PLACE: every measured row gets a tap-to-learn tooltip —
   "what this measures + why traders watch it" (static content per
   metric, written once; e.g. delivery %: "share of traded volume taken
   as actual delivery rather than intraday — traders read rising
   delivery with rising price as conviction-based buying").
2. ANALYST CHECKLIST panel (below the facts): the trader's mental
   checklist rendered as factual answers — Trend / Volume confirmation /
   Delivery quality / Sector agreement / Event risk — each row shows its
   measured answer incl. negative and neutral states with EQUAL visual
   weight. NO aggregate verdict row, no summary arrow.
3. CONFLICT SURFACING: when signals disagree, show it explicitly as an
   education moment: "⚡ Tension: price rose 3% this week while delivery
   declined — historically read as weak participation." Generated in the
   B11 nightly narrative pass (add a `conflicts` array to
   measured_signals: template-detected signal disagreements). Tension
   display is inherently non-directional.
4. Pattern literacy phrasing rule for all AI text: "has historically
   indicated", never "suggests it will".
5. Engagement instrumentation: log explainer-taps and checklist views —
   core metric for whether skill-transfer is landing.

**Education delivery system (applies app-wide, built once):**
Principle: explanation arrives AT the moment of confusion, IN the context
of the stock on screen, sized to ONE breath. No glossary page, no FAQ
section, no academy tab, no onboarding term-tutorials — these measure
near-zero engagement and are explicitly out of scope.

Layered stack (primary → fallback):
1. CONTEXTUAL TAP-TEMPLATES (primary): every metric term renders with a
   dotted underline; tap (mobile) / hover (web) opens a one-breath popup
   whose text INJECTS THE LIVE VALUES on screen. Template example (VWAP):
   "VWAP ({vwap_price}) is today's average price weighted by volume —
   {symbol} trading {above|below} it means buyers have paid {above|below}
   the day's average, which traders read as {buying strength|selling
   pressure}." ~25 static templates total (one per metric), values filled
   at render time, no LLM cost. Content ships as a versioned JSON the
   apps consume (`metric_explainers.json`).
2. NARRATIVE-BY-USAGE (passive): B11 narratives + daily brief naturally
   use the terms in meaningful sentences — repeated exposure teaches
   before any tap happens. No extra build.
3. DEEPER CARD (on demand): "learn more" inside the popup expands ONE
   level: what it measures · why traders watch it · one historical
   pattern note ("has historically indicated...") · its current state on
   this stock. Two levels is the ceiling — never a third.
4. ASK REDIXFI (v1.5, freeform fallback): chat answers IN CONTEXT of the
   currently open stock, injecting its live values — not generic
   definitions.

Interaction conventions (never vary):
- ONE affordance everywhere: dotted underline = tappable explanation.
  Long-press is NOT used (undiscoverable).
- PROGRESSIVE DISCLOSURE: per-user counter on explainer opens; after 3-4
  opens of the same term the dotted hint fades for that user (interface
  acknowledges growing literacy). Uses the engagement instrumentation
  already specced.
- All explainer text follows the pattern-literacy rule ("has historically
  indicated", never forward-tense) and the symmetry rule (bullish and
  bearish readings explained with equal weight in the same template).

**Not present anywhere:** direction, outlook, confidence, forward dates,
prediction validity, aggregate verdict visuals (no big arrows/gauges),
glossary/FAQ/academy pages. (These fields exist in predictions_snapshot but the
pre-RA API never selects them — `ra_mode` enforced in API layer.)

---

## PART 4 — SIGNAL MOVERS

Two symmetric tabs: **Score Gainers · Score Decliners** (equal styling).
Row = symbol, name, score, delta, one-line cause ("delivery signal
strengthened"). Endpoint: `GET /signals/movers?direction=up|down&limit=20`.
Cause line comes from signal_change_log's changed_signal field.

---

## PART 5 — INTRADAY LIVE (state-machine screen)

### 5a. Pre-market state (before 10:15)
- Pre-open movers table: symbol, gap %, preopen volume vs avg,
  preopen bucket tag — sortable, both directions.
  Source: premarket_scans → `GET /intraday/premarket`
- Sector heatmap: 17 sector tiles colored by 5-day momentum.
  Source: macro_sectors_15m → `GET /intraday/sectors`

### 5b. Live state (10:15–15:30)
```
┌──────────────────────────────┐
│ Session: LIVE · vol elevated │
│ [Scanner] [Events] [Watchlist]│
├─ SCANNER ────────────────────┤
│ filter chips (user-applied): │
│ Vol>2x · >VWAP · <VWAP ·     │
│ Range-break · Sector-strong  │
│ ┌ result rows ─────────────┐ │
│ │ SYMBOL price +2.1%       │ │
│ │ vol 2.6x · above VWAP    │ │
│ └──────────────────────────┘ │
├─ EVENTS ─────────────────────┤
│ 11:42 ADANIENT regulatory ⚠ │
│ 10:15 market-wide macro ⚠   │
├─ WATCHLIST ──────────────────┤
│ TCS  momentum sustaining 🟢  │
│ INFY momentum fading 🟡      │
└──────────────────────────────┘
```

| Tab | Fields | Source | Endpoint |
|---|---|---|---|
| Scanner | symbol, last price, day %, volume_ratio, vwap_side, range_state | candles_intraday_15m computed (B5) | GET /intraday/scan?filters= |
| Events | ai_read_count header, then: time, symbol/scope, AI category chip, severity, headline | news_events (live-mode, B10 framing) | GET /news?today=1&intraday=1 |
| Watchlist states | symbol, behavior_state (sustaining/fading/reversed — present tense), since_time | phase5 state machine applied to user watchlist (B4) | GET /intraday/watchlist-states |

**Scanner rules:** no default filter set that reproduces Phase 3's
selection; results unlimited (not capped at 8); both directions.
Watchlist states run ONLY on user-added symbols.

### 5c. Post-market state (after 15:45)
Factual recap card set: biggest gainers/losers, volume anomalies,
sector leaders/laggards, "event-flagged stocks today and their close".
Source: intraday_daily_recap (G6, extended) → `GET /intraday/recap`.
**No candidate outcomes shown** (candidates are internal pre-RA).

---

## PART 6 — RESEARCH PRO (company page)

Search-first: `GET /research/search?q=` over symbols_master.

```
┌──────────────────────────────┐
│ RELIANCE INDUSTRIES · Energy │
│ ₹2,914 +0.8% · 52wk ▓▓▓▓░ 78%│
│ [1D 1W 1M 1Y chart]          │
├─ Smart money ────────────────┤
│ Delivery 30-day sparkline    │
│ Insider trades table (fixed  │
│  fetcher: date,type,qty,val) │
│ Bulk/block deals list        │
│ Pledge history chart + trend │
│ Options PCR gauge + history  │
├─ Events & news ──────────────┤
│ Corporate events calendar    │
│ News timeline w/ category    │
├─ Signal summary ─────────────┤
│ (embed of Part-3 score card) │
└──────────────────────────────┘
```

One aggregate endpoint: `GET /research/{symbol}` assembling:
symbols_master, historical_candles (52wk calc), nse_delivery_data (30d),
filings_insider, bulk_block_deals, promoter_pledge_history,
options_oi_history (history for gauge trend), corporate_events,
news_events (G5). Cache 15 min.

---

## PART 7 — FREE TIER / ACCOUNT / PAYWALL

- **Free:** Home (full), News (24h-delayed list), 3 company lookups/day
  (server-counted), Signal Dashboard shows scores blurred beyond top of
  list with lock ("Unlock all 750 measured scores").
- **Paywall screen:** single tier ₹499/mo + Founding Annual ₹4,999
  (counter: "137 of 200 founding spots left"), feature checklist,
  prominent "directional research launches after SEBI RA registration —
  founding members get it at no extra cost" (truthful roadmap, not a
  current-service claim).
- **Alerts center (More):** toggles — signal change on watchlist,
  event risk on watchlist, market-wide event, AI Daily Brief digest (B12).
  Delivery: push + in-app inbox (inbox doubles as the 5-year
  interaction record later).
- **More:** full disclaimer page, data sources & update times page
  (freshness table — public trust feature), account, subscription mgmt
  (with pro-rata refund note in T&C).

---

### Ask RedixFi (AI chat) — v1.5, post-launch
Q&A box over measured data only ("what's the delivery trend on TCS?").
Forward questions get the branded refusal (same line as smart screener).
Held past launch: needs guardrail hardening + interaction logging (the
in-app record that becomes the 5-year client-interaction obligation
post-RA). Endpoint reserved: POST /ask.

---

## PART 8 — BACKEND DELTA LIST (build these)

| # | Item | What | Feeds screens |
|---|---|---|---|
| B1 | `measured_signals` nightly builder | NEW JOB: for ALL 750 symbols compute measured per-signal values (trend_10d, dma_sessions, sector_rank, delivery vs avg, fii_days, pcr, event_risk_5d) + composite_score 0–100 + deltas. Reuses runner's signal functions WITHOUT direction/confidence. Runs after freshness check, ~07:50. | Parts 1,2,3,4 |
| B2 | `signal_change_log` | Appended by B1 when any signal state flips or composite moves ≥3: {date, symbol, delta, changed_signal, note}. Retrospective only. | Parts 3,4 |
| B3 | User service | Auth (mobile OTP), watchlist CRUD, alert prefs, subscription state, lookup counter. Separate app DB. | 5b, 7 |
| B4 | Alert engine | Worker: consumes B1 deltas + live news_events + phase5-on-watchlist; sends push + writes in-app inbox. | 1,5b,7 |
| B5 | Live scanner endpoint | Computes volume_ratio/VWAP-side/range-state from candles_intraday_15m on request (or 15-min materialized). No Phase-3 selection logic exposed. | 5b |
| B6 | Recap extension | Extend G6 daily recap with market-wide facts (movers, volume anomalies, event-flagged closes); strip candidate outcomes from public payload. | 5c |
| B7 | ra_mode enforcement | API middleware strips direction/confidence/rank fields + forbids model-ordered sorting while ra_mode=false. One flag, server-side. | all |
| B8 | Free-tier metering | Lookup counter + blur boundaries server-side. | 7 |
| B9 | AI Smart Screener | LLM endpoint: natural language → whitelisted filter schema → /signals query. Hard whitelist; forward/advice intents refused in code with branded line. Logs every query+parse (audit + product learning). | 2 |
| B10 | AI news framing | Daily counters (items_read, items_flagged) written by the news fetcher; AI chips already exist (category/scope/severity) — surface + label as AI-assigned. | 1, 5b |
| B11 | AI stock narratives | Extends B1: nightly batched LLM pass writes past-tense narrative_text per stock from measured values. Labeled AI-generated. Template-guarded: measurements only, no forward tense (validated by regex before save). | 3 |
| B12 | AI Daily Brief | Morning (~08:10) + post-close (~16:15) AI-written market recap from global_data, sectors, movers, events. Stored in daily_brief collection; push digest + shareable content for acquisition. | 1, 7 |

Already done: G1 symbols_master · G2 runner fields · G5 pending (news
matched_symbols) · G6 base recap pending.

**Build order:** B1+B2+B11 (measured signals + narratives — one nightly
job) → API skeleton + B7 → Signals screens + B9 smart screener →
B3+B4 → Intraday screens (B5,B6,B10) → B12 daily brief → Research
aggregate → paywall/metering (B8). Ask RedixFi (chat) = v1.5.

**AI compliance rules (apply to B9–B12 and future chat):**
1. Every AI output visibly labeled "AI-generated".
2. Whitelisted vocabulary only — filters and past/present measurements;
   forward/advice intents refused in code, not prompt-hope.
3. All AI outputs pass a forward-tense validator before display/save.
4. Every AI interaction logged (audit trail; becomes the RA-era record).
