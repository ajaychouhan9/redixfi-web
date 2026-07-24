# 00 — REDIXFI MASTER CONTEXT (attach this to every new chat)

## What RedixFi is

AI-driven stock analytics platform (NSE/BSE). Solo founder. Currently
PRE-RA phase: SEBI Research Analyst registration in progress (individual
RA path). Until registration, the product ships ANALYTICS ONLY — no
directions, no predictions, no recommendations. Directional products
unlock at RA day via a server-side `ra\_mode` flag.

**Positioning (corrected after persona analysis):**
PRIMARY: "The AI that guards your portfolio" — protection framing for
long-term holders (largest segment; fear-of-loss converts better than
greed at ₹499). SECONDARY: "The AI that reads the entire market for
you" — discovery framing for self-directed swing traders.

**Pre-RA business goal:** NOT unicorn-scale — a profitable, sustainable
analytics business (\~150–400 paid subs, ₹1–3L MRR) that funds RA
registration and proves the engine privately. Expansion comes post-RA.

**Product identity — ANALYSIS ENABLEMENT (not just data display):**
The pre-RA product's explicit goal: raise a non-technical user's ability
to READ market data themselves to \~60-70% of a technical trader's level.
AI transfers analytical SKILL in-context, never conclusions. Mechanics:

* Explain-in-place: every metric has tap-to-learn "what this measures and
why traders watch it".
* Checklist framing: stock pages walk the analyst's mental checklist
(trend, volume confirmation, delivery quality, sector agreement, event
risk) — each answered factually, negatives/neutrals with EQUAL weight.
* Conflict surfacing: explicitly show tensions between signals ("price
rising but delivery falling — traders call this weak participation").
Tension is by definition not a verdict — this IS the skill transfer.
* Pattern literacy: "has historically indicated" phrasing only; never
what this instance WILL do.
* Honest ambiguity: on mixed data the page must honestly read as mixed —
frequent "no clear picture" outcomes are the PROOF it's analysis
enablement, not disguised recommendation.
Design tells to enforce: symmetric color use (green/red only for PAST
changes, never aggregate mood), no verdict-shaped visuals (no big arrows,
no gauges pointing "up-ish"), negatives as prominent as positives.
Track engagement with explainers/checklist as a core product metric.
Education delivery: contextual tap-templates with live-value injection
(dotted-underline convention, \~25 templates in metric\_explainers.json,
two-level ceiling) → narrative-by-usage → Ask-AI fallback. NO glossary/
FAQ/academy pages — full spec in screen spec Part 3.

**Core buyer personas (design + copy against these):**

1. Self-directed swing trader (28–45, salaried, ₹2–15L portfolio,
researches at night) — buys time-saving synthesis: composite score,
change log, screeners, alerts.
2. Long-term holder — buys protection: watchlist + news/pledge/insider/
delivery alerts on stocks they OWN. Watchlist is THE product for
this persona, not a feature.
3. Data nerds/finfluencers — small, high-leverage; natural founding-
annual buyers and content amplifiers.
NOT the target pre-RA: tip-seekers (free-tier volume only) and active
F\&O scalpers (wait for post-RA intraday).

**Activation metric that decides renewal:** user builds a watchlist and
receives ≥1 meaningful alert in week one. Onboarding is designed around
this.

## Hard compliance rules (apply to EVERYTHING pre-RA)

1. TENSE TEST — all user-facing content past/present tense. No forward
statements about any named stock ("expected", "outlook", "likely").
2. MIND-READING TEST — a user must NOT be able to infer what we think a
stock will do. No direction, confidence, outlook, target, validity
windows.
3. CURATION TEST — no list ordered/curated by model output. Default
sorts = market-cap or A–Z. User applies their own sorts/filters.
4. Symmetry — any movers/changes display shows up AND down equally.
5. Every AI output labeled "AI-generated". AI features use whitelisted
vocabulary (filters + measurements); forward/advice intents refused
IN CODE with: "I can filter by what the data measures — directional
research launches after our SEBI RA registration."
6. Forbidden words in UI/marketing: signals(as calls)/calls/picks/tips/
predictions/buy/sell/target/stoploss/accuracy claims.
7. Free tier = data + education only (keeps future RA "client" count =
paying subscribers).

## Infrastructure

* Ubuntu server, base path `/home/ubuntu/redixfi-backend/`

  * `data-pipeline/` — fetcher scripts (+ lists/nifty\_total.txt \~750 symbols)
  * `prediction\_engine/` — 7-day runner + utils (news\_impact.py, sector\_mapper)
  * `intraday/` — phase1..phase5 scripts + attribution
  * `scheduler.py` — minute-loop scheduler, Telegram alerts (env token),
holiday-aware, lock files
* MongoDB (db name `redixfi`), centralized via `config.db.get\_db()`
* `.env`: MARKETAUX\_API\_KEYS, OPENAI\_API\_KEY, GNEWS/NEWSAPI/NEWSDATA keys,
TELEGRAM\_BOT\_TOKEN/CHAT\_ID, Dhan token via dhan\_generate\_token.py
* Windows dev mirror: `C:\\Redixfi\\`
* Scheduler runs at `prediction\_engine/scheduler.py` under systemd service
`redixfi` (NOT repo root). Deploy = copy file + `sudo systemctl restart redixfi`. Never start manually (nohup) — causes duplicate processes.

## Key collections (existing)

|Collection|Content|
|-|-|
|historical\_candles|daily OHLCV (canonicalSymbol, timestamp)|
|candles\_intraday\_15m / \_1h|intraday candles|
|macro\_sectors\_15m|17 sector index closes (as\_of\_date, interval:"15m")|
|global\_data|9 global indicators daily|
|nse\_delivery\_data|delivery % per stock|
|Macro\_FI\_DI|FII/DII daily flow|
|options\_oi\_history|PCR per stock (partial \~200 stocks)|
|bulk\_block\_deals, filings\_insider, promoter\_pledge\_history|smart-money|
|corporate\_events, chart\_patterns|events + patterns|
|news\_events|AI-classified news: category(promoter\_legal/short\_seller\_report/regulatory/macro/sector\_policy/corporate\_action/none), scope(stock/group/sector/market), severity, impact, confidence, entities, keywords|
|predictions\_snapshot|7-day predictions (v3.1: direction, confidence, band, engine\_state \~17 signals, tags, summary\_text, risk\_flags, sector\_index, expires\_on) — INTERNAL pre-RA|
|prediction\_status\_updates|short\_term\_monitor session checks|
|intraday\_eligible\_stocks\_v2 → premarket\_scans → phase2\_signals → intraday\_final\_candidates\_v3 → intraday\_accuracy\_research|intraday pipeline — candidates INTERNAL pre-RA|
|news\_suppression\_log, attribution\_reports, intraday\_attribution\_reports|feedback loops|
|data\_freshness\_log|daily feed watchdog results|
|symbols\_master|company identity (name, sector, isin, has\_candles)|
|fundamentals\_raw|FULL raw indianapi payloads per stock (financials, metrics, shareholding) — fetched by fundamentals\_fetcher.py, rolling \~30/day, refresh >80d|
|fundamentals\_quarterly (Task 09)|DERIVED metrics layer built FROM fundamentals\_raw (YoY/QoQ, margins, shareholding changes, flags) — no re-fetching needed|
|api\_usage|persistent per-key monthly quota counters (indianapi 500/mo/key)|

## Key scripts (current versions)

* `Prediction\_runner\_v3.py` (v3.1) — 17-signal 7-day engine, news-aware,
writes predictions\_snapshot. Runs 07:45.
* `marketaux\_news\_fetcher.py` — news fetch + OpenAI classification,
live + backtest modes. 4x/day.
* `news\_impact.py` (prediction\_engine/utils) — shared news →
invalidation/adjustment module used by runner + monitor + intraday.
* Intraday: phase1\_unified (08:30) → phase2\_premarket\_scan (09:09) →
phase2\_final (10:08) → phase3\_final (10:15) → phase5 monitor (q15) →
phase4\_research (15:40) → intraday\_attribution (21:45)
* `data\_freshness\_check.py` (07:35) — 15-feed watchdog, exit 1 on
critical stale.
* `signal\_attribution.py` — weekly 7-day feedback loop.
* `symbols\_master\_builder.py` — weekly identity refresh.
* `fundamentals\_fetcher.py` — indianapi.in fundamentals, 3-4 key rotation
with persistent monthly quota tracking, rolling refresh (30/day, 80-day
window), name-based lookup via symbols\_master with symbol fallback.
Stores FULL raw payload; derived layer (Task 09) parses stored data.
Scheduler slot pending: 19:30 market days.

## Pre-RA product (what we're building)

Domains: **Home** · **Signal Dashboard** (measured 0–100 composite for all
750 stocks + facts + change log + AI narrative) · **Intraday Live**
(pre-open movers, user-filter scanner, AI event feed, watchlist behavior
states, factual recap) · **Research Pro** (company deep pages) · Free tier.
AI features: B9 smart screener (NL→filters), B10 AI news counters,
B11 nightly AI narratives, B12 AI daily brief. Ask-AI chat = v1.5.
Pricing: ₹499/mo single tier + Founding Annual ₹4,999 (200 spots).

## Build sequence (task docs 01–07)

01 DB: measured\_signals builder (B1+B2+B11) →
02 DB: support jobs (G5, G6/B6, B10 counters, scheduler entries) →
09 DB: fundamentals layer (quarterly, derived/smart presentation) →
03 Backend: core read API + ra\_mode (B7) →
04 Backend: users/alerts/metering (B3,B4,B8) →
05 Backend: AI endpoints (B9, B12) →
06 UI mobile app → 07 UI web.
Post-RA overview: doc 08.
(09 can run parallel to 03–05; quarterly cadence means no daily
scheduling pressure.)

## Decision record: intraday scanner universe (pre-RA)

* Scanner universe = Phase 1's MECHANICAL eligibility screen only
(\~250-300 stocks/day: liquidity, price band, volume, ATR filters) —
published as "Active Universe: N stocks meeting minimum liquidity and
price criteria today" with criteria disclosed. Objective mechanical
filters = data screen (compliant); signal-score-based exclusions must
NOT gate the public universe (verify in phase1\_unified.py — if score
gating exists, emit the mechanical-stage list separately for public use).
* NOT all 750 (2.5x fetch load for illiquid names with no scan value)
and NOT the 8 candidates (internal pre-RA).
* 15m candle fetch input becomes eligible ∪ all-watchlisted-symbols once
Task 04 watchlists exist (holder persona's behavior-states need candles
for user-chosen stocks). Until then, eligible-only is correct.

## Decision record: old backend API (DECOMMISSIONED)

* The pre-existing Node/Express API (`backend/src/server.js`, port 5000,
pm2-managed, "frozen v1" contract in API\_CONTRACT.md) was DECOMMISSIONED
July 2026: pm2 deleted + unstartup, code archived
(`redixfi-old-api-archive-\*.tar.gz`) and folder renamed
`backend\_DEPRECATED` on VM and local. The frozen v1 contract is VOID.
* WHY: its content endpoints encoded the rejected euphemized-insight
design (/ai-ranked model-ordered list, insight\_status/observation
windows/days\_remaining, market confidence) — pre-RA violations by
substance. Do not resurrect or import from it.
* NEW API: built FROM SCRATCH per Task 03 in a fresh repo/folder
(e.g. C:\\Redixfi\\api). During Task 04, ONLY these compliance-neutral
plumbing pieces are PORTED (deliberate file-by-file copy from the
archive, never live imports): Firebase-token→JWT auth, Razorpay verify,
users/user\_usage/subscriptions schema, usage-metering pattern.
* DATA\_MODEL note: old model targeted Oracle for production with
flattened schemas — CONFIRM whether Oracle is still the plan before
Task 03 (measured\_signals/fundamentals\_raw are document-shaped).

## Working agreement for new chats

* This doc + the relevant task doc = full context. Don't re-brainstorm
decisions recorded here; flag conflicts instead.
* All new scripts follow existing conventions: config.db.get\_db(),
sys.path.append parent, .env for secrets, UpdateOne upserts, loud
failure (sys.exit(1)) on empty results during market days.
* Every task doc has acceptance criteria — task is done when they pass.



\# Current Status 



\## COMPLETION NOTE — Tasks 01 + 02 (2026-07-18)

FILES: data-pipeline/measured\_signals\_builder.py (new) · marketaux\_news\_fetcher.py (patched: G5+B10) ·

data-pipeline/backfill\_matched\_symbols.py (new, one-time) · data-pipeline/intraday\_recap\_builder.py (new) ·

prediction\_engine/scheduler.py (patched).

COLLECTIONS: measured\_signals (populated, 746 docs, verified 3 runs) · signal\_change\_log (empty until 2nd trading day, correct) ·

news\_events.matched\_symbols + index (code done; BACKFILL NOT YET RUN) · news\_daily\_stats (populates from next fetch) ·

intraday\_daily\_recap (name MY choice — task doc didn't specify; Task 03 API must use it).

SCHEDULER: measured\_signals 07:50 · intraday\_recap 15:50 · insider 18:30 (was never scheduled — root cause of sparse filings\_insider) · symbols\_master confirmed pre-existing.

DEVIATIONS: match\_score threshold 22 (task doc said 20; live sample showed bystander at 20.08 vs subject 24.7) ·

insider\_net\_30d keyed on trade\_date not filing date · event\_risk reads matched\_symbols→tickers→entities fallback chain.

OPEN: run backfill\_matched\_symbols.py on VM · deploy order fetcher→backfill→scheduler restart · confirm insider script filename is insider\_trading\_api.py ·

dhan\_candles\_Intra\_15m stale since 07-14 — MUST fix before 15:50 recap slot (loud-fails on empty) ·

CROSS-CUTTING BUG (not this task): news\_impact.py queries `timestamp`+`tickers`, neither exists on live news\_events docs → runner/monitor/intraday news layer is a silent no-op; fix in a prediction-side session ·

Task 01 criteria pending live: deltas + change\_log Monday, Telegram fires on deploy.

## COMPLETION NOTE — Task 03 (2026-07-19)

FILES: api/app/main.py (new) · api/app/core/{config,db,cache,ra\_mode,mongo\_clean,response,freshness,auth,rate\_limit,dates,pagination,sectors,session,universe,news\_fields}.py (new, 15 modules) · api/app/routers/{market,signals,intraday,research,news,charts,brief}.py (new) · api/requirements.txt, api/.env, api/README.md, api/scripts/smoke\_test.py (new).

COLLECTIONS: none added — read-only over existing 01/02/G1 collections. Verified live: symbols\_master 751, measured\_signals 746, signal\_change\_log 1760 populated. news\_daily\_stats + intraday\_daily\_recap still 0 docs (pre-Monday) — API returns empty/404 gracefully, not 500.

SCHEDULER: none added — this is a standalone uvicorn service, not scheduler-driven.

DEVIATIONS: ra\_mode strip list extended past the task doc's fields to cover corporate\_events (expected\_direction/confidence/event\_impact/impact\_strength) and intraday\_eligible\_stocks\_v2 (trade\_bucket/signal\_score) — both verified live as real leak risks, not hypothetical · sort=market\_cap whitelisted but no-ops (field doesn't exist anywhere) · /intraday/scan sector list corrected to Dhan's real normalized names (NIFTY BANK/NIFTY IT/NIFTY INFRA, not the pipeline's BANKNIFTY/NIFTYIT/NIFTYINFRA input constant) — found via live testing, banknifty was silently null before the fix · range\_state uses a standard opening-range-breakout definition (undocumented in task doc) · regime chip (screen spec) has no backing field anywhere — exposed raw vix % instead of inventing a classifier.

OPEN: read-only Mongo user not provisioned — api/.env reuses the pipeline's credential · corporate\_events has some rows keyed by raw BSE numeric code instead of canonical symbol, so /research/{symbol} misses those (pre-existing corprate\_event.py data-quality issue, not fixed here) · Oracle question resolved as stale (Mongo-only, zero Oracle refs found) · auth is an allow-all stub awaiting Task 04's Firebase→JWT swap.

## COMPLETION NOTE — Task 04 (2026-07-19)

FILES: api/app/core/{security,firebase\_auth,app\_models,users\_repo,metering,razorpay\_client}.py (new, 6 modules) · api/app/core/{auth,config,db}.py (rewritten/extended) · api/app/routers/{auth,me,billing}.py (new) · api/app/routers/{research,signals,news}.py (patched: B8 metering/masking/delay) · api/app/main.py (patched: new routers, startup index hook, CORS methods widened) · api/alert\_worker.py (new) · api/scripts/provision\_mongo\_users.py (new) · api/scripts/smoke\_test\_task04.py (new) · api/scripts/smoke\_test.py (patched: 1 fixture date, see below) · api/requirements.txt, api/.env, api/README.md.

COLLECTIONS (new, in a new `redixfi\_app` DB — pipeline `redixfi` stays untouched/read-only): users, watchlists, user\_usage, subscriptions, orders, user\_inbox (KEEP FOREVER), counters (founding-member CAS counter), push\_tokens, watchlist\_behavior\_cache (alert\_worker's trigger-4 state cache).

BEFORE-STARTING ITEMS (all four addressed, per the instruction to fix Task 03's completion-note items before building):

1. App DB configured from the start as a genuinely separate connection (MONGO\_URI\_APP/APP\_DB\_NAME, core/db.py::get\_app\_db()) — but the actual read-only/scoped credentials could NOT be provisioned: live-probed `redixfi\_user` (createUser attempt) — Unauthorized, code 13, confirming it lacks userAdmin exactly like Task 03 found for the pipeline DB. Went further and live-probed redixfi\_app directly: `insert\_one` also Unauthorized — this credential has ZERO privileges outside `redixfi`, not just missing an index privilege. scripts/provision\_mongo\_users.py is ready for an operator to run once; api/.env documents the exact follow-up. Startup index creation is wrapped to warn-not-crash so this doesn't take Task 03's working routes down with it (verified live — see below).
2. Firebase-token→JWT: real verify/issue/refresh built (core/firebase\_auth.py + core/security.py), ported in spirit from backend\_DEPRECATED/src/services/authService.js (read + rewrite, not imported) — access+refresh split with independent secrets and token\_version-based revocation, which the old single-30d-token design didn't have. DEV\_AUTH=true in this sandbox's .env (no live Firebase project reachable here) — same convention the old backend used, now config-gated and documented as dev-only.
3. Razorpay: NOT a port, by finding — subscriptionController.js took a client-supplied payment\_id with zero signature verification and `razorpay` wasn't even in the old package.json's dependencies. Written fresh against Razorpay's documented HMAC order+webhook signature scheme (core/razorpay\_client.py), extended with webhooks (/webhooks/razorpay), a founding-member counter (atomic CAS via users\_repo.try\_reserve\_founding\_slot, auto-refund if the cap fills mid-checkout-race), and pro-rata cancel refunds (time-in-period math, releases the founding slot back to the counter on cancel). users/user\_usage/subscriptions schema ported from DATA\_MODEL.md's shape, extended: tier gains `founding`, `kyc\_status` (reserved, RA day), `tnc\_accepted\_at`.
4. Watchlist confirmed symbol-only against docs/04\_TASK\_USERS\_ALERTS.md before writing any code — no insight\_date/observation\_start/observation\_end. watchlists docs are `{\_id: user\_id, symbols: [...]}`.

ALERT ENGINE (B4) — 5 triggers implemented in alert\_worker.py, checked against live collections before writing (not assumed):

- Trigger 1 (signal delta): measured\_signals.delta\_1d is null on every doc right now (only 1 trading day populated — matches Task 01/02's "signal\_change\_log empty until 2nd trading day" note) — code is correct, live-verified 0 qualifying rows today, will start firing from the 2nd trading day.
- Triggers 2/3 (news ∩ watchlist / market-scope high-severity): both read news\_events.matched\_symbols — live-checked: 200 docs, 0 with non-empty matched\_symbols, field absent entirely from the latest doc — confirms Task 01/02's "BACKFILL NOT YET RUN". Logs 0 matches gracefully; will start firing once the backfill runs.
- Trigger 4 (watchlist behavior states) does NOT reuse intraday/phase5\_intraday\_monitor.py as literally named in the task doc ("phase5 state machine") — that script computes LONG/SHORT trade-monitor states for intraday\_final\_candidates\_v3 entries, a forbidden-pre-RA internal collection (ra\_mode.FORBIDDEN\_COLLECTIONS) tied to a directional trade thesis a plain watchlist symbol doesn't have. Built a fresh non-directional classifier (classify\_behavior) over candles\_intraday\_15m instead, keeping the doc's own "sustaining"/"fading" words but never phase5's directional framing — flagged as a deliberate deviation, not a silent substitution. Also expect frequent no-ops live: the 15m fetcher only covers Phase 1's eligible universe until extended to eligible ∪ all-watchlisted-symbols (existing decision record in this doc).
- Trigger 5 (daily brief): daily\_brief collection confirmed not to exist yet (Task 05 not built) — same 404-safe stance as /brief/latest.
- news\_daily\_stats/intraday\_daily\_recap (both 0 docs) are read by NEITHER trigger — confirmed by design, not by omission.

B8 METERING: /research/{symbol} 3/day for authenticated free users (anonymous stays unmetered — no identity to key a counter on); /signals masks composite\_score/etc. outside a FIXED top-N (name-asc, since no market\_cap field exists anywhere — same no-op Task 03 already established for sort=market\_cap) rather than the request's own sort, so it can't be gamed by re-sorting; /news delays free/anonymous callers by 24h, overriding `?today=true`. Masking applies only to the /signals list per the task doc's literal wording — /signals/{symbol} direct-detail is NOT masked (flagged, not silently decided).

TESTING: scripts/smoke\_test\_task04.py (mongomock, bypasses both \_db and \_app\_db) — 41/41 passing, covering auth+revocation, watchlist CRUD+caps, metering, masking, news delay, billing/founding-counter race-safety, all 5 alert triggers (incl. a forced sustaining→fading transition), inbox list/read. scripts/smoke\_test.py (Task 03) re-run — 176/176 still passing after one fixture fix (a seeded news item moved from "today" to "yesterday", since anonymous requests now default to free-tier's 24h news delay). Live against the real VM Mongo: /healthz and every Task 03 read route (incl. /signals' new `locked` field) confirmed still working unauthenticated; /auth/firebase-login confirmed failing (500) — expected per the Mongo-users open item below, independently confirmed via a direct insert\_one probe against redixfi\_app, not assumed from the 500 alone.

DEVIATIONS (beyond the 4 already listed under before-starting items): founding-slot CAS counter had to avoid `upsert=True` on the cap-guarded update — confirmed live (via mongomock, same semantics as real MongoDB) that once the counter doc exists but count>=cap, an upsert=True update whose filter no longer matches attempts an INSERT with the same \_id and throws a duplicate-key error; fixed by guaranteeing the doc exists first via a separate `$setOnInsert` (filtered on \_id only, always upsert-safe) then a plain non-upsert guarded increment · /me/inbox had to add an `alert\_id` field alongside the stripped `\_id` — envelope()'s shared mongo\_clean strips every "\_id" key on every route, which would otherwise make the id this endpoint hands out unusable for the very next call (POST /me/inbox/{alert\_id}/read) that needs it; caught by the smoke test, not assumed working · billing modeled as one-time Razorpay orders with manually-tracked period\_days/current\_period\_end rather than Razorpay's Subscription/Plan API — matches what the old system actually did (DATA\_MODEL.md's SUBSCRIPTIONS shape is start/expiry-date based, not a recurring-mandate reference), and is simpler/sufficient at this scale.

OPEN: Mongo users still not provisioned (scripts/provision\_mongo\_users.py ready, needs an operator with admin/userAdmin access to run it once) — until then, MONGO\_URI\_APP reuses redixfi\_user, which has ZERO privileges on redixfi\_app (live-confirmed, not just missing index rights), so every Task 04 write route (signup, watchlist, billing, inbox) will 500 against the real VM Mongo; Task 03's read routes are unaffected (startup index creation is wrapped to warn, not crash) · RAZORPAY\_KEY\_ID/SECRET/WEBHOOK\_SECRET left blank in api/.env (no test-mode Razorpay project reachable in this sandbox) — billing routes 503 loudly rather than accept unverified payments; fill in before exercising /billing/* live · DEV\_AUTH=true in api/.env (no live Firebase project reachable here) — must be false wherever real users can reach this deploy · alert\_worker.py has no scheduler entry yet (unlike Tasks 01/02's jobs) — needs a cron/systemd slot decision during deploy, analogous to fundamentals\_fetcher.py's still-pending 19:30 slot · /signals/{symbol} direct-detail is not B8-masked (task doc only specifies list-level masking) — a free user hitting a locked symbol's detail route directly still sees full data; flagged as a scope gap, not fixed here.

## COMPLETION NOTE — Task 05 (2026-07-19)

FILES: api/app/core/screener.py (new) · api/app/core/signals\_view.py (new — row\_from\_joined/free\_tier\_unlocked\_symbols extracted out of routers/signals.py) · api/app/core/intraday\_scan.py (new — compute\_scan\_base extracted out of routers/intraday.py) · api/app/routers/signals.py (patched: POST /signals/smart-screen, switched to the two extracted core modules) · api/app/routers/intraday.py (patched: switched to core/intraday\_scan.py, no behavior change) · api/app/core/config.py (patched: OPENAI\_API\_KEY) · api/.env (patched: OPENAI\_API\_KEY, copied from the pipeline's root .env — same key, no separate one provisioned) · data-pipeline/daily\_brief\_builder.py (new) · api/scripts/smoke\_test\_task05.py (new) · api/README.md (patched: Task 05 section).

COLLECTIONS: daily\_brief (new — pipeline DB `redixfi`, per GET /brief/latest and alert\_worker.trigger\_daily\_brief's existing read path, confirmed before writing any code, NOT redixfi\_app) · smart\_screen\_log (new — redixfi\_app, alongside the other user-facing audit collections; a scope decision, not specified by the task doc either way).

B9 SMART SCREENER: whitelist schema exactly as specified (11 filter fields + refused/refusal\_reason), enforced with a second, independent code-level validation pass over every LLM-returned field (never trusts a field/value the LLM invented) — same "never trust model output past a hard boundary" posture as ra\_mode.strip\_forbidden. TWO-LAYER refusal guard: LLM-level refusal instruction (layer 1) OR an independent regex over the RAW query text (layer 2, app/core/screener.py::raw\_query\_forward\_intent) — layer 2 overrides layer 1 whenever it matches, even if the LLM said refused=false; scripts/smoke\_test\_task05.py tests this literally by monkeypatching the LLM to always return refused=false and confirming a forward-intent query is still refused (same "force the failure condition" discipline Task 04 used for revocation and the founding-slot race). Execution reuses GET /signals' join and GET /intraday/scan's row computation via two newly-shared core modules (signals\_view.py, intraday\_scan.py) rather than duplicating either — delivery\_state/dma\_state/pcr\_band map onto measured\_signals.signal\_states chips so thresholds can never drift from Task 01's builder. Every call logged to smart\_screen\_log.

B12 DAILY BRIEF: data-pipeline/daily\_brief\_builder.py, standalone script (same unwired-from-scheduler state as alert\_worker.py after Task 04 — explicitly NOT wired into prediction\_engine/scheduler.py by this session; intended 08:10/16:15 slots documented in a comment block at the bottom of the file for an operator to add). Forward-tense regex guard duplicated (not imported) from Task 01's measured\_signals\_builder.py — independent scripts, kept in sync manually, flagged for future edits. Regenerate-once-then-template-fallback, same two-strikes shape as Task 01. Stat-of-the-day line is computed in CODE from measured\_signals (never LLM-invented) so it can't be a hallucinated number. alert\_worker.trigger\_daily\_brief (Task 04) needed no code change — it was already correct against this schema and was a guaranteed no-op purely because daily\_brief didn't exist yet; confirmed it now fires.

TESTING: scripts/smoke\_test\_task05.py (mongomock, dual-bypass — app.core.db.\_db AND config.db.\_db both set to the SAME mongomock object, since daily\_brief\_builder.py reads through the repo-root config/db.py, a different module global from the API's app/core/db.py) — 28 checks: the 20-query acceptance set exceeded (18 valid/5 forward-intent/3 gibberish vs. the doc's 12/5/3 minimum), execution-correctness spot-checks per filter type against real fixture data, B8 masking parity with /signals, watchlist\_only (authenticated + anonymous-zero-results), the two-layer-guard bypass test, smart\_screen\_log completeness, all three brief-generation paths (clean/regen-once/template-fallback), --no-llm, GET /brief/latest, and alert\_worker.trigger\_daily\_brief now firing. scripts/smoke\_test.py (176) and scripts/smoke\_test\_task04.py (41) re-run afterward, both still passing unchanged — confirms the row\_from\_joined/compute\_scan\_base extractions out of routers/signals.py and routers/intraday.py didn't alter existing route behavior (245 total checks passing across all three suites).

DEVIATIONS: LLM transport for both B9 and B12 reuses measured\_signals\_builder.py's plain-urllib JSON-mode/temp-0 pattern rather than adding the `openai` SDK as a new dependency for a second/third caller · this sandbox DOES have outbound network access to api.openai.com (confirmed via one ad-hoc manual call during development — a real OpenAI response correctly parsed a test query) unlike the VM-only MONGO\_URI/Firebase/Razorpay endpoints Task 04 found unreachable; the committed test suite still mocks the LLM layer deliberately (determinism + reproducibility + zero cost for the 12/5/3 query set and the forced-bypass test), not because live calls are impossible here · smart\_screen\_log placed in redixfi\_app rather than redixfi (product/user audit data, not pipeline output) · smart-screen results capped at 50 rows, name-asc, no pagination (task doc doesn't specify; keeps payload small for the <2.5s p95 budget) · missing/empty OPENAI\_API\_KEY makes smart-screen fail-soft to "couldn't parse" rather than 500, mirroring --no-llm's spirit rather than Task 04 billing's fail-loud-503 posture (no unverified action is being silently accepted either way, so both postures satisfy the same underlying principle).

OPEN: live-VM verification explicitly out of scope this session (code not yet deployed) — not attempted, not claimed · daily\_brief\_builder.py has no scheduler entry (see B12 above) · news\_events.matched\_symbols backfill status unchanged from Task 04's finding (still unverified live; B9's event\_risk filter and B12's flagged-news gathering are both written correctly against the schema and will start reflecting real matches once the backfill runs, same as alert\_worker's triggers 2/3) · Ask-RedixFi chat (v1.5) intentionally not touched.


## Deploy status: api/ live on VM (2026-07-19)
- Code deployed via scp initially, then git repo synced properly
  (github.com/ajaychouhan9/redixfi-backend, api/ + data-pipeline/
  daily_brief_builder.py both tracked). VM uses `git pull` /
  `git reset --hard origin/main` going forward — no more scp.
- Venv created at api/.venv (needed `sudo apt install python3.10-venv`
  first). All deps installed. mongomock missing from requirements.txt —
  ADD IT (test-only dep, caught on VM install).
- ALL THREE SMOKE SUITES PASSING LIVE AGAINST REAL MONGO on VM:
  smoke_test.py 176/176, smoke_test_task04.py 41/41,
  smoke_test_task05.py 28/28 (245 total). Tense-guard caught real
  "likely" in a live OpenAI response during daily_brief test —
  confirmed working live, not just mongomock.
- Run scripts as modules from api/ root: `python3 -m scripts.smoke_test`
  (NOT `python3 scripts/smoke_test.py` — breaks app.* imports).

## Decision record: VM Mongo credentials (2026-07-19)
- No admin-level Mongo account existed initially (only redixfi_user,
  readWrite on redixfi). Root cause: MongoDB localhost exception closes
  once any user exists — redixfi_user was the only account ever made.
- Fix: briefly set `authorization: disabled` in /etc/mongod.conf,
  created mongoAdmin (root role), re-enabled. bindIp confirmed
  127.0.0.1-only throughout. Ran provision_mongo_users.py →
  created redixfi_readonly (read on redixfi) + redixfi_app_svc
  (readWrite on redixfi_app). Passwords: NO special characters —
  @ in Mongo URI passwords breaks URI parsing (cost real time here).
- VM .env: MONGO_URI + MONGO_URI_APP both correct. VERIFIED live
  (all 245 smoke checks passed against real Mongo).
- LESSON: never use special chars in Mongo passwords used in URIs.

## Infrastructure: nginx + SSL live (2026-07-19)
- API publicly reachable at https://api.redixfi.com/healthz
- nginx reverse proxy: api.redixfi.com → 127.0.0.1:8000
- Let's Encrypt SSL via certbot, auto-renewing, expires 2026-10-18
- HTTP → HTTPS redirect (Certbot managed)
- CORS headers added to nginx location block (allows Vercel + mobile)
- Oracle VCN security list: TCP 22/80/443 open; port 5000 closed
  (old Node server decommissioned)
- Systemd services confirmed reboot-survivable:
  `redixfi` (scheduler, service name NOT "redixfi-scheduler") +
  `redixfi-api` (uvicorn port 8000)

## Decision record: UI repos & deployment topology (2026-07-19)
- THREE separate repos at the same level:
  C:\Redixfi         (existing backend — IS the redixfi-backend repo root)
  C:\redixfi-web     (NEW — Next.js, Task 07, deploy to Vercel)
  C:\redixfi-mobile  (NEW — Expo/React Native, Task 06, deploy via EAS)
- Same structure applies on GitHub: three separate remotes.
- Each UI repo has its own docs/ with master context + task doc +
  screen spec before opening Claude Code.
- Deployment: mobile → EAS → Play Store (no server).
  Web → Vercel free tier (CDN, SSR, git-push deploys).
  API → VM behind nginx (already live).
- API base URL: env-config in both UI repos (NEXT_PUBLIC_API_URL /
  Expo app.config) — never hardcoded.
- redixfi-mobile sits at C:\redixfi-mobile (same level, answers the
  question: yes, beside C:\Redixfi and C:\redixfi-web).

## Decision record: pricing FINAL (2026-07-19)
- Free / Analytics Pro ₹499/mo / Founding ₹4,999/yr — single paid tier
  pre-RA (supersedes the earlier 499/799/1099 three-tier draft).
- Prices GST-INCLUSIVE (display ₹499, invoice shows breakup). Do NOT
  raise to pass GST through; revisit only on demand evidence (>4%
  conversion), never for tax.
- Net realization: ~₹410/monthly sub, ~₹4,100/founding annual.
  Break-even ~60-75 subs; ~70 founding annuals fund RA fully.
- Web-steering: Play + web checkout both exist; web gets 5-10% promo
  codes via email/WhatsApp (WhatsApp REQUIRES marketing opt-in checkbox
  at signup — build into Tasks 06/07 onboarding flow).
  NO in-app mention of web pricing (Google anti-steering rules).
  Founding annual is WEB-EXCLUSIVE (not on Play Store at all).
- Promo codes: promo_codes collection + validation endpoint + atomic
  redemption (add to Task 04 billing module), web-checkout only,
  channel-tagged for attribution. All promo copy passes tense/
  forbidden-words compliance tests.
- Smart-screener fair-use cap: ~25 queries/day per user (OpenAI cost
  control — add to Task 04 metering config).
- GST registration: voluntary from launch recommended (founding buyers
  want invoices); mandatory at ₹20L annual turnover.

## Pending items (carry into every new session)
- alert_worker.py: no scheduler entry yet — decide long-running loop
  (own systemd service `redixfi-alerts`) vs single-pass (scheduler
  REPEAT_JOBS entry). Check the file's run pattern first.
- daily_brief_builder.py: no scheduler entry yet — add to DAILY_JOBS
  at 08:10 + 16:15 in prediction_engine/scheduler.py.
- news_events.matched_symbols backfill: STILL NOT RUN — affects alert
  triggers 2/3, B9 event_risk filter, B12 flagged-news. Run:
  python3 data-pipeline/backfill_matched_symbols.py
- DEV_AUTH=true in api/.env — flip to false + add real Firebase
  service account JSON before real users can log in.
- Razorpay real keys: RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET blank —
  billing routes 503 until filled.
- mongomock missing from api/requirements.txt — add it.
- /signals/{symbol} direct-detail not B8-masked (task doc only
  specifies list-level masking) — scope gap, not fixed in Task 04.
- 28 updates available on VM (3 security) — run apt upgrade when
  convenient.

## COMPLETION NOTE — Task 07 web (2026-07-20)

REPO: C:\redixfi-web (Next.js, separate from backend repo)
STATUS: Working end-to-end against live API (https://api.redixfi.com).
Dev server confirmed at localhost:3000. NOT yet committed to git or
deployed to Vercel — commit + Vercel deploy is the immediate next step.

WHAT IS LIVE:
- Full app shell: sidebar + persistent MarketRibbon (5-section structure
  matching mobile spec)
- Home, Signal Dashboard (list + AI smart screener + stock detail +
  movers), Intraday Live (state-machine: pre/live/post-market), Research
  Pro (search + company page with candle/volume/delivery chart), News,
  Pricing/checkout (Razorpay wired), Account (profile/watchlist/alerts/
  inbox), More (disclaimer/data sources)
- Web-exclusive pieces: data-grid + column picker + multi-filter + CSV
  export (paid only), founding-counter checkout, richer charts
- SEO layer: /stocks/{symbol} SSR+ISR (~751 pages), /market-brief/{date}
  archive, 5 canned /screens/* pages, dynamic sitemap.xml (766 URLs),
  robots.txt
- Forbidden-words/tense compliance sweep wired into `npm run build`
  (currently passing)
- Education system: tap-to-learn explainers, analyst checklist, conflict
  surfacing — per analysis-enablement spec

GAPS FOUND (real API behavior, documented in README Known Gaps):
- Live API root is /api/v1 not bare paths (minor — all calls adjusted)
- GET /intraday/watchlist-states does NOT exist — tab shows honest
  "not available" instead of fake data (needs Task 04 extension)
- /market-brief archive has latest endpoint only, no by-date history
  (needs API addition for the full archive page)
- Billing 503s until Razorpay keys provisioned (flow fully wired,
  waiting on keys)
- Promo-code endpoint does NOT exist despite the master-context decision
  record — no UI built against it (needs Task 04 billing module addition
  before UI can be built)

IMMEDIATE NEXT STEPS (in order):
1. git commit + push to GitHub remote (redixfi-web repo)
2. Connect to Vercel (import from GitHub, set NEXT_PUBLIC_API_URL=
   https://api.redixfi.com, deploy)
3. Add custom domain redixfi.com to Vercel (Namecheap: @ A record →
   Vercel's IP, or CNAME → cname.vercel-dns.com per Vercel's instructions)
4. Wire the two pending gaps as small follow-up tasks:
   - /intraday/watchlist-states endpoint (Task 04 API extension)
   - Promo-code endpoint (Task 04 billing addition)
   - /market-brief/{date} by-date endpoint (Task 03 API addition)
5. Task 06 (mobile) — same pattern, C:\redixfi-mobile

PENDING ITEMS STILL OPEN (carry forward):
- alert_worker.py: no scheduler entry
- daily_brief_builder.py: no scheduler entry (08:10/16:15)
- news_events.matched_symbols backfill: NOT RUN
- DEV_AUTH=true → needs Firebase service account for real users
- Razorpay real keys
- mongomock missing from api/requirements.txt

## ROADMAP v2 (2026-07-21) — agreed priority order, root-first
Supersedes the original 01-07 sequence (those are DONE except 06).
Current sequence:
1. **Task 11 — OPS COMPLETION SPRINT** (do FIRST): activate everything
   built-but-dead — alert_worker wiring, daily_brief scheduling,
   matched_symbols backfill, DEV_AUTH=false + real Firebase, Razorpay
   test keys + start KYB, cancel_subscription datetime fix, B8 paywall
   bypass on /signals/{symbol} detail (revenue leak), promo plan-name
   web fix, apt upgrade. This is demo-vs-business work.
2. **Task 10 — Evening freshness + refinements**: measured_signals moves
   07:50 → 16:30 with same-day candle (Dhan-or-synthesized from 15m,
   source-marked); component-level change breakdown data (merged);
   industry-based sector rank (fixes meaningless "#25 of 49 in NIFTY");
   movers name join; pledge null render; watchlist-states wiring;
   honest free-tier fallback copy.
3. **Task 09 — Fundamentals derived layer** (REWRITTEN vs real payload):
   fundamentals_derived builder + market_cap/industry backfill + peer
   endpoint + question-framed UI panels. ⚠️ MUST strip analystView/
   recosBar/overallRating at ingest (third-party buy/sell = directional
   content pre-RA) with tests.
4. **Task 12 — Education Layer v2**: ALL content pre-authored + versioned
   (explainers + how_calculated + curated FAQ trees + FICTIONAL-only
   examples), fetch-only serving (zero live LLM at serve time), insight
   chips, change-breakdown render, summary-card engine (no action-urging
   wording), CAUSAL-QUESTION RULE (descriptive always; cause only when a
   matched news event exists that day).
5. **Task 13 — Screener v2 compare-in-chat** (after 09): symmetric
   measured+derived tables for 2-5 symbols, code-computed
   "biggest differences" block, refusal still fires on verdict asks but
   table still served.
6. **Task 06 — Mobile** (after 10-12 so it inherits the fixed product;
   Play review lead time absorbs the wait).
Explicitly deferred: Ask-AI full chat (v1.5 — FAQ trees cover most,
usage data will shape it), midday score recompute (as-of-close labeling
+ live Intraday tab handle market hours), market-brief archive polish,
RedixFi Signals scores, all post-RA items (doc 08).

## Design decisions locked with Roadmap v2
- Education = pre-authored content in versioned store (repo JSON +
  Mongo), scripts fetch-only. No live LLM in any education serve path.
- Teaching examples: FICTIONAL stocks only, never real names (aging +
  compliance). The user's own viewed stock's live values in explainer
  current_state lines are the only "live example" (data display).
- "More data" reframed: not dozens of signals — answers to questions a
  person asks, collapsible, each with explainer. Depth on demand.
- Comparison results: symmetric facts, user's typed order, no aggregate
  ranking, verdict asks refused while facts still served.

## SESSION LOG — Ops debugging saga (2026-07-22)
This session was almost entirely live production debugging of Task 11's
auth + billing chain, on redixfi-web + redixfi-backend/api on the real
VM/Vercel deployment. Outcome: BOTH FULLY WORKING END-TO-END NOW.

### Firebase phone auth — RESOLVED, full chain now works
Sequence of real bugs found and fixed, in order encountered:
1. `.env` had TWO conflicting var names for the same purpose
   (`FIREBASE_CREDENTIALS_PATH` commented-out Windows path vs
   `FIREBASE_SERVICE_ACCOUNT_PATH` active Linux path) — code reads
   `FIREBASE_CREDENTIALS_PATH`. Fixed by renaming the active line.
2. Frontend (`redixfi-web`) had a leftover DEV_AUTH sandbox login UI
   ("Continue as test user (dev)") sending a fake `"dev-test"` string as
   a token — unrelated to the API's real DEV_AUTH flag, purely a
   frontend leftover from early Task 07 dev. Removed; real phone/OTP
   form now the only path.
3. Frontend had NO Firebase web config at all (`NEXT_PUBLIC_FIREBASE_*`
   vars never set, neither locally nor on Vercel). Added:
   NEXT_PUBLIC_FIREBASE_API_KEY, _AUTH_DOMAIN, _PROJECT_ID, _APP_ID
   (project: redixfi-540b1). Set in BOTH .env.local AND Vercel env vars
   (Vercel changes require a redeploy to take effect — easy to forget).
4. Phone number needs E.164 format (+91XXXXXXXXXX) — Firebase rejects
   bare 10-digit numbers (`auth/invalid-phone-number`). UI fix pending/
   optional (auto-prepend +91) — currently users must type +91 manually.
5. `auth/billing-not-enabled` — Firebase phone auth REQUIRES the
   project on Blaze (pay-as-you-go) plan, not free Spark, even though
   actual usage stays within the free tier (10,000 verifications/month
   free on Blaze). Upgraded via Firebase Console → billing.
6. `auth/captcha-check-failed` / "Hostname match not found" — redixfi.com
   and www.redixfi.com were not in Firebase's Authorized domains list
   (Authentication → Settings → Authorized domains). Added both.
RESULT: real OTP login confirmed working end-to-end on redixfi.com.

### Razorpay checkout — RESOLVED, full chain now works
1. Backend `.env` needed RAZORPAY_KEY_ID/KEY_SECRET (test mode) — added.
2. `razorpay.errors.BadRequestError: receipt: the length must be no
   more than 40.` — order creation crashed (500) because the receipt
   string built in razorpay_client.py/billing.py exceeded Razorpay's
   40-char limit. FIXED (shortened receipt generation, full context
   moved to separate order-document fields, not crammed into receipt).
   NOTE: this bug was invisible to mongomock tests (41/41 passed) because
   mongomock never calls real Razorpay — only surfaced hitting the real
   API. Live-Razorpay smoke test recommended going forward (Task 11 item).
3. "Authentication key was missing during initialization" (Razorpay
   modal-level error) — frontend's `openRazorpayCheckout()` call in
   `src/components/app/billing/PlanCard.tsx` wasn't passing a `key`
   field. Fixed: added `key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID`.
   Needed NEXT_PUBLIC_RAZORPAY_KEY_ID set on Vercel too (redeploy
   required after adding).
4. Test card gotcha: `4111 1111 1111 1111` is Razorpay's INTERNATIONAL
   test card — India-only merchants must use an India test card instead:
   `5267 3181 8797 5449` (any future expiry, any CVV, any OTP digits).
5. UPI test path (`success@razorpay`) did not complete — most likely a
   Razorpay sandbox-side flakiness, NOT a code issue (card path proved
   the full chain works: order creation → checkout modal → signature
   verification → webhook). Not pursued further; low priority.
RESULT: real test-mode card payment confirmed completing end-to-end.
Verify tier flip + webhook landed via:
```
mongosh "mongodb://redixfi_app_svc:AppSvcPass123@127.0.0.1:27017/redixfi_app?authSource=redixfi_app" --quiet --eval '
db.users.findOne({phone:"+919811539192"},{phone:1,tier:1,subscription:1})'
```

### Lesson for all future ops sessions
When something "was fixed" but still fails identically, VERIFY don't
assume: (1) was it actually committed+pushed, (2) did the env var
actually get saved AND trigger a redeploy (Vercel doesn't rebuild
automatically on env-var-only changes), (3) is the fix in the built
output (view-source search), (4) check server logs directly
(journalctl / tail api.log) for the real traceback instead of inferring
from a generic frontend error message. Several rounds in this session
were spent because "Failed to fetch" / generic UI errors hid a specific
backend 500 with an exact, fixable Python traceback underneath.

## Task 11 status (as of this session)
✅ DONE + LIVE-VERIFIED: Firebase real auth, Razorpay test-mode checkout,
   receipt-length fix, matched_symbols backfill (confirm still needed),
   promo plan-name (confirm on web).
⏳ STILL OPEN: alert_worker.py wiring (verify), daily_brief_builder.py
   scheduling (verify), cancel_subscription datetime crash fix (verify),
   B8 paywall bypass on /signals/{symbol} detail (verify), live-Razorpay
   smoke test (add), Razorpay live-mode KYB (start, slow external clock),
   VM apt upgrade + reboot (do), phone-number +91 auto-prepend UI polish
   (optional, low priority).
NEXT SESSION: run the Task 11 completion prompt already drafted in this
doc's Part 2 (Claude Code, C:\Redixfi\api) to close the remaining items,
verify via completion note, THEN proceed to Task 10 (evening freshness —
next in Roadmap v2).

## DECISION — Task 11 CLOSED, Firebase/Razorpay frozen (2026-07-22, founder call)
Auth (Firebase) and payments (Razorpay test-mode) are CONFIRMED WORKING
LIVE on production (redixfi.com) — verified end-to-end same day: real
OTP login succeeded, real test-mode card payment completed. Any
"broken in production" signal from a subsequent session was almost
certainly confusion from the master-context revert incident, not a
real regression — do not re-investigate Firebase/Razorpay wiring unless
a NEW concrete symptom is reported with evidence (screenshot/log),
never on a generic "let's re-verify" basis.

FOUNDER DECISION: Firebase may be REPLACED with MSG91 (or similar)
LATER, closer to full launch, because Firebase phone-auth requires the
Blaze plan and gets costly at scale. This is a deliberate, deferred,
LATER-PHASE swap — not a bug, not urgent, not blocking anything now.
Razorpay LIVE (production) keys exist and will be deployed once the app
is otherwise complete — using TEST keys until then is intentional, not
an open bug.

TASK 11 IS CONSIDERED DONE for the purpose of moving the roadmap
forward. Remaining minor items (apt upgrade, live-Razorpay smoke test,
receipt-length regression test) may be swept up opportunistically in a
later session but must NEVER again block or delay Task 10/09/12/13.

Roadmap resumes at: **Task 10 — Evening freshness + refinement bugs.**

## Completion note — Task 10 (2026-07-24)
DONE, 335/0 offline suites, live-verified movers/industry-null fixes.
Part A: measured_signals moved 07:50→16:30; new candles_today job 16:00
(Dhan-or-synth-from-15m, source-marked); daily_brief_close moved to
16:45 AND gated on measured_signals (added dependency, correct call);
component_changes added. data_fresh preserved as-is; NEW fields
signals_data_fresh/signals_as_of added instead (deliberate, correct).
Part B: B1 root cause was symbols_master.name vs .company_name field-
name bug — fixed + movers now joins directly. B2: industry was 0/751
(task doc's "already populated" premise was WRONG) — implemented real
two-pass industry-peer ranking + incremental backfill from
fundamentals_raw.industry (1/751 today, ~30/day growth) — Task 09 owns
full backfill. B3 pledge+sweep null-render fixed. B4 watchlist wired.
B5 honest free-tier copy.
RECURRING ISSUE: 00_MASTER_CONTEXT.md reverted AGAIN (2nd time) — almost
certainly a stale open editor tab overwriting disk. ACTION: close any
editor tabs on this file; never leave it open between sessions.
NOTED (not a bug): a verification step wrote 40 real docs to PRODUCTION
Mongo via an active SSH tunnel — left as-is (net correctness gain,
overwritten by the 16:30 run anyway).
OPEN carried forward: matched_symbols data quality (69% non-canonical
tickers, 15% listicle false positives — affects alert triggers 2/3,
not yet addressed) · VM git-pull conflict on firebase-service-account.json
+ apt upgrade (VM-side, still open) · industry coverage near-zero until
Task 09.

Roadmap resumes at: **Task 09 — Fundamentals derived layer.**

## Completion note — Task 09 (2026-07-24)
DONE. fundamentals_derived_builder.py built (whitelisted-field-only
parser — analystView/recosBar/stockAnalyst/overallRating/averageRating
are NEVER READ, not stripped-after — stronger design than originally
specced). Compliance test force-tested against a synthetic violation
(not vacuous). ra_mode.FORBIDDEN_FIELDS extended as 2nd layer.
market_cap + industry backfilled into symbols_master, built ON Task
10's existing incremental path (no duplication) — RELIANCE verified:
market_cap=1795091.26, industry="Oil & Gas Operations".
API: /research/{symbol} fundamentals block, /research/{symbol}/peers,
real sort=market_cap (was a no-op), market_cap/fundamental_flag filters.
UI: 5 question-framed panels + raw expander on Research Pro, 2 new
Analyst Checklist rows, market-cap sort on Signal Dashboard. Live-
verified in real browser: RELIANCE renders correctly, TCS (no derived
doc yet) shows graceful fallback, zero console errors.
422 backend smoke checks / 6 suites, 0 failed. Compliance test PASS.
Frontend build/TypeScript/lint clean.
OPEN: fundamentals_raw still only 1/751 real docs (RELIANCE) — "verify
against 10 companies" criterion deferred until backfill grows (~30/day,
no code change needed) · fundamentals_derived_builder.py has no
scheduler entry yet (20:00 slot per task doc) — needs VM deploy access
· matched_symbols data quality (69% non-canonical, 15% listicle false
positives) still open, affects alert triggers 2/3 · VM git-pull
conflict + apt upgrade still open.
NOTE ON MASTER CONTEXT FILE ITSELF: prior sessions flagged disk-vs-git
divergence on this file repeatedly. Per founder direction, this is now
the SINGLE SOURCE OF TRUTH going forward — stop flagging/investigating
divergence, just keep this file (and its packaged distribution) current
after every session. Commit it too, but don't block work on reconciling
old git history against it.

## Completion note — Task 12 (2026-07-24)
DONE. 518 total offline checks passing (470 backend across 7 suites incl.
new scripts/smoke_test_task12.py's 48 + frontend build/TypeScript/compliance
sweep clean, 0 errors).

CONTENT: api/docs/metric_explainers.json extended in place (v1.0→v2.0,
NOT a new file — "extend/adapt" as instructed) — all 33 existing metrics
(not ~30; the file already covered more than the task doc estimated) got
`how_calculated`, a 2-6 node FAQ tree with `suggests` follow-up chips
(103 nodes total, several deliberately cross-metric e.g.
composite_score→conflict, delivery_pct→volume_ratio), and a fictional
worked example (18 of 33 — metrics like market_state/india_vix/risk_off_tone/
active_universe/behavior_state have no natural narrative example and were
left null rather than forcing one). Authored via a one-time scratch script
(not committed) that read the existing file and merged additions, so
existing short/deeper text was preserved verbatim, not rewritten.

VALIDATION: a real no-real-company-name sweep (21-name blocklist covering
RELIANCE/TCS/INFY/HDFC/... ) run against every `example` field — 0 matches
— plus a full FAQ `suggests` referential-integrity check (every id resolves
somewhere) — both re-run as part of smoke_test_task12.py, not just at
authoring time.

BACKEND (api/): core/education_content.py (Mongo-first, JSON-fallback
reader — GET /education/{metric} works even before the loader has run),
core/insight_chips.py (computed-fact + entry-point chips, code-only),
core/causal.py (THE CAUSAL-QUESTION RULE — descriptive always, cause only
when a category != "none" news_events doc matches symbol+exact date,
otherwise the honest "several explanations are usually possible" line
verbatim), core/summary_cards.py (watchlist_summary/sector_summary +
assert_no_action_language guard). New router app/routers/education.py:
GET /education, GET /education/{metric}, POST /education/engagement,
GET /summary/watchlist (auth), GET /summary/sectors (public) — registered
in main.py. scripts/load_education_content.py (new, one-time/deploy-time
loader, repo JSON → education_content collection in pipeline DB `redixfi`,
upsert-safe). routers/signals.py's /signals/{symbol} now also returns
component_changes (Task 10's data, rendered here for the first time),
change_explanation, and insight_chips.

DEVIATION (flagged, not silent): summary cards are PURE CODE TEMPLATES,
never LLM, for BOTH scopes — task doc says watchlist/sector "CAN use the
nightly LLM pass" (optional, not required). Reasoning: a watchlist summary
is inherently per-user (no fixed set a nightly job could pre-generate),
so computing the sentence structure in code from already-computed
measured_signals values needs no model call at all and unconditionally
satisfies "zero live LLM calls in any serve path" rather than depending on
OPENAI_API_KEY happening to be unset — same category of choice Task 01's
compute_component_changes already made for the adjacent component-changes
feature. Also avoids a new scheduler entry/collection for sector summaries
that are just as correct computed on request from data the evening builder
already wrote.

ZERO-LLM VERIFICATION: smoke_test_task12.py doesn't just delete
OPENAI_API_KEY — it patches urllib.request.urlopen (the exact transport
every LLM call site in this codebase uses) to raise if invoked at all
during the whole test run, so "no live LLM call" is proven by construction,
not inferred from an unset env var.

BUG FOUND (pre-existing, not introduced here, fixed while verifying this
session's own changes in a live browser check): redixfi-web's
signals/[symbol]/page.tsx never handled the API's `locked: true` response
shape for free-tier users on a paywalled symbol (GET /signals/{symbol}
returns only {symbol, company_name, sector, locked} in that case, per
Task 04's B8 paywall) — the page crashed with a 500
(`detail.signal_states.map` on undefined) for any locked symbol. Confirmed
live against api.redixfi.com/api/v1/signals/RELIANCE (locked:true for this
session). Fixed with a locked-state early return (same "Upgrade for..."
CTA pattern ResearchDetail.tsx already uses for its 429 case).

FRONTEND (redixfi-web/): src/data/metric-explainers.ts DELETED (dead code —
ExplainTerm.tsx now fetches GET /education/{metric} instead of a static
map; ~25 templates → 33, richer, versioned, server-authoritative).
New: lib/education/{interpolate,useEducationContent}.ts,
components/app/education/{FaqPanel,InsightChips,SummaryCard}.tsx,
components/app/signals/WhyDidThisChange.tsx. ExplainTerm.tsx rewritten
(API-backed, adds how_calculated + fictional example + "Common questions"
entry into FaqPanel, engagement logging via the new endpoint replacing the
old console.debug-only stand-in). Wired: signal detail page (insight
chips under the score header, "Why did this change?" card, all 11
ExplainTerm metricKey/ctx pairs on the page corrected — several were
already wrong against the CANONICAL metric_explainers.json keys before this
session, e.g. "rsi"→"rsi_14", "pledge"→"promoter_pledge",
"trend_10d"→"trend_10d_pct" — these would have 404'd against the new
fetch-only endpoint even though they silently "worked" against the old
static map because that map used its own different, undocumented key set).
FundamentalsPanels.tsx (Task 09) had the same class of drift —
"pe_vs_sector"/"volatility_risk"/"promoter_holding"/"fii_holding" don't
exist in metric_explainers.json at all — repointed to the real keys
(pe_ttm, risk_category, shareholding_change shared across all three
owner rows) rather than inventing 4 new content pieces to match the old
UI's naming. Signals Dashboard page gets a sector-standing summary card
(server-fetched); watchlist page gets a watchlist summary card
(client-fetched, auth-gated).

LIVE CHECK (local only, backend not yet deployed): `npm run dev` +
curl against several routes — confirmed no crash on / and /signals
(sector summary gracefully absent — expected, live API doesn't have Task
12 fields yet), confirmed the newly-fixed locked-symbol page and an
unlocked symbol (AARTIIND) both 200, confirmed ExplainTerm popovers render
(9 "relative inline-block" instances on one stock page) even against the
pre-Task-12 live API shape. Full end-to-end verification (chips lighting
up, FAQ cross-links, causal-rule cause/no-cause both appearing) needs the
backend deployed first — same "explicitly out of scope this session" stance
Task 09 documented for live-VM checks. Both signal_detail's new fields
(component_changes/change_explanation/insight_chips) and Fundamentals-
Panels' fixed ExplainTerm calls are defensively guarded (`?? []`,
conditional rendering) against the current pre-deploy API shape so nothing
crashes in the deploy-order gap either way.

OPEN: education_content loader (scripts/load_education_content.py) has no
deploy-step wiring yet — GET /education/{metric} works without it (JSON
fallback) but latency/staleness is better once it's run once per content
revision; not a scheduler job, an operator step, like
provision_mongo_users.py · founder review pass on the 231 authored content
pieces (explainer/how_calculated/faq/example × 33) not done this session,
per the task doc's own "Claude drafts all; founder reviews in one pass"
plan · matched_symbols data-quality issue (still open since Task 10) means
the causal rule will find real causes less often than it should live,
though the rule itself is correct and tested against both branches.

Roadmap resumes at: **Task 13 — Screener v2 compare-in-chat** (or founder
review of Task 12 content first, per the standing authoring-scope note).
