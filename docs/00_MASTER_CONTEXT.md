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

Roadmap resumes at: **Task 12 — Education Layer v2.**

## Completion note — Task 12 (2026-07-24)
DONE. 518 offline checks (470 backend/7 suites + frontend clean).
Content: metric_explainers.json v1.0→v2.0 — all 33 metrics got
how_calculated + FAQ tree (103 nodes) + fictional example (18/33; rest
correctly null, not forced). Zero real company names, zero dangling
FAQ refs (validated).
Backend: education_content.py (Mongo-first/JSON-fallback), insight_chips.py,
causal.py (causal-question rule: cause only on exact symbol+date news
match), summary_cards.py (PURE TEMPLATES for both scopes — stronger
than spec required "can use LLM"; zero-network proven by patching
urllib.request.urlopen to raise on any call). New education.py router
(4 endpoints). signals.py renders component_changes/change_explanation/
insight_chips.
Frontend: metric-explainers.ts deleted (dead code). New FaqPanel/
InsightChips/WhyDidThisChange/SummaryCard components wired in.
BUGS FOUND+FIXED live: (1) signal detail page 500-crashed on any
free-tier locked:true symbol — never handled that response shape,
fixed with standard upgrade-CTA pattern; (2) ~11 metricKey/ctx
mismatches (e.g. "rsi"→"rsi_14", "pe_vs_sector"→"pe_ttm") that would
have silently 404'd against the new fetch-only endpoint.
OPEN: content loader has no deploy-step wiring yet (JSON fallback works
regardless) · founder review pass on 231 content pieces NOT done ·
full live E2E verification needs backend deployed first.

## ⚠️ STANDING DEPLOYMENT GAP (carry forward, resolve before next session)
Tasks 09, 10, and 12 were all built/tested locally (mongomock + tunneled
prod-Mongo reads) but the VM git-pull conflict on
firebase-service-account.json (flagged during Task 11) may still be
BLOCKING deployment. Also found live: dhan_candles_sector.py has been
failing 100% on the VM (all 18 sectors, identical DH-905 error) — root
cause identified: payload missing "interval":"D" field, carries
intraday-only fields (expiryCode/oi) that don't belong on this
historical-candle endpoint. Fix given, not yet confirmed deployed.
BEFORE Task 13: (1) resolve the VM git-pull conflict, (2) git pull,
(3) restart both redixfi + redixfi-api services, (4) fix + verify
dhan_candles_sector.py on the VM, (5) confirm Task 10's scheduler
changes (measured_signals→16:30 etc.) actually took effect on the VM
(grep the live scheduler.py, don't assume from local commits).

Roadmap resumes at: **Task 13 — Screener v2 compare-in-chat** (AFTER
the deployment gap above is closed).

## DECISION — Task ordering after external review (2026-07-24)
Received a detailed external product review (bugs + roadmap suggestions
for redixfi.com). Reviewed and largely AGREED WITH — see notes below.
FOUNDER DECISION: do not interrupt current work. Queue is:
  1. Task 13 (screener compare) — IN PROGRESS/NEXT, finish first
  2. Task 14 (P0 bugs + SEO fix) — NEW, high urgency, do right after 13
  3. Task 15 (published track record + inspectable signal history) —
     NEW, the review's own top price-justification item
  4. Task 16 (personalized holdings brief + portfolio analytics +
     anomaly detection) — NEW, "Tier 2" from the review — NOTE: mostly
     REPACKAGING existing infra (B4 alerts + B12 brief + measured_signals
     + fundamentals_derived pointed at a user's own holdings instead of
     the market), not ground-up new scope — cheaper than it looks
  5. Remaining review items (WhatsApp/Telegram delivery — BLOCKED on the
     still-missing marketing-opt-in checkbox at signup, NL alert builder,
     CSV/API formalization, backtestable screens) — later, unscheduled

## Review notes (condensed, for the future task-doc-writing sessions)
- #1-4 P0 bugs: duplicate insider rows (missing year in date display),
  unreadable number formatting (paisa decimals on crore figures),
  Research pages NOT actually SSR'd despite Task 07's spec requiring it
  (generic homepage meta on all 750 pages — kills SEO + link previews,
  HIGHEST LEVERAGE FIX, do first within Task 14), raw "0" states reading
  as broken product (check daily_brief_builder scheduling is actually
  live — flagged unstable across several sessions already).
- #6 news relevance: Research page news panel showing macro headlines
  instead of stock-specific — undercuts the core "reads market for you"
  claim directly.
- #7 methodology transparency: score is currently a black box — ties
  directly into Task 15 (track record IS the transparency fix).
- #19 founding counter: pull from public view until traction genuinely
  supports it; don't remove the mechanic, just don't show a thin number.
- #20 free-tier depth-metering (vs fixed A-Z sample): good idea, real
  B8 rework, own scoped task later — not a quick tweak.
- #22/23 (track record + signal history): reads directly off EXISTING
  attribution_reports/accuracy_snapshot — presentation + compliant
  framing is the new work, not new measurement.
- Tier 2 items (#24-26): personalized brief = B4+B12 pointed at
  watchlist scope instead of market scope (mostly repackaging).
  Portfolio analytics = the "guards your portfolio" holder-persona
  promise made real, using existing measured_signals+fundamentals_derived
  aggregated per-portfolio. Anomaly detection = z-score over existing
  daily data, full-universe/disclosed-criteria discipline (same pattern
  as Intraday's Active Universe) required, not a curated "watch these."
- Tier 3: WhatsApp/Telegram alerts BLOCKED on marketing opt-in checkbox
  (flagged as a build item back at the pricing-decision stage, still not
  built) — sequence that first. Sector/peer-relative context is LARGELY
  ALREADY DONE via Task 09/10/13 — verify before treating as new scope.
- Price verdict agreed with: today's bundle undersold by bugs/hierarchy,
  not by weak underlying value — fixing P0s + shipping track record is
  "under-presented → correctly presented," not a repricing exercise.

## ✅ DEPLOYMENT GAP CLOSED (2026-07-27, verified live)
All 7 verification checks passed on the real VM/production API:
scheduler shows correct 16:00/16:30/16:45 jobs deployed · fundamentals_derived
(1 doc) + market_cap/industry backfill (1/751, matches expectation) live
in Mongo · /api/v1/education/pcr returns real content · smart-screener
correctly parses queries · dhan_candles_sector.py has "interval":"D" fix
confirmed at line 149 · signals_as_of freshness labeling working
end-to-end ("Scores as of 27 Jul close"). Tasks 09, 10, 12 are ALL
genuinely live in production, not just committed. Task 13 cleared to
proceed on real foundations.

## Task 13 — CONFIRMED LIVE + comparison tray UX fix deployed (2026-07-29)
Live-verified in browser: compare via "+Compare with" tray (persists
across Research page navigation, 2-5 symbol limit enforced with clean
"Comparison is full" message) AND via direct NL query
("compare X,Y,Z...") both work. Fuzzy-match unknown-symbol suggestions
confirmed working ("Couldn't find HCL — did you mean GHCL, HCLTECH?").
Biggest-differences block + null-safe "Not available" rendering (most
fields, since fundamentals_derived is still ~1/751) all correct.

FOUNDER DECISION: comparison-flow UI is functional and acceptable as-is
for now. Further UI polish (result display, styling refinement) is
PARKED — do not spend more session time on it. Priority is finishing
remaining functional/backend work first; UI enhancement pass happens at
the end, once the full feature set is complete.

Roadmap resumes at: Task 14 (P0 bugs + SEO — note: initial SEO/SSR
concern from the external review was already independently verified
FIXED via direct page fetch, so Task 14 should focus on the remaining
items: duplicate insider rows, number formatting, news relevance,
founding-counter visibility, methodology transparency) — OR Task 15
(track record) per founder's live priority call at execution time.

## Roadmap v3 (2026-07-29) — confirmed via direct evidence, not guesses
Task 13 (compare) DONE + confirmed live. Next queue:
1. **Task 14 — Research page SSR fix** (NEW doc written): confirmed via
   direct fetch that /research/{symbol} has generic homepage meta +
   never resolves past "Loading..." server-side, while /signals/{symbol}
   (same codebase) works perfectly with full SSR. This is the highest-
   leverage, evidence-CONFIRMED bug — 750 pages currently invisible to
   search + broken social-share previews. Likely a copy-adapt job from
   the working Signals pattern in the same repo.
2. **Task 15 — Published track record**: reads off existing
   attribution_reports/accuracy_snapshot. The actual price-justification
   move (per external review + founder's competitive-moat reasoning
   re: Screener/Trendlyne/free-AI-tools threat).
3. **Task 16 — Tier 2 (personalized holdings brief, portfolio
   analytics, anomaly detection)**: founder's stated competitive answer
   to (a) Screener/Trendlyne's cheaper breadth-without-synthesis and
   (b) free AI tools' lack of persistence/portfolio-memory. Mostly
   repackages existing B4+B12+measured_signals at a new scope.
4. THEN parked items batched together: ₹249/mo repricing (see pricing
   decision below), founding-counter visibility, comparison-tray UI
   polish, remaining minor P0s (duplicate insider rows, number
   formatting, news relevance, methodology transparency page).

## Decision — pricing repricing NOT YET DEPLOYED (confirmed via fetch)
Direct fetch of /pricing on 2026-07-29 confirms it STILL shows ₹499/mo
and "199 of 200 founding spots left" publicly. The ₹249/mo pre-RA-price
decision (discussed after competitor pricing research: Trendlyne GuruQ
₹310/mo, Screener Premium ₹4,999/yr) was a chat DECISION only — never
implemented. Queued as part of item 4 above, not urgent enough to
interrupt 14/15/16, but do not forget it exists.

## Verified-working evidence log (direct fetch, 2026-07-29)
Confirmed genuinely correct via direct page fetch (not assumed):
/  (home), /signals (list), /signals/{symbol} (detail — EVERY Task 09/
10/12 feature rendering correctly: tension callouts using proper past-
tense pattern-literacy phrasing, why-did-this-change breakdown with
honest causal-rule disclaimer, analyst checklist with honest "not
enough to rank" fallback), /signals/movers (real company names,
confirms B1 bug genuinely fixed), /pricing (meta correct, price content
stale). Confirmed BROKEN: /research/{symbol} (generic meta, stuck
Loading, no SSR). Confirmed MINOR gap: /intraday (correct meta, client-
loading body — lower priority, time-of-day-dependent data).

## Completion note — Task 14 (2026-07-29)
DONE. research/[symbol]/page.tsx rewritten as real server component +
generateMetadata + ISR (revalidate=900). ResearchDetail.tsx now pure
presentational; ResearchChart.tsx extracted as client leaf;
FundamentalsPanels.tsx takes peers as prop. Secondary item done:
/intraday seeds session/sector/recap server-side, only "live" tabs stay
client-polled. Verified via direct fetch of 5 real symbols — unique
meta + full content, zero "Loading...", RELIANCE shows all 5
fundamentals panels, other 4 show honest fallback. /research search
page unaffected. Build/typecheck/lint/compliance sweep all pass.

## DECISION — free-tier research metering is now unenforceable on
## Research pages, and that's ACCEPTED, not a bug (2026-07-29)
SSR+ISR caching (required for SEO — the whole point of Task 14) makes
the per-visitor "3 free research views/day" counter a no-op on
/research/{symbol}. FOUNDER DECISION: accept this — free, unmetered
Research access becomes an ACQUISITION FEATURE (SEO traffic lands on
genuinely useful pages) rather than a revenue leak, converting into
signups for the properly-gated metered features (unlimited Signals,
alerts, Smart Screener, compare). Do not attempt to re-introduce
per-visitor metering on this route — it would require re-splitting
public-shell/gated-deep-panel architecture and reintroduce the loading-
flicker problem just fixed. Closed decision, do not revisit without a
clear reason.

## DECISION — master context drift, permanent fix (2026-07-29)
This file has now drifted between disk/git/repos THREE times across
different sessions, wasting real time each time. PERMANENT RULE:
00_MASTER_CONTEXT.md's canonical copy lives in ONE place — the backend
repo (C:\Redixfi\api\docs\00_MASTER_CONTEXT.md) — since that is where
it was first established. Every session in ANY repo (redixfi-web,
redixfi-mobile when it exists) must be given a FRESH COPY at session
start (paste/attach the current version from this chat's package), and
must NOT independently maintain or edit its own repo-local copy as
source of truth. Whoever finishes a session pastes the completion note
back to THIS chat for the master file to be updated centrally — the
per-repo docs/ copies are disposable, re-copied fresh each time, never
themselves edited-and-trusted going forward.

## Completion note — Task 15 (2026-07-29) — IMPORTANT FINDING
DONE, 531 checks (505+26 new), 0 regressions.
⚠️ CRITICAL CATCH: the task doc's own "Data sources" list was WRONG —
named attribution_reports/accuracy_snapshot, but both are built from
predictions_snapshot (already FORBIDDEN, internal 7-day directional
engine's UP/DOWN hit rate + confidence bands). Publishing anything
derived from either would have revealed/marketed an unregistered
directional-prediction capability on the site's most compliance-
sensitive page. Session caught this by reading the source scripts
before writing code (exactly what the doc's "re-confirm" instruction
was for) and built ONLY from measured_signals + historical_candles +
symbols_master instead — matches the task doc's actual Deliverables
section, the Data Sources list itself was the error. LESSON for future
task docs: "data sources" lists must be verified against actual source
code, not trusted as written, especially near ra_mode.FORBIDDEN_*.
Built: track_record_builder.py (5-band forward-return study, N= +
date range on every %, low_sample flag never hidden, hard observed/
pending split on crossings — no placeholder implying a future result).
2 new collections (track_record_snapshot insert-only versioned,
signal_crossing_history). GET /track-record + /track-record/{symbol}.
Scheduled Sundays 20:30. Dedicated compliance test (poisoned with real
"likely"/"buy" strings to prove non-vacuous, same pattern as
fundamentals compliance test). /track-record page: SSR, ISR 6h.
REALITY: measured_signals only exists since 2026-07-18 — the 20-session
study has ~zero complete observations right now. Honest "not enough
history yet" state built and tested (synthetic fixture exercises the
non-empty path too) — this is EXPECTED, not a bug, will fill in
naturally as data accumulates.
ALSO FOUND: Task 14's frontend changes were sitting uncommitted from
last session — committed separately, ahead of Task 15's commit.
OPEN: routes not yet deployed to production (404 confirmed as
"not deployed" not "broken" — checked raw FastAPI response).
STANDING RECOMMENDATION: get an actual lawyer review of /track-record's
final copy before public launch — flagged in the task doc itself as
the most legally sensitive page in the product; automated compliance
sweep is necessary but not sufficient here.

Roadmap resumes at: **Task 16 — Tier 2 (personalized holdings brief,
portfolio analytics, anomaly detection).**

## Completion note — 3-bug session (2026-07-30)
Bug 1 (AI Brief blank) — FIXED, LIVE-VERIFIED. Root cause: DailyBrief TS
type declared brief_text, real API shape is {title, body}. Same bug
found+fixed in 2 more places (/market-brief archive pages). Card moved
above Market Pulse per founder decision.
Bug 2 (paid users seeing paywall) — FIXED, code-verified, REQUIRES
FOUNDER LIVE CHECK. Real root cause was NOT masking logic — it was
architectural: Signals detail/list pages are Server Components that
cannot read the browser's localStorage JWT, so SSR fetch was ALWAYS
anonymous for EVERY visitor regardless of tier. Fixed: SSR renders
anonymous-by-default (correct for SEO), small client component corrects
with real token when logged in. Anonymous path verified live; the
paid-correction path needs a real authenticated session to confirm
(sandbox couldn't fake this) — FOUNDER MUST VERIFY by logging in for
real and checking a locked symbol.
Bug 3 (fundamentals_fetcher crash) — FIXED IN CODE ONLY, NOT
OPERATIONALLY CLOSED. Confirmed root cause: pymongo decodes stored
datetimes naive by default vs aware cutoff. Fixed with tz_aware=True
scoped to this file only (not globally in config/db.py). Regression
test 9/9 (reproduces crash, then proves fix). COULD NOT run against
real prod data (no live Mongo path from sandbox) — fundamentals_raw
WAS STUCK AT 1 DOC since Task 09 (confirmed via 3 days of identical
failed-run logs, 2026-07-28/29/30). FOUNDER MUST run fetcher manually
on VM and confirm count grows past 1 before this is truly closed.
Comment fix (16:15→16:45) done as scoped. Flagged-not-touched: alert_worker
window may also not reach 16:45 — noted for a future session, not fixed.
NOTE: insider_trading_api.py has substantial uncommitted changes in the
working tree — confirmed as founder's own in-progress work, correctly
left untouched and excluded from this session's commit.
537 backend checks + full frontend build pass, zero regressions.

## ⚠️ ACTION REQUIRED before Task 16 (founder, not a coding session)
1. Deploy: git pull + restart redixfi + redixfi-api on VM.
2. Run fundamentals_fetcher.py manually, confirm fundamentals_raw count
   grows past 1 (was stuck since Task 09).
3. Log in with a real paid account, check a locked symbol's Signals
   detail page renders full (not paywalled) content.
Both are the last unverified pieces from this session — do not start
Task 16 until confirmed, since Task 16 (portfolio analytics) will lean
on fundamentals data being genuinely populated.

## Pattern watch: naive/aware datetime bug, 2nd occurrence
cancel_subscription (Task 11) and fundamentals_fetcher.py (this
session) both hit the identical naive-vs-aware datetime comparison
crash. Worth a dedicated sweep across the codebase for the same pattern
before a 3rd instance surfaces in production — not urgent, but flagged
for a future small cleanup task.

## ✅ ALL 3 BUGS + fundamentals backfill FULLY CLOSED (2026-07-31)
Founder completed all verification steps personally:
- Bug 2 (paid paywall): LIVE-CONFIRMED via real login. Account shows
  Tier=Paid, Plan=monthly_499, Status=Active. SMLMAH renders full
  content: score, tension callout, why-did-this-change, complete
  analyst checklist INCLUDING two new fundamentals-derived rows now
  flowing correctly end-to-end ("Growth trend: Revenue grew 13.2% YoY",
  "Valuation vs peers: P/E 37.92 vs sector avg 27.85"), full change log.
  No paywall message. Fully closed.
- Bug 3 (fundamentals_fetcher) + derived builder: fundamentals_raw
  1→751, fundamentals_derived 1→751 (100% coverage), symbols_master
  market_cap/industry backfilled for 740 symbols. parse_warnings on
  742/751 docs INVESTIGATED AND CONFIRMED HEALTHY — matches indianapi's
  own real data pattern (BAL/CAS only reported for Mar/Sep quarters,
  income-statement-only for Jun/Dec — verified against the actual
  RELIANCE payload seen earlier in this project). Not a bug, expected
  source-data behavior, defensive parsing working correctly.
- Bug 1 (AI brief): already live-verified in prior message.
This closes the entire fundamentals pipeline gap that had been open
since Task 09 — Task 16 (portfolio analytics) can now build on genuinely
populated data across ~750 stocks, not just RELIANCE.

Roadmap resumes at: **Task 16 — Tier 2 (personalized holdings brief,
portfolio analytics, anomaly detection).**

## Completion note — Task 16 (2026-08-01)
DONE. 588/588 offline checks (537+51 new), 0 regressions. Frontend
build/typecheck/compliance clean incl. new /account/portfolio route.
Part A: portfolio_brief_builder.py reuses summary_cards.watchlist_summary()
+ Task 10's component_changes — computes nothing new. Zero-live-LLM
proven same way as Task 12 (key removed + urlopen patched to raise).
Part B: portfolio_analytics.py, pure aggregation, hand-verified against
fixture. Part C: anomaly_detector.py, full-universe/disclosed-criteria/
symmetric by construction, CALIBRATED against real historical data —
CAPILLARY 11.83x volume ("up") and ROUTE 19.96x ("down") from the
2026-07-27 live observation both correctly caught by the same
mechanical rule.

## ⚠️ TOP PRIORITY OPEN ITEM — found this session, NOT fixed
`ra_mode.FORBIDDEN_FIELDS` strips ANY key literally named "direction"
from every API response, recursively. This is CORRECTLY stripping
Task 16's own anomaly "direction" field (renamed to anomaly_direction
to fix), but the SAME collision has ALSO been silently stripping
`measured_signals.component_changes[].direction` since TASK 10 — every
"Why did this change?" up/down/flat arrow has been invisible in the
live API since it shipped, a LIVE user-facing bug running for days
undetected. NOT fixed this session (bigger than Task 16's contract).
FIX NEXT SESSION: rename component_changes' direction field (e.g. to
change_direction) to avoid the FORBIDDEN_FIELDS collision, matching
the same fix pattern already applied to Task 16's anomaly field.

## Other findings this session
- filings_insider.trade_date is DD-Mon-YYYY format — a broken date-
  parse call was caught+fixed in Task 16's own insider-cluster
  detector; FLAG: measured_signals_builder.preload_insider likely has
  the IDENTICAL bug (same date format, unverified) — check next session.
- alert_worker's scheduler window never actually reached 16:45 (long-
  flagged) — FIXED this session while wiring Task 16's own evening jobs
  into the same window.
- Compliance-test regex false-positived on legitimate "call-heavy"/
  "put-heavy" PCR vocabulary — carve-out added with its own self-test.
- Real writes made to production Mongo during live verification — left
  as-is per established precedent (same call as prior sessions).

OPEN: VM deployment not yet done this session (commit+push+deploy is
the founder's next immediate step). component_changes direction bug
(above) is the clear top priority for the next session — it directly
affects a feature already marketed as live (the "Why did this change?"
breakdown, confirmed working in earlier live screenshots via a
different rendering path — worth checking whether the UI has a
fallback that's been masking this, or whether it's been silently blank).

Roadmap: Tier 2 (Task 16) complete. Remaining queue: parked UI reform
pass (repricing to ₹249/mo, founding-counter visibility, comparison-
tray polish, remaining minor P0s), the direction-field bug fix above,
WhatsApp/Telegram delivery (still blocked on opt-in checkbox, not yet
built), and eventual RA-registration-triggered post-RA build (doc 08).

## DECISION — Ask-RedixFi (Task 17) pricing: BUNDLED, not add-on (2026-08-XX)
FINAL: Ask-RedixFi chat is INCLUDED in the base ₹249/mo tier (and
Founding Annual) — NOT sold as a separate add-on. Free tier gets 1
question/symbol/day (same taste-not-full-access pattern as the existing
3 research-lookups/day rule); paid/founding get the existing 25/day
fair-use cap from Task 17's spec, no elevated tier for Founding.

REASONING (founder + AI reasoning, both converged):
1. 1/day free is a real conversion lever toward paid (taste, not access).
2. Some margin from bundling beats zero visibility from a hidden add-on
   — an add-on nobody tries can't convert anyone, regardless of price.
3. Cost is worst-case ~₹75-100/user/month (still profitable against
   ₹249) and SHRINKS as the base grows, since realistic average usage
   sits well below the fair-use ceiling — scale improves unit economics
   here, doesn't just dilute a fixed cost.
4. Strongest underweighted reason: this is genuinely the most
   SHAREABLE feature in the product (a grounded, correctly-hedged AI
   answer is a natural screenshot/social post) — directly serves the
   organic-only acquisition strategy (no paid ads, CAC ceiling ~₹2k).
5. Consistent with the ₹249 repositioning thesis: more value at lower
   price, confident-newcomer positioning, not per-feature revenue
   maximization.
6. Builds visible brand differentiation NOW so the founding-annual
   pitch ("lock in before RA") and eventual RA-day pricing both land on
   a base that already believes RedixFi is worth more than its price —
   consistent with the "pre-RA phase must build the real moat, not just
   fund registration" position from the original competitive-threat
   discussion (Screener/Trendlyne/free-AI-tools).

DOWNSIDE ASYMMETRY (the deciding argument): bundling underperforming
costs a small, capped, affordable margin. Add-on pricing underperforming
silently buries the product's best differentiator where most users never
see it — an uncapped strategic loss, not a financial one. Given the
product's whole growth model depends on organic/shareable moments,
the bundled path's downside is the only one that stays inside the
existing pricing-decision framework's risk tolerance.

Update Task 17's acceptance criteria: add explicit line — free tier
1 question/symbol/day, paid+founding 25/day shared cap, no separate
paid tier for this feature.

## Data depth reference (confirmed 2026-08-XX, for UI/marketing honesty)
- Price candles: ~1Y today, EASILY EXTENDABLE anytime via dhan_candles.py
  (configurable date range, not hardcoded — just widen fromDate, no new
  integration). Non-issue, config-only whenever desired.
- Fundamentals (5Y annual financials, shareholding history): rich TODAY
  via indianapi's own filed data — this is third-party historical depth,
  not something RedixFi accumulated. Lean on this in early marketing —
  it's the deepest, most credible historical asset available right now.
- RedixFi's OWN composite score / Signal Change Log / "Why did this
  change?": only since ~18 Jul 2026 (~2-3 weeks as of writing). This is
  the ONE genuinely time-bound gap — cannot be backfilled, only grows
  forward day by day as the system runs. UI IMPLICATION: do not show a
  "1Y" toggle on signal history the way price charts have one (would
  visually promise depth that doesn't exist) — Signal Change Log should
  just show what exists, however short, honestly.
- Track record (Task 15): effectively empty/sparse right now — the
  20-session forward-return study needs completed observation windows,
  which barely exist yet given the above. DO NOT prominently promote
  /track-record in primary nav until it has a few months of real
  completed data — premature promotion would show an embarrassingly
  empty proof-of-concept instead of the intended trust-builder.

## Vendor evaluation — Marketaux + IndianAPI (2026-08-XX)
Confirmed via real pricing pages (screenshots): IndianAPI free tier
(500 req/mo) sufficient today given current fundamentals_fetcher pace
(~30/day rolling). $399 vs $799 tiers are CAPACITY-ONLY, no feature
gap (Corporate Actions data already in the free/basic /stock payload,
confirmed via Task 09's own field map) — upgrade decision is pure
request-volume math whenever needed, $399 not $799 first.
Marketaux free tier (100 req/day, 3 articles/req) currently sufficient
because architecture fetches breaking news + LLM-classifies, NOT
per-symbol (confirmed — corrects an earlier assumption in this doc).
Standard tier ($49/mo) unlocks a REAL feature (Market Stats sentiment
API) not just more headroom — genuine future upgrade, see Task 18.
DEFERRED, POST-LAUNCH per founder decision: Task 18 (Marketaux upgrade
+ hybrid per-stock news, full NSE ~2,000 stock coverage without adding
LLM classification cost — only the per-symbol classification would have
been expensive, ~₹15-27k/mo worst case; skipping classification on the
per-stock tier keeps added cost to just the ₹4,100/mo subscription).
Do not build until founder confirms post-launch revenue supports it.

## ✅ UI MOCKUP PHASE COMPLETE (2026-08-XX)
9 interactive React mockups built and approved, covering the entire
sitemap: Home, Signals (list+detail), Research, Watchlist, Intraday,
Account (5 tabs: Profile/Watchlist/Portfolio/Alerts/Inbox), News, More
(+Data Sources +Disclaimer, content preserved verbatim from real site).
Design system locked: deep indigo-navy base (#0B0F1A dark /
#F7F8FB light) with dark/light toggle, IBM Plex Mono for all financial
figures, IBM Plex Sans for prose, warm gold (#D4A94E) reserved
EXCLUSIVELY for AI-generated content and brand — never touches gains/
losses (jade #3ECF8E / rose #F2685C, market convention preserved).
Key patterns established, apply consistently in real build:
- Persistent "RedixFi AI" button in top ribbon on EVERY page (not a
  floating bubble — that was tried and deliberately removed for
  redundancy once the persistent button existed)
- Comparison: add from anywhere (Signals rows, Signal/Research detail
  "Compare (N)" indicator with dropdown preview), always resolves on
  Signals page (Task 13's backend). Must be ONE shared sessionStorage-
  backed list across real routes, not per-page state.
- Locked-content pattern: blur + lock icon + "Unlock with Analytics
  Pro" CTA, reusable Panel component
- Tier toggle demonstrates free/paid states side by side for review
Files: redixfi_plan_package/mockups/*.jsx (9 files, reference only —
NOT production code, rebuild properly in Next.js/TypeScript preserving
the visual system + established patterns).

## FINAL EXECUTION SEQUENCE (founder decision, locked)
1. **Task 17 (Ask-RedixFi) FIRST** — build the backend (fact-packet
   assembly, grounded LLM call, causal-question rule, tense validator,
   /ask API) per the already-fully-specced task doc (architecture,
   cost model ~₹0.10-0.15/query, bundled-not-addon pricing, dual daily+
   monthly caps, topup persistence rules all locked).
2. **THEN the full UI reframe** — rebuild all 9 mockup screens as real
   Next.js pages in redixfi-web, preserving the design system + patterns
   above, wiring in the real Ask-RedixFi backend from step 1.
3. **News per-stock upgrade (Task 18) — EXPLICITLY DEFERRED past launch.**
   Add a visible but INACTIVE placeholder now during the UI reframe
   ("Coming soon" state or simply hidden/feature-flagged) rather than
   building the real hybrid fetch — Task 18's full spec (Marketaux
   Standard upgrade, LLM-free per-stock fetch, dedup, Market Stats
   sentiment field) stays parked until post-launch revenue, per its
   existing "DEFERRED, POST-LAUNCH" status. Do not build the real
   fetcher now — just make sure the UI has a graceful placeholder slot
   so it can be enabled later without a UI rebuild.
Other deferred items (unchanged, still parked): Firebase→MSG91
migration (founder doing separate R&D), ₹249 pricing rollout, founding-
counter visibility fix, remaining minor P0s (duplicate insider rows,
number formatting) — batch these in whenever convenient, not blocking
the 3-step sequence above.

## New tasks added: 19 (Auth redesign), 20 (Checkout redesign)
Task 19: Google Sign-In primary + email/password fallback, replacing
phone-OTP-as-default. Phone becomes optional post-signup field (WhatsApp
alerts / future KYC). Apple Sign-In deferred until iOS app exists.
KEY INSIGHT: this may make the Firebase→MSG91 migration UNNECESSARY —
the cost driver was phone SMS verification specifically, not Firebase
itself; Google/email login triggers no SMS billing.

Task 20: Pricing → Checkout page. Real subscription status display
(reusing Account/Profile's component). Monthly→annual upgrade is
SCHEDULED (payment captured now, plan activates at current cycle's
end) rather than prorated — deliberately avoids proration date-math
given this project's TWO prior naive/aware datetime bugs
(cancel_subscription, fundamentals_fetcher). Universal single promo-
code input (no separate public/private UI, same existing
promo_codes/validate infra from Task 04) + new create_promo_code.py
script for founder to generate codes (up to 100% discount) without
touching DB directly. Ask-RedixFi 50-question/₹99 topup added as a
proactively-purchasable checkout line item for paid/founding users
(was reactive-only per Task 17).

## UPDATED EXECUTION SEQUENCE
1. Task 17 (Ask-RedixFi backend) — unchanged, first.
2. Task 19 (Auth redesign) — should land BEFORE or ALONGSIDE the full
   UI reframe, since it changes the login screen fundamentally.
3. Full UI reframe (9 mockup screens → real Next.js) — now INCLUDES
   Task 20's checkout redesign as part of this pass, not a separate
   later effort. News per-stock (Task 18) stays placeholder/hidden.

## ⚠️ PRICING STRUCTURE UPDATE — final, supersedes all earlier numbers
FINAL locked pricing (replaces every earlier ₹499/₹4,999/₹2,499-only
mention in this doc — this is the authoritative structure going forward):
- **Free**: ₹0 — 1 AI question/day, limited research lookups
- **Analytics Pro (monthly)**: ₹249/month
- **Annual (standard)**: ₹2,499/year — same features as monthly, billed
  yearly, available to everyone once founding cap is reached
- **Founding Annual**: ₹1,799/year — LOCKED for as long as subscription
  stays active, capped at first 200 subscribers (matches existing
  founding-counter mechanic in Task 04/UI mockups — do not need to
  rebuild that counter, just the price attached to it changes)
- **AI topup**: ₹99 for 50 questions, never expires, survives
  cancellation (unchanged, Task 17)

## ⚠️ CRITICAL — founding tier is PRICE-LOCK ONLY, never a feature promise
FOUNDER DECISION, IMPORTANT: Founding Annual subscribers are promised
LOWER PRICE ONLY (₹1,799 vs standard ₹2,499), NEVER specific future
features, and explicitly NEVER "post-RA features included free."
REASONING (founder's own analysis, correct and important):
1. No prototype of post-RA features exists yet — promising specific
   scope to specific paying customers before the product exists creates
   a real commercial obligation to a shape of product that may not
   match what actually gets built once RA registration happens.
2. REAL REGULATORY RISK FOUND: RAASB deposit requirements scale by
   CLIENT COUNT, not revenue (₹1L up to 150 clients, ₹2L for 151-300,
   etc. — confirmed earlier in this project). If 200 founding members
   were promised automatic access to future RA-gated features, they
   would ALL instantly become RA "clients" the moment registration
   completes — regardless of whether any of them pay another rupee
   after their original founding purchase (which may have happened
   months or years earlier). This could push the deposit bracket up
   on day one of registration, funded by revenue that was already
   spent long before RA existed. This is a genuine, quantifiable
   financial exposure — NOT a hypothetical concern.
This decision is now FINAL and must be reflected everywhere: marketing
copy (one-pager, done), the actual Founding Annual product description
on the real Pricing/Checkout page (Task 20 — UPDATE Task 20's plan
references from the old ₹4,999→₹2,499 framing to this final ₹1,799
founding / ₹2,499 standard-annual structure), and any future RA-day
communication to existing founding subscribers (do NOT imply they get
new features automatically — if/when a decision is made to reward
early subscribers post-RA, it must be a SEPARATE, deliberate decision
made with real data at that time, not a promise locked in today).

## RA disclosure wording — final, locked
"Our current focus is building the most trusted analytics platform in
India. Any future regulated research services will only be introduced
after we receive the necessary regulatory approvals." — use this
phrasing (or minor variations preserving the same meaning) EVERYWHERE
RA status is mentioned publicly. Do NOT use forward-promise language
("once registered, we will also offer...") anywhere in marketing copy,
UI, or public communication — matches the same discipline already
enforced in-product (tense/forbidden-words validators) but this was a
real gap in marketing copy specifically, now closed.

## Completion note — Task 17, Ask-RedixFi backend (2026-08-04)
DONE. 56 new offline checks, 0 regressions against 11 pre-existing
offline suites re-run this session.
ARCHITECTURE: fact packet (measured_signals + fundamentals_derived +
signal_change_log + matched news_events + keyword-matched
education_content) assembled in build_fact_packet(), pure code, before
any LLM call — verified TWO ways: exact dict diffed byte-for-byte
against packet builder's own output, AND a separate test stubs
urllib.request.urlopen directly to confirm the real outbound HTTP body
contains exactly that packet's JSON, nothing else.
GUARDRAILS: causal-question rule reuses Task 12's causal.py verbatim +
a code-level regex backstop (CAUSAL_ATTRIBUTION_RE), forced-failure
tested (mocked LLM fabricating a cause rejected pass 1, clean
regeneration accepted pass 2, doubly-fabricated falls to template).
Refusal: two-layer guard reusing screener.REFUSAL_LINE +
raw_query_forward_intent directly — DEVIATION (smart, unprompted): a
layer-2 match now skips the LLM call entirely, no cost paid on an
already-forced refusal. sources_used computed in code from which
packet sections had data, never LLM-self-reported (guarantees "never
empty on real answer" by construction).
USAGE LIMITS: free 1/symbol/day → subscribe-CTA, never topup. Paid/
founding: daily(25)+monthly(~450), neither carries forward (verified
by seeding a stale prior-period counter at 999, confirmed zero
effect). Topup independent persistent top-level field, reactive-
purchase only, verified to survive a tier-flip/cancellation and remain
usable after. Free tier's topup purchase attempt correctly 403s.
SCOPE DECISION (flagged): did not apply /signals/{symbol}'s free-tier
symbol-locking to Ask-RedixFi — task doc names exactly two limiting
axes (daily+monthly), and topup's "usable regardless of subscription
status" language reads as usable on any symbol. Founder to confirm
this matches intent.
⚠️ PRE-EXISTING BUG FOUND (not caused, not fixed this session):
scripts/smoke_test.py crashes at a /news?symbol=TCS check — root
cause: news.py's free-tier 24h delay filters out a fixture doc that
research.py's undelayed embed shows. This is a REAL inconsistency
(free users see fresher news via Research page than via News page —
a loophole), not just a test artifact. Confirmed unrelated to this
session's changes.
⚠️ REPO STATE FOUND: only one prior commit ("Tasks 03-05 complete")
existed — everything through Task 16 was sitting uncommitted. Bundled
into one commit with Task 17 per founder's choice. THIS GAP IS NOW
CLOSED — confirm git log shows the full history before trusting "what
Task N did" purely from working-tree state in future sessions.

## Live bugs found via founder screenshot review (2026-08-04) — QUEUED, NOT YET FIXED
Two confirmed, precisely evidenced bugs, next session's scope:

**Bug A — News page + Intraday Events tab show STALE results; per-symbol
pages are current.** Confirmed via screenshots: GODFRYPHLP's Research
page shows a real 04-Aug 11:54am article; the News page and Intraday
Events tab both top out at 03-Aug 06:03pm — today's articles missing
from both aggregate views entirely. NOT a fetcher problem (article
demonstrably exists, was fetched, displays correctly per-symbol) — the
aggregate News/Events queries differ from the per-symbol embed query
somehow (date-range bug, timezone mismatch, wrong sort, or hitting a
stale view/collection — root cause not yet found, needs investigation).
Same root SHAPE as the pre-existing smoke_test.py bug above (aggregate
vs per-symbol news inconsistency) but this is a plain staleness bug,
not the free-tier-delay tier-logic issue — likely worth investigating
together in the same session since both touch news query consistency
across surfaces.

**Bug B — AI Smart Screener has no fallback for a bare stock symbol/
company name.** Confirmed: typing "GODFRYPHLP" into the AI Smart
Screener box returns "No filters recognized, No stocks matched (0)" —
but the SAME text in the separate plain "Search company or symbol"
filter box instantly finds it. Underlying data/matching both work
fine — the AI parser just doesn't recognize "this is just a name, show
me that stock" as a valid intent alongside its existing filter-
extraction and compare intents. Fix: add direct-symbol-search as a
third recognized intent, fuzzy-matched against symbols_master (reuse
the same lookup Task 13's compare feature already uses for unknown-
symbol suggestions).

NEXT SESSION should tackle: Bug A + Bug B above, PLUS the pre-existing
smoke_test.py free-tier-delay inconsistency (Research page should
respect the same 24h delay News page enforces for free users — founder
confirmed real paid-tier news freshness is currently ~1 day old anyway
since the fetcher only runs a few times daily, so "live" must never be
claimed in copy anywhere until Task 18's upgrade — this is already
reflected correctly in the one-pager's "Same-day news" phrasing, just
confirming no other UI copy overclaims).

## ✅ 2-bug fix session CLOSED, verified on production (2026-08-04)
Both root-caused with real evidence, neither matched the original
queued hypothesis:
Bug A — NOT a backend bug. news.py's query was correct all along.
Root cause: redixfi-web's news/page.tsx AND EventsTab.tsx both forgot
to attach the logged-in user's auth token when calling /news — every
visitor, including paid/founding accounts, was silently hit as
anonymous, triggering the free-tier 24h delay unconditionally.
research.py's embed has no such delay, which is why it alone looked
current. SAME BUG CLASS as the 2026-07-30 Signals-paywall fix
(frontend forgetting to pass the token) — recurring pattern, worth
watching for a third occurrence. Fixed: both call sites now resolve
and pass a real token. Backend contract test added (redixfi-web has
no test runner).
Bug B — confirmed as suspected. Fixed via
core/screener.py::_resolve_direct_symbol_search() — pure code
fallback, reuses Task 13's resolve_compare_symbols() unchanged, fires
only when LLM returns zero filters + query not refused + confident
match only (never fuzzy-guesses). Works even with no OPENAI_API_KEY.
SIDE FINDING (not fixed, correctly left alone): the Task-17-session
smoke_test.py crash didn't reproduce this run (308 clean vs crashing
at 292 before) — consistent with the fixture comparing against
real-time now_ist(), making it flaky around the 24h-delay boundary
rather than a deterministic bug. Out of scope, noted for whoever next
touches that fixture.
17 new regression checks, 0 regressions across 450 total. Frontend
build clean. PUSHED AND VERIFIED WORKING ON PRODUCTION by founder.

Roadmap resumes at: **Task 19 — Auth redesign (Google Sign-In primary
+ email fallback)**, per the locked execution sequence.

## ✅ Task 19 (Auth redesign) CLOSED, verified working live (2026-08-04)
Google Sign-In + Email/Password both live and confirmed working on
production. Two real deployment gaps found and fixed during rollout
(both worth remembering as a pattern for future Firebase/Vercel work):
1. NEXT_PUBLIC_FIREBASE_PROJECT_ID was scoped to "Preview" only in
   Vercel while the other 3 Firebase vars were "Production and
   Preview" — silent mismatch, caused "Firebase is not configured" on
   the live site despite correct-looking individual values. LESSON:
   when checking Vercel env vars, verify EVERY var's environment scope
   individually, not just that "it's set" — a single mis-scoped var
   among several correct ones is an easy miss.
2. Google and Email/Password sign-in providers both needed to be
   manually enabled in Firebase Console (Authentication → Sign-in
   method) — same "provider must be explicitly toggled on" pattern
   already hit once before with Email/Password itself. Phone was
   already enabled from the original setup.
Both fixed, confirmed working via live testing by founder.

Roadmap resumes at: **Full UI reframe** (rebuild all 9 mockup screens
as real Next.js pages, preserving the established design system +
patterns, now including Task 20's checkout redesign as part of this
same pass per the locked execution sequence). News per-stock (Task 18)
stays placeholder/hidden throughout.

## Completion note — Task 19 code detail (2026-08-04)
19 new regression checks, 0 regressions across 14 suites (677 total).
Frontend build clean, all 24 routes.
ARCHITECTURE: Google + email/password both produce a Firebase ID token
with an email claim — ONE endpoint (POST /auth/firebase-login,
unchanged) serves all three login kinds, branching on which claim
came back. Phone-flow accounts completely untouched.
⚠️ REAL BUG CAUGHT: phone's unique index needed to become SPARSE — a
plain unique index treats every doc missing the field as an implicit
null, so the 2nd+ Google/email signup (no phone) would have collided
on that shared null and failed to register. Fixed with sparse-unique
index on phone AND a matching one added on email. Also fixed two
pre-existing unsafe user["phone"] bracket accesses that would 500 on
any email-only account.
DEVIATION (deliberate, reasoned): phone-OTP NOT deleted from login —
collapsed behind "Log in with phone instead" link, existing-accounts-
only. Correct call: outright deletion would satisfy "no phone at
signup" while silently breaking "existing accounts still work" (no
path left to obtain a phone-based token at all).
Phone add-on: PATCH /me, deliberately NOT OTP-verified (grep-verified
no SMS round-trip), placed in Account/Profile per the literal
acceptance criterion. Empty string correctly $unsets rather than
storing "" (would collide against the new sparse index otherwise).
Founder action items from this note (enable Google provider, test live
signup) were ALREADY DONE in the founder's own live Firebase debugging
session — see prior entry. Both closed.

## ⚠️ SECURITY FLAG (2026-08-04) — action required, separate from any task
An IDE session surfaced a live-looking OpenAI key (sk-live-...) in
plaintext at C:\Redixfi\.env — OUTSIDE any git repo (api/.git is one
level down), so not at risk of being committed, but sitting exposed on
disk regardless. FOUNDER ACTION NEEDED: rotate this key in the OpenAI
dashboard and move it into api/.env's existing gitignored discipline
rather than the loose repo-root location. Not yet confirmed done.

## Completion note — UI reframe Session 1: Home + Signals (2026-08-04)
DONE. TypeScript clean, compliance sweep 0 errors, npm run build clean.
Backend unchanged, 677/677 offline checks still passing (expected).
Live-verified headless (both themes, mobile viewport, AI panel,
compare-toggle) — zero console errors.
Design system now applied SITE-WIDE (necessarily, since the AI button
+ color system are every-page requirements): indigo-navy/gold palette
replacing the old generic blue theme, IBM Plex Sans/Mono, real manual
dark/light toggle (was OS-only before).
Persistent "RedixFi AI" button wired to real POST /ask (Task 17),
login-gated. Since /ask is per-symbol with no general-chat mode, pages
with no obvious "current stock" (Home, Signals list) open a symbol-
search step first — worth knowing this UX pattern before later
sessions touch pages that DO have an obvious symbol.
Shared LockedInline/LockedRow components applied to Signals table's
real per-tier locked field (not fabricated).
⚠️ THIRD OCCURRENCE of the recurring token-bug pattern (Signals paywall
→ News/Events staleness → now Home's server-side news fetch shown
free-tier-delayed to paid subscribers). Fixed same way as before
(moved fetch client-side). GIVEN THIS IS NOW THE THIRD INSTANCE: next
session touching data-fetching should do a DELIBERATE AUDIT — grep
every server-component fetch across the whole app for correct auth-
token attachment, rather than continuing to find these one screenshot
at a time.
DEVIATIONS (documented, reasoned): did not fabricate lock overlays
where backend doesn't actually mask data (Home movers/continue-
research) — correct, avoids UI lying about what's real. Dropped
mockup's fake "3" notification badge (wasn't real data). Kept existing
localStorage-backed comparison queue rather than rebuilding for
sessionStorage (low-stakes either way).
⚠️ NOT VERIFIED (sandbox couldn't test) — FOUNDER MUST CHECK: real
authenticated free-vs-paid rendering — log in for real, confirm tier
badge, table unlocking, and Ask panel all behave correctly for both
tiers before considering Session 1 fully closed.

Roadmap: UI reframe continues — Session 2 next (Signal detail +
Research, per the planned pairing).

## ⚠️ SECURITY FLAG STILL OPEN (2026-08-04/05) — founder explicitly deferred
Re-checked at the start of this session per standing instruction: the
OpenAI key flagged 2026-08-04 was NOT rotated — C:\Redixfi\.env and
api/.env still hold the identical key. Worse than previously recorded:
C:\Redixfi\.env is currently TRACKED in the redixfi-backend git repo, in
the current HEAD commit, and that HEAD has already been PUSHED to
github.com/ajaychouhan9/redixfi-backend (unauthenticated GitHub API
returns 404 — consistent with private, but still exposed to anyone with
repo access, and permanently in git history either way). NEW finding: the
same tracked file also exposes 3 live INDIANAPI_KEYS (sk-live-...), not
just the OpenAI key. Founder was asked how to sequence this against the
UI work and explicitly said to ignore it and handle it personally — not
resolved by this session, on record as a founder decision, not an
oversight. Re-flag if a future session finds it STILL unrotated after a
reasonable interval.

## Completion note — UI reframe Session 2, all 4 phases (2026-08-05)
DONE. Phase-by-phase, one commit each, both repos (redixfi-web +
redixfi-backend/api). 711 backend offline checks (677 pre-existing + 34
new, smoke_test_task20.py) across 16 suites, 0 regressions from this
session's changes. Frontend: TypeScript clean, compliance sweep clean (0
errors) and production build clean after every phase.

**Phase 1 (Signal detail + Research detail):** Found most of the content
already matched the mockups from earlier sessions (Task 09/12/14/17 built
the substance; Session 1's site-wide design-token change auto-reskinned
it) — genuine new work was narrower than the task assumed: new shared
CompareIndicator ("Compare (N)" dropdown, replaces the simpler
AddToComparisonChip, reads/writes the SAME comparison-queue.ts the
Signals-page tray already used) on both pages; new current-symbol.ts +
CurrentSymbolSync so the persistent AI button opens directly into a
conversation on these two pages instead of the symbol-search step;
ResearchExportButton (mockup parity, paid-tier gated). CONFIRMED (not
re-fixed) that Task 04's flagged /signals/{symbol} B8 direct-detail
masking gap is already closed — live-verified via curl against both the
anonymous-locked and unlocked paths; this must have shipped in Task 11's
ops sprint without an explicit note.

**Phase 2 (Watchlist + Intraday):** New standalone /watchlist route — the
long-term-holder persona's main product surface, distinct from
/account/watchlist's lighter management list. Reuses
PortfolioBriefCard/PortfolioAnalyticsCard (Task 16 Parts A/B) AS-IS rather
than rebuilding a compact-grid variant — a deliberate DRY-over-pixel-
fidelity call, flagged here. Table joins GET /intraday/watchlist-states
(confirmed now live — a prior session's "not available" fallback was
stale) with per-symbol GET /signals/{symbol} for score/delta/industry (no
exact-symbol-list filter exists on GET /signals, and its pagination cap
can't guarantee covering a scattered watchlist). Added a secondary
"Watchlist" sidebar link. Intraday: independently re-verified in
phase1_unified.py::run() that the Active Universe is genuinely mechanical-
only (score/bucket computed but never gate insertion) — confirms the
existing frontend disclosure copy was already correct, not just trusted.

**Phase 3 (News + More; Account left unchanged):** Account's 5 tabs were
already complete and mockup-aligned — verified, not touched. News: header/
badge/subtitle polish + a visible-but-inactive "Filter by stock — Coming
soon" slot for Task 18 (still deferred, per the locked sequence). More:
added menu icons, kept the existing separate-route architecture over the
mockup's client-side view-swap (SEO/addressability). Data Sources
fact-check (explicit instruction: verify against real source scripts, not
the list as given): "Composite signal scores" cadence was stale at
"~07:50 IST" from before Task 10's move to 16:30 — fixed. Also found and
FLAGGED (not fixed — ops question, out of this session's scope):
nse_delivery_sync.py and macro_fi_di.py appear nowhere in
prediction_engine/scheduler.py or any other scheduler in the repo despite
the page claiming "Daily" for both; data_freshness_check.py does monitor
both collections (2-day tolerance) so they're plausibly kept current by
something outside this repo, but that could not be confirmed without
VM/Mongo access from this sandbox.

**Phase 4 (Task 20 Checkout):** Backend was more incomplete than the task
doc assumed — worth a founder read. Final pricing shipped (monthly_249/
annual_2499/founding_1799, PLANS keys renamed outright — grepped both
repos first, confirmed PLANS is only read at new-purchase time, existing
monthly_499/founding_4999 subscribers unaffected). Part B (scheduled, not
prorated, monthly->annual upgrade) built for real: new
`pending_plan_change` field, new daily job
data-pipeline/apply_pending_plan_changes.py (wired into scheduler.py,
07:10, always-on since billing isn't market-day-gated), explicit
cancellation-while-pending branch (full refund of the annual, current
monthly period left untouched) — zero proration math, same tz-aware-
coercion discipline as the fundamentals_fetcher fix, with a genuine
reproduce-the-bug-then-prove-the-fix regression test. Part C: found that
POST /billing/promo-code/validate existed but NOTHING actually discounted
a real order or incremented redeemed_count — the task doc's "just confirm
the validation flow" framing was wrong, caught by grepping the file before
trusting it (same discipline Task 15 used to catch the predictions_snapshot
mislabeling). Now wired for real: /billing/order accepts an optional
promo_code and discounts the Razorpay order; /billing/verify redeems it
(atomic guarded increment, same CAS pattern as the founding-slot counter)
only after payment confirms. 100%-off codes are explicitly rejected (501,
"contact support") rather than silently mischarged or crashing — a real
no-payment activation path was out of scope this session, flagged not
built. New scripts/create_promo_code.py (founder CLI). Part D: Ask-RedixFi
topup now proactively purchasable from Checkout, reusing Task 17's
existing /ask/topup/order+verify endpoints unchanged. GET /me now surfaces
pending_plan_change (previously invisible — lived only on the
subscriptions collection). New shared SubscriptionStatusCard (extracted
from Account/Profile, used by both Account and Checkout per the explicit
reuse instruction). COMPLIANCE FIX (live, real): the old /pricing page's
"founding members get it at no extra cost" line directly violated the
locked founding price-lock-only rule (real RAASB client-count exposure if
left as-is) — removed, replaced with the locked RA disclosure wording.
Route stayed at /pricing (relabeled "Checkout" in the sidebar/page title
only) rather than a URL rename — avoids a redirect/broken-link exercise
across dozens of existing internal links for a routing decision the task
doc didn't actually require.

**Cross-phase, standing token-bug audit:** grepped every server-component
fetch touched in each phase before writing new fetch code, per the
3-strikes standing rule. Zero new instances found or introduced — every
new client fetch this session had a real token from its first request
(WatchlistMainView, CheckoutView, TopupCard, SubscriptionStatusCard all
fully client-side, no anonymous-SSR-then-correct step needed); the two
server-side fetches touched (GET /charts, GET /billing/plans) are
correctly untiered/public and needed no token, confirmed against their
backend routes before concluding that.

**Test suite note (not a regression):** re-running the full offline suite
after Phase 4 showed 11 failures across smoke_test_task04.py,
smoke_test_task17.py and smoke_test_bugfixes_20260804.py that were NOT
present earlier in the same session. Root-caused, not guessed: these
three files were untouched by this session (task04's only diff was the
mechanical plan-id rename) — the real cause is smoke_test_task04.py's
`today_str()` helper computing "today" from UTC
(`datetime.utcnow()`), while the actual alert-trigger/cap logic under
test correctly uses IST-based "today" — the two disagree for the ~5.5
daily hours where the UTC date and IST date differ, which is exactly the
window this session's later test runs happened to fall in (confirmed via
the sandbox's raw system clock: UTC still Aug 4 while IST had already
rolled to Aug 5). smoke_test_task17.py/smoke_test_bugfixes_20260804.py
independently confirm the same class — both hardcode `TODAY = "2026-08-04"`
as a literal string. Would reproduce identically for ANY session running
these three specific files during that UTC/IST window, regardless of what
changed. Flagged for whoever next touches these fixtures, not fixed here
(out of this session's scope, same "flag don't silently patch" precedent
already established for the news/delay fixture flakiness noted after
Task 17). All other 13 suites, including the new smoke_test_task20.py,
passed clean on every re-run.

OPEN items carried forward:
- Security flag above (founder-deferred, not a gap in this session).
- nse_delivery_sync.py / macro_fi_di.py scheduler-visibility question
  (Phase 3 finding).
- 100%-off promo codes 501 rather than activating for free — needs a
  real no-payment activation path if the founder wants that path used.
- The 3 UTC/IST-sensitive test fixtures above (task04's helper +
  task17/bugfixes_20260804's hardcoded TODAY constants).
- VM deployment: none of this session's backend changes (Task 20's
  PLANS/scheduling/promo work, GET /me's pending_plan_change field) are
  live yet — commit+push+deploy+restart is the founder's next step,
  same as every prior session's backend work.
- Sandbox couldn't exercise a real Razorpay payment end-to-end (no live
  keys reachable here) — the scheduled-upgrade and promo-discount flows
  are verified by the new offline suite + code review, not a live
  purchase; recommend one real test-mode purchase of each (plain
  monthly, monthly->annual upgrade, a promo-coded purchase) after deploy,
  same "verify live, don't assume" lesson this project has learned
  before.

Roadmap: UI reframe (all 9 mockup screens + Task 20) is now COMPLETE.
Next: founder deploy + live verification per the open items above, then
resume the parked queue (₹249 pricing rollout is now DONE as part of this
session, not still parked; founding-counter visibility, remaining minor
P0s) or whatever the founder prioritizes next.

## Completion note — Ask panel bug investigation (2026-08-05)
LIVE BUG REPORT (screenshots, TATACAP): "What's driving today's score
change?" and "How does this compare to its sector peers?" both returned
the identical canned TEMPLATE_FALLBACK text ("I can't answer that
directly — see the fundamentals panel...") with data-source tags shown.

INVESTIGATED per explicit instruction, all 3 hypothesized causes tested
directly and ruled out with hard evidence, NOT assumed:
1. Two-layer refusal guard — tested both exact reported queries against
   the real FORWARD_INTENT_RE regex directly: neither matches. Also
   structurally impossible regardless: the guard's forced response is
   REFUSAL_LINE, a different string from the observed TEMPLATE_FALLBACK
   text — generate_answer()'s code makes these mutually exclusive.
2. Retrieval — confirmed genuinely running: sources_used only populates
   on the non-refused path, so the observed tags are proof retrieval
   succeeded, not evidence of a cosmetic/never-fetched display.
3. LLM being overly conservative — reproduced BOTH exact reported
   questions LIVE against the real OpenAI API (confirmed outbound access
   from this sandbox, unlike the VM-only Mongo path) with realistic
   TATACAP data AND a deliberately near-empty packet: every case answered
   correctly/appropriately, zero validation rejections. Widened to 5
   question categories x 3 symbols (15 total, incl. a real matched-news
   causal answer for RELIANCE) — 15/15 clean, zero fallbacks, zero
   refusals.

ROOT CAUSE: none of the 3 — generate_answer()'s code structure makes the
observed symptom (exact template text + refused=false + populated
sources) producible only 3 ways: missing API key, an LLM-call exception,
or double validation failure. (3) is now empirically ruled out, leaving
an infrastructure-level failure (bad/missing key, or a swallowed
exception) specific to the DEPLOYED environment — unreachable from this
sandbox (no live VM/Mongo path, standing constraint) but the code had
ZERO observability into which one it was. THAT is the actual root cause:
why this needed a live investigation instead of a 30-second log lookup.

FIXED (the missing observability + a real classification gap found along
the way — not a guard/retrieval/prompt patch, since those were proven
clean):
- core/ask.py::generate_answer() — an exception on the FIRST LLM call
  previously got ZERO retry (a validation failure already got one);
  unified into one shared two-attempt budget covering both (still
  capped at 2 real LLM calls, unchanged cost ceiling). A transient
  network/API hiccup no longer produces an immediate, unrecoverable,
  refusal-looking fallback.
- run_ask()/routers/ask.py — every template-fallback now carries a
  machine-readable `fallback_reason` ("no_api_key" | "llm_exception: ..."
  | "validation: ...") persisted to ask_log — diagnosable from the DB
  directly next time, no live re-investigation needed.
- CAUSAL_QUESTION_RE ("why|reason|cause") didn't match "what's DRIVING
  today's score change" — the exact phrasing of one of the two reported
  queries AND the panel's own "Try asking" suggestion. Widened to include
  driving/drove/behind (only ever makes the causal-attribution backstop
  MORE likely to apply, never less — safe to broaden). Doesn't explain
  the reported refusal (a permissive gap, not a stricter one) but is a
  real, independently-confirmed miss in this exact code path.

TESTING: new scripts/smoke_test_ask_bugfix.py (14 checks, mocked LLM,
deterministic) — classification fix, retry-budget correctness (exactly 2
calls whichever failure kind, never 3), fallback_reason across all 4
terminal states. Full offline suite: 719 checks, 0 regressions (7
pre-existing failures in smoke_test_task17.py/smoke_test_bugfixes_
20260804.py are the ALREADY-FLAGGED hardcoded-date staleness bug from
the prior session — confirmed via empty git diff on both files, this
session never touched them).

SCOPE HELD: only core/ask.py, routers/ask.py, and the new test file —
zero UI changes, zero other pages, per this session's explicit
instruction (verified: redixfi-web git status is empty).

⚠️ STILL OPEN, cannot be closed from this sandbox: the actual PROXIMATE
trigger (missing/invalid OPENAI_API_KEY on the live VM's api/.env, vs. a
network/egress exception hitting api.openai.com from the VM) is still
unconfirmed — this fix makes it DIAGNOSABLE (check `ask_log.
fallback_reason` for recent entries after redeploying) but does not
itself prove which one it was. FOUNDER NEXT STEP: after deploying this
fix, reproduce the same two TATACAP questions live and, if it still
falls back, check `db.ask_log.find({fallback_reason:{$ne:null}}).sort({_id:-1}).limit(5)`
on the VM — the reason field now tells you exactly which of the 3 it is.

## Completion note — Session 1: Home redesign + custom logo mark (2026-08-11)
FRONTEND ONLY (redixfi-web). No backend/API/DB/auth files touched — confirmed
via `git status` before commit (only redixfi-web paths staged). No real data
replaced with mock data; no existing functionality removed. Backend repo
(C:\Redixfi) untouched, not committed/pushed this session.

**Step 0 audit findings (confirmed by reading actual code, not assumed):**
- Home route: `src/app/(app)/page.tsx`. Actual render order: VisitorIntroStrip
  → AiDailyBriefCard → MarketPulseCard+TopSignalChangesCard (grid row) →
  AnomalyCard ("Unusual activity today") → EventRiskCard → IntradayNowCard →
  ContinueResearchCard → HomePricingSection. NOTE: there is no "Watchlist
  Alerts" section on Home today (only a marketing-copy bullet elsewhere) —
  left absent rather than newly built, since the task scoped only the AI
  Brief + Unusual Activity restructuring and said everything else stays as-is.
- Theme tokens confirmed in `src/app/globals.css`: `--accent`/`--accent-dim`/
  `--accent-foreground` (gold; dark `#d4a94e`/light `#b8873a`), `--background`/
  `--surface`/`--surface-raised`/`--border`, `--foreground`/`-muted`/`-faint`,
  `--up`/`--down`/`--neutral` (+`-bg`), `--amber`/`--amber-bg`. Extended zero
  new tokens — the logo and the two restructured cards reuse these exactly.
- Logo: no dedicated component existed. The only lightning-bolt mark was a
  `lucide-react` `Zap` icon inlined in `src/components/layout/Sidebar.tsx`
  (desktop sidebar header, the ONLY place it appeared — not in mobile
  BottomNav, login page, favicon, or any manifest, none of which existed).
- Nav: desktop `Sidebar` and mobile `BottomNav` are both defined in the one
  file `src/components/layout/Sidebar.tsx`, sharing one `NAV_ITEMS` array —
  not restructured this session (out of scope), only the logo swap inside it.

**Step 1 — Custom logo mark (new, original, not the Twitter/X trademark):**
- New file `src/components/brand/LogoMark.tsx` — an inline SVG React
  component, NOT a copy of any existing brand. Two tapered bars crossing
  into an X, each waisted toward the center (wide at the outer ends, narrow
  at the crossing) plus a small faceted diamond over the intersection —
  deliberately un-Twitter-like construction (tapered+gradient+facet vs.
  Twitter's uniform-width flat strokes).
  - `variant="gradient"` (default): fills with a `<linearGradient>` whose
    stops are `var(--accent)` → `var(--accent-dim)` — inherits the live
    theme automatically, zero light/dark duplication, confirmed by reading
    the rendered DOM: switching `[data-theme]` re-colors it with no JS.
  - `variant="solid"`: fills with `currentColor`, for use inside an
    already-gold-colored badge (e.g. the sidebar's existing gradient square)
    where the mark itself should just be foreground-colored.
  - `size` prop scales the `<svg>` directly (viewBox 0 0 24 24) — verified
    conceptually correct from 15px (sidebar badge) to 56px (login) to
    32px (favicon); no raster assets, so it holds up to 120px+ with zero
    quality loss by construction (vector, no bitmap).
- Replaced everywhere it appeared: `Sidebar.tsx`'s desktop header badge (now
  `<LogoMark size={15} variant="solid" .../>` inside the same gold-gradient
  square it always had) — the `Zap` import stays, since it's still used
  separately as the unrelated "Intraday" nav icon, not the brand mark, so it
  was NOT touched.
- Added (didn't exist before, but explicitly requested by name in the task's
  design spec: "120px (login page)" / "24px (favicon-equivalent)"):
  - `src/app/(app)/login/page.tsx` — 56px `LogoMark` + wordmark above the
    login card.
  - `src/app/icon.svg` — new Next.js App-Router favicon convention file.
    Static SVG documents can't read the app's CSS custom properties (no DOM
    cascade when fetched standalone by the browser), so this hardcodes the
    same dark-theme gold hex values (`#d4a94e`/`#b8873a`/`#0b0f1a`) with a
    comment flagging it must be updated by hand if the brand gold in
    globals.css ever changes. Confirmed picked up by `next build`'s route
    list (`○ /icon.svg`). Did NOT touch the pre-existing `favicon.ico` or
    add a manifest/OG-image pipeline — neither existed before and neither
    was named in the task's "everywhere it appears" scope (which audited to
    exactly one place, Sidebar.tsx).
- Wordmark "RedixFi" text styling itself was not touched anywhere, per
  instruction.

**Step 2 — Home page restructure (layout/UX only, zero color-token changes):**
- `AiDailyBriefCard.tsx`: added `splitSummary()` (regex sentence-split, pure
  display logic) — renders the first 2-3 sentences always, and if the brief
  is longer, the remainder is now inside a native `<details>`/`<summary>`
  disclosure labeled "Read full brief →" / "Show less ↑" (CSS `group-open:`
  toggle, no client component / no JS state needed — server component
  status preserved). No data is dropped: the full body is still 100% in the
  DOM once expanded, just not rendered until then. AI-GENERATED badge and
  the period subtitle ("Morning session"/"Close session") untouched.
- `AnomalyCard.tsx` ("Unusual activity today"): restructured from one flat
  `flex-wrap` row of 7 direction-keyed groups into the summary sentence
  (unchanged) + labeled category tiles, each showing a real distinct-stock
  count in its header, with the existing direction-split symbol lists nested
  inside (still symmetric by construction — every direction bucket present
  renders, matching compliance rule 4).
  - ⚠️ REAL API SHAPE FINDING (verified against `src/lib/api/types.ts`
    before writing any UI, per the task's explicit instruction not to
    assume field names): `AnomalyType` is exactly 3 values —
    `volume_extreme` | `pcr_shift` | `insider_cluster`. There is NO fourth
    "price action" category anywhere in the anomaly data model returned by
    `GET /anomalies`. The task brief's spec named 4 tiles including "Price
    Action (N stocks)" — that 4th tile is NOT backed by real data, so this
    session built exactly 3 tiles (Volume Breakout / Options Activity /
    Insider Activity) rather than fabricating a category that would always
    show 0. Per-category counts (`categoryStocks` map, deduped by symbol
    across all directions of that type) are computed client-side from the
    already-fetched `results` array — the API itself only exposes
    `direction_counts` (direction-only, not per-category) on `scan`, not a
    pre-aggregated per-category count, so nothing here required a backend
    change; it's a reshape of data already being fetched.
  - "View all unusual activity →" CTA: the actual existing CTA text/link
    (`Screen →` to `/signals`) was left completely unchanged — the task
    doc's literal wording assumed different CTA copy than what's actually
    in the code; kept the real one rather than renaming to match an
    assumption, since renaming wasn't itself requested.
- Everything else on Home (VisitorIntroStrip, MarketPulseCard,
  TopSignalChangesCard, EventRiskCard, IntradayNowCard, ContinueResearchCard,
  HomePricingSection) — confirmed untouched, zero diff.

**Mobile reflow (sandbox has no browser — described, not visually verified):**
- `AnomalyCard` category tiles: `flex flex-wrap gap-3` parent, each tile
  `min-w-[240px] flex-1` — at a ~375-390px mobile viewport (minus page
  padding) only one 240px+ tile fits per row, so tiles stack to a single
  column naturally via wrap, no media query needed. Inside each tile, the
  direction-group children (`min-w-[140px]`) may still fit 2-up depending on
  exact tile width — acceptable, doesn't overflow.
  Everything else on Home was already responsive pre-session and unchanged.
  **FOUNDER: please verify AnomalyCard's tile stacking and AiDailyBriefCard's
  `<details>` disclosure live on a real mobile viewport post-deploy** — this
  could not be visually confirmed from this sandbox.

**Build/compliance result:** `npx tsc --noEmit` clean (exit 0). `npm run
build` clean: compliance sweep 0 errors (13 pre-existing warnings, all
negated-word false positives on unrelated pre-existing lines, none touched
this session — one new one was hit and fixed: `LogoMark.tsx`'s own comment
used the word "tips" describing the SVG geometry, tripped the forbidden-word
scanner, reworded to "outer ends"), auth-fetch guard 0 violations, `next
build` compiled successfully, all 27 routes generated incl. new `/icon.svg`.

**OPEN / carry forward:**
- Per this doc's own standing rule ("whoever finishes a session pastes the
  completion note back... for the master file to be updated centrally"),
  this note is written into `redixfi-web/docs/00_MASTER_CONTEXT.md` only —
  this session did NOT touch the canonical copy at
  `C:\Redixfi\api\docs\00_MASTER_CONTEXT.md` (different repo, out of scope
  for a frontend-only session) — needs to be pasted into the canonical copy
  in a future session per the existing process.
- No manifest.json/site.webmanifest or OG-image pipeline was added — logo
  only appears in the 2 real places found (sidebar) + the 2 places the
  design spec explicitly named (login page, favicon). If PWA install icons
  or social-share OG images are wanted, that's new scope, not covered here.
- "Price Action" anomaly category has no backing field/type in the current
  API — would need a real backend addition (new anomaly detector +
  `AnomalyType` value) if the founder wants a literal 4th tile, not just a
  frontend change.
- Live authenticated (paid/free tier) rendering and mobile viewport reflow
  for both restructured cards were not visually verified — sandbox has no
  browser, per standing constraint noted in every prior session.

## Completion note — Session 2: Research formatting fixes + Home grid (2026-08-11)
FRONTEND ONLY (redixfi-web). No backend/API/DB/auth files touched (confirmed
via `git status` before commit). No real data replaced with mock data; no
existing functionality removed.

**FIX 1 — Insider trade dates: audited, found ALREADY COMPLIANT, no code
change made.** There is no separate mobile stacked-card view — insider
trades render as one `<table>` (`ResearchDetail.tsx:120`) that scrolls
horizontally on narrow screens, same code path at every breakpoint, so
"desktop vs mobile inconsistency" isn't structurally possible here. The
date itself uses the shared `formatShortDate()` (`src/lib/format.ts`),
which already has no `year` option — verified directly (`node -e`) that it
outputs exactly "06 Aug" / "30 Mar" for real date strings, matching the
required format 1:1. Did not touch it. Widened the search for a plausible
real source of the reported "inconsistent, sometimes full year" complaint:
`GenericRecordTable` (used for Bulk/Block Deals and Corporate Events,
sitting in the same "Smart money" card as Insider Trades) renders
`Record<string, unknown>` fields raw/unformatted — genuinely inconsistent
if either contains a date column — but its own docstring says the live
shape is unverified/never-seen-populated, so guessing a field name there
and reformatting it would be exactly the kind of unverified assumption
these sessions are supposed to avoid. Left untouched, flagged below.

**FIX 2 — Cr formatting: REAL bug, confirmed, fixed at the root.**
Reproduced the exact reported string: `RawRow`'s 3 cash-flow rows
(`FundamentalsPanels.tsx` — operating cash flow/capex/FCF) passed
`unit="₹Cr"`, concatenated as `${unit}${value}` — for a negative value like
-2921.06 this literally produces "₹Cr-2,921.06", the exact bug reported.
The OTHER Cr renderer in the same file (a private `fmtCr()`, used for
Revenue/PAT) was independently correct on placement but didn't apply the
≥1-vs-<1 magnitude-based decimal rule. Root cause: **two independent,
undeduplicated Cr-formatting code paths in one file**, not one shared
formatter with one bug. Fixed by centralizing: added `formatCr()` to
`src/lib/format.ts` (₹ first, en-IN comma grouping, 0 decimals for
|value|≥1, up to 2 decimals below that, "Cr" last), deleted the local
`fmtCr()`, switched all 3 of its call sites (`Stat` revenue, Annual-table
Revenue/PAT columns) to the shared function, and gave `RawRow` an optional
`format?: (v) => string` override (used only by the 3 cash-flow rows) so
they go through the same formatter instead of the broken unit-prefix
concatenation. Verified: `formatCr(2921.06)` → "₹2,921 Cr",
`formatCr(-2921.06)` → "₹-2,921 Cr" (was "₹Cr-2,921.06"), `formatCr(0.35)`
→ "₹0.35 Cr". "Shares outstanding (Cr)" row and "Book value/share"
(`unit="₹"`) were left untouched — neither is the reported bug (one isn't
a ₹ value at all, "Cr" is baked into its label; the other has no reported
issue) and touching them wasn't asked for.

**FIX 3 — Home page 3-column grid + compact Unusual Activity + sidebar
cards.**
- Widened Home's outer container from `max-w-3xl` to `max-w-6xl` (a
  single-column `max-w-3xl` stack cannot host a real 3-column layout) and
  rebuilt it as 3 explicit `grid-cols-1 md:grid-cols-2 lg:grid-cols-{3,5}`
  rows: Row 1 = AiDailyBriefCard (`lg:col-span-3`, ~60%) + MarketPulseCard
  (`lg:col-span-2`, ~40%); Row 2 = TopSignalChangesCard / AnomalyCard
  (compact) / EventRiskCard, 3-across; Row 3 = IntradayNowCard /
  ContinueResearchCard / WatchlistAlertsCard (new), 3-across. `md`
  (768-1023px) naturally collapses each row to 2-up via CSS grid
  auto-placement (no extra markup needed); `<768px` is 1 column. Previous
  session's row ordering (Pulse before TopSignalChanges) is preserved in
  spirit — only the container/grid changed, not which cards exist.
  ⚠️ DEVIATION FROM THE LITERAL BRIEF: Row 1 was described as "Brief |
  Pulse" 60/40 — confirmed via a fresh read of `page.tsx` that the ACTUAL
  pre-existing pairing (from the prior UI-reframe session, a founder
  decision recorded in this doc) already put Brief above the fold as a
  full-width card, with Pulse+TopSignalChanges as the existing 40/60 pair.
  This session's grid literally implements the brief's requested Row 1
  pairing (Brief+Pulse) since that's what was explicitly asked for; this
  changes which two cards share Row 1 versus what existed immediately
  before this session — flagged as an intentional, requested layout change,
  not an accidental side effect.
- `AnomalyCard` gained a `compact` prop (default `false`): compact mode
  renders the same 3 real category tiles with real counts but omits the
  nested per-direction stock lists, plus a "View all unusual activity →"
  link. Full mode (unchanged) still has the lists. Home now passes
  `compact`. New page `src/app/(app)/unusual-activity/page.tsx` (SSR,
  `getAnomalies({ size: 200 })`, same endpoint Home uses) renders the full
  (non-compact) card as the "dedicated page" the compact tiles link to —
  didn't exist before this session; a real, data-backed page, not a stub.
  Still exactly 3 tiles (Volume Breakout/Options Activity/Insider
  Activity) — re-confirmed this session, "Price Action" still has no
  backing `AnomalyType` value (see prior session's note, unchanged).
- New `src/components/app/WatchlistAlertsCard.tsx` for Row 3's third slot
  (didn't exist before — flagged as a gap in the prior session's audit).
  Reuses `getInboxPage()`/`InboxAlert` — the SAME real inbox
  `alert_worker.py` (B4's 5 triggers) already writes to and
  `/account/inbox` already renders — capped to 3 items, "View all" links
  to `/account/inbox`. Client component (needs the user's token via
  `useAuth()`, same reason `ContinueResearchCard` is client-side); renders
  nothing for anonymous visitors or an empty inbox, matching the existing
  "hide when there's nothing real" pattern other Home cards already use.
  No new backend endpoint, no fabricated alert content.
- Sidebar: confirmed neither a subscription-status card nor a data-status
  card existed anywhere (only a plain "Account · {tier}" text link and a
  separate "Checkout" link). Added both as a new footer block below the
  existing nav-links section: subscription card (only when logged in) —
  real `user.tier` via `useAuth()`, mapped through a small `TIER_LABEL`
  (free/basic/pro/paid/founding — these are the REAL tier-bucket values
  confirmed via grep against `AuthUser.tier`'s type union, not the
  Razorpay plan IDs PlanCard's separate `PLAN_LABEL` maps), with an
  "Upgrade Plan" link shown unless tier is already pro/founding. Data
  status card (always shown) reuses the EXACT SAME `initialOverview`/
  `initialFresh`/`initialSignalsAsOf` props `layout.tsx` already computes
  server-side for `MarketRibbon` — Sidebar now receives the same 3 props
  from `layout.tsx`, zero new fetching. Shows Live/Data delayed,
  Market open/Pre-open/Market closed (reusing `overview.market_state`),
  and the `signals_as_of` string verbatim (same convention MarketRibbon
  already uses — no "As of" re-prefix, since the backend string already
  reads like "Scores as of 21 Jul close"). DEVIATION: no client-side poll
  added to Sidebar (MarketRibbon already polls every 60s) — the sidebar
  cards reflect the freshness as of the last full page load/navigation,
  not a live re-poll; a deliberate reuse-not-duplicate call, not an
  oversight. Placement: below the existing Watchlist/Account/Checkout
  links, as the sidebar's bottom-most block (no visual reference screenshot
  was available in this sandbox to match an exact pixel position against).

**Build/compliance result:** `npx tsc --noEmit` clean (exit 0). `npm run
build` clean: compliance sweep 0 new errors (13 pre-existing warnings,
unrelated; 2 new false-positive hits this session on the words "tips"-style
negated matches in fresh comments — both reworded, not suppressed), 0
auth-fetch violations, `next build` exit 0, all 29 routes generated incl.
new `/unusual-activity`.

**OPEN / carry forward:**
- Per the standing rule, this note lives in `redixfi-web/docs/` only —
  not yet pasted into the canonical `C:\Redixfi\api\docs\00_MASTER_CONTEXT.md`
  copy (different repo, frontend-only session).
- `GenericRecordTable`'s raw/unformatted date rendering (Bulk/Block Deals,
  Corporate Events) is a plausible real source of date-format
  inconsistency on the Research page, but its underlying field shape has
  never been confirmed live (rows reportedly empty in every sampled
  symbol per its own docstring) — needs a live-data check before anyone
  touches its formatting; NOT fixed this session, flagged not guessed.
- No visual/browser verification of the new grid at the 3 requested
  breakpoints, or of the sidebar cards' real rendering — sandbox has no
  browser, same standing constraint as every prior session. **FOUNDER:
  please check the Home grid at ~1024px+/768-1023px/<768px and the two new
  sidebar cards live post-deploy.**
- "Price Action" anomaly tile still has no real data source (unchanged
  finding from the prior session) — needs a backend addition, not a
  frontend one, if the founder wants a literal 4th tile.

## Completion note — Session 2 continued: Fixes 5+6, dates that need a year (2026-08-11)
FRONTEND ONLY, same session as the note directly above (delivered as a
separate commit rather than amended into the already-pushed Fix 1-3 commit
— see OPEN item below). Two more date-format fixes, opposite direction from
Fix 1: those callers need the year AFTER ALL, since they're financial
transaction dates where "18 Jan" alone is ambiguous across years.

**Discovery:** `src/lib/format.ts` already had a year-inclusive formatter —
`formatDateIst()` — but it had ZERO direct callers anywhere in the app
(it existed only as `formatDateTimeIst()`'s internal date half). Verified
via `node -e` that it already outputs exactly "28 Mar 2026" / "18 Jan 2026"
/ "09 Jul 2026" — the exact target format. So no new function was written;
the "formatShortDateWithYear()" the task brief suggested already existed
under a different name, just unused for this purpose. Added a doc comment
to it clarifying this dual role (year-inclusive counterpart to
`formatShortDate()`) so the next session doesn't miss it and duplicate it.

**FIX 5 — Insider trades DATE column only:** `ResearchDetail.tsx:120`
switched from `formatShortDate` to `formatDateIst`. The table's OTHER two
`formatShortDate` calls in the same file (concall/investor-presentation
filing dates, lines ~208/224) were deliberately left untouched — not part
of this fix, not reported as broken.

**FIX 6 — "What's coming up?" section (`FundamentalsPanels.tsx`):** all 4
`formatShortDate` calls in this file (results date × 2 — the explainer's
`ctx` value and the visible "Last reported" text — dividend record dates,
bonus record dates) switched to `formatDateIst`; `formatShortDate` import
dropped entirely from this file since nothing else in it used it. Bonus
issue dates weren't explicitly named in the task brief but sit in the same
section rendering the identical `record_date` pattern as dividends right
above them — fixed for consistency (leaving them year-less next to
now-year-ful dividend dates in the same list would itself be a new
inconsistency), not scope creep into an unrelated area.

Everywhere else (Home page tiles, track-record pages, `WatchlistAlertsCard`,
`SubscriptionStatusCard`, `PlanCard`'s scheduled-annual date, concall
dates) still correctly uses the year-less `formatShortDate` — confirmed via
grep, none of these were touched.

**Build/compliance result:** `npx tsc --noEmit` clean (exit 0). `npm run
build` clean: compliance sweep 0 errors (13 pre-existing warnings,
unchanged), 0 auth-fetch violations, `next build` exit 0, all 29 routes.
Verified `formatDateIst` output directly (`node -e`) against 3 real dates
before committing.

**OPEN:** the task asked for Fixes 5+6 to land in "the same commit as
Fixes 1-4" from the prior message — Fixes 1-3 (there was no separate
"Fix 4") were ALREADY COMMITTED AND PUSHED to `origin/main` by the time
this request arrived, so folding these into that commit would require an
amend + force-push over already-shared history — not done without explicit
confirmation, per this session's standing git-safety rules. Delivered as a
new, separate commit immediately after instead.

## Completion note — Session 3: Home page final desktop polish (2026-08-11)
FRONTEND ONLY (redixfi-web). No backend/API/DB/auth files touched (confirmed
via `git status` before commit — only redixfi-web paths). No mock data
introduced; every element below reads real existing data/endpoints, no new
API endpoints added.

**Items already correct on audit, confirmed not fixed-because-broken:**
- Row 1 proportions (AI Daily Brief ~60% / Market Pulse ~40%, `grid-cols-5`
  with `lg:col-span-3`/`lg:col-span-2`): already exactly this shape from the
  prior session's grid rebuild (`page.tsx`) — re-verified, no change.
- AI Daily Brief "Show less" position: the task brief described a bug
  ("Show less" appears below the expanded content, needs scrolling) that
  doesn't match the actual code — `AiDailyBriefCard.tsx` already uses a
  native `<details>/<summary>` where the summary/toggle line is BY HTML
  SPEC always the first rendered child of `<details>`, with expanded
  content flowing below it. "Show less ↑" already sits immediately after
  the 2-3 sentence lead, before the expanded paragraph — confirmed by
  reading the DOM structure and HTML `<details>` semantics (deterministic,
  not something that needed live-browser verification). No code change.
- Intraday card state-awareness: `IntradayNowCard.tsx` already renders
  Live/Pre-market/"Closed — recap available" from the real
  `getIntradaySession()` session state (`STATE_LABEL` map), same source
  `/intraday` itself uses. No change needed.

**1. Header — added the 3 missing elements:**
- New `components/layout/HeaderSearch.tsx` — typeahead search
  ("Search stocks, sectors, news..." placeholder), navigates to
  `/research/{symbol}` on pick. DEVIATION FROM THE LITERAL BRIEF (flagged,
  reasoned): wired to `searchResearch()` (GET /research/search), NOT
  Signals page's own `q` state — that state is local to
  `SignalsExplorer.tsx`, filters an already-loaded table, isn't exported,
  and has no typeahead-to-navigate shape. `searchResearch` is the actual
  shared cross-page symbol/company lookup already doing this exact job
  (Research search page, AskRedixFi's symbol picker) — reused that
  instead of the literally-named-but-wrong source, same
  "verify before trusting the brief" discipline this doc has established
  repeatedly (Task 15's predictions_snapshot catch, Phase 3's Data Sources
  fact-check).
- Notification bell: added an unread-count badge, reusing the SAME
  `getInboxPage()`/`InboxAlert` data `WatchlistAlertsCard` already reads
  (B4's 5 triggers) — no new endpoint. No dedicated unread-count route
  exists on the backend, so the badge counts unread within the first page
  (size 20) rather than a true all-time total; flagged as an
  approximation, not exact.
- User avatar/profile menu: new `components/layout/UserMenu.tsx` —
  "AC"-style initials computed from the real `AuthUser.name`/`.email`
  (mutations.ts), dropdown with Account/Watchlist/Upgrade-or-Manage-plan/
  Log out, all real existing routes and the real `useAuth().logout()`.
  Replaced the old plain tier-chip in `MarketRibbon.tsx`.
- Market status strip and the persistent RedixFi AI button: untouched,
  confirmed via diff.

**2. Sidebar — nav reorder + tagline:**
- Desktop `Sidebar.tsx` now renders Home / Signals / Intraday / Research /
  Alerts / Watchlist / AI Assistant / More in the main nav, in that order.
  Watchlist moved up from its old separate section-below-nav Link block
  (deleted, not duplicated). Alerts links to the real
  `account/alerts/page.tsx` (threshold-alert creation/management,
  2026-08-11 addition) — not a new route.
- "AI Assistant" is NOT a page (none exists, and the locked design
  decision is ONE persistent AI entry point, not a page) — it's a second
  trigger into the SAME AskRedixFi panel already living in the header.
  New `lib/ask-panel/AskPanelContext.tsx` lifts that panel's open/close
  state out of `AskRedixFi.tsx` into a small shared context (provided in
  root `layout.tsx`, alongside `AuthProvider`) so both the header button
  and this sidebar item open the identical panel instance — not a second
  chat UI. FLAGGED DEVIATION: the master context's locked pattern says the
  AI button "lives ONLY in the top ribbon" (a prior floating-bubble was
  removed as redundant) — this adds a second click target, but into the
  same panel, not a duplicate floating UI; implemented because explicitly
  named in this session's instructions, called out here for founder
  awareness rather than silently overriding the earlier decision.
- Mobile `BottomNav` deliberately UNCHANGED — still the original 5-item
  list (Home/Signals/Intraday/Research/More). Fitting 8 items in a mobile
  bottom bar is its own redesign, out of this session's desktop-only scope
  (`NAV_ITEMS` kept separate from the new `SIDEBAR_LINK_ITEMS`, not shared
  anymore).
- Tagline "Read the market. Understand it." added under the RedixFi
  wordmark in the sidebar header block (logo mark + wordmark untouched).
- Subscription card + data status card at the sidebar bottom: confirmed
  untouched (diff shows no changes to that block).

**3. Content width:** `page.tsx`'s outer container changed from
`mx-auto max-w-6xl` (centered, capped at 1152px — left a large unused gap
on wide desktop viewports between the sidebar and the real content) to
`w-full max-w-[1800px]` (fills the available width up to the sidebar on
one side and the viewport edge on the other, with a generous cap kept only
for ultra-wide-monitor readability). The 3-column grid rows themselves are
unchanged, per the explicit "don't restructure the grid" instruction.

**7. Watchlist Alerts clickable items:** `WatchlistAlertsCard.tsx` items
were NOT clickable before this session — confirmed by reading the code,
not assumed. Added `Link` to `/signals/{symbol}` for the 3 trigger types
that carry a real symbol (signal_delta, news_watchlist, behavior_state —
confirmed against the real stored doc shape in
`C:\Redixfi\api\app\core\users_repo.py::push_inbox_alert`); daily_brief/
news_market alerts have no single relevant stock (`symbol: null` on the
real doc) and render as plain non-clickable rows, unchanged — not
fabricating a link target that doesn't correspond to real data. Added
`symbol?: string | null` to the `InboxAlert` type (was previously only
reachable via the untyped index signature) since this is a real,
now-confirmed field. `/account/inbox`'s own list has the identical
non-clickable gap — NOT fixed this session (out of the literal
"Watchlist Alerts card" scope), flagged here for a future session.

**Build/compliance result:** `npx tsc --noEmit` clean (exit 0). `npm run
build` clean: compliance sweep 0 new errors (14 warnings, all pre-existing
negated-word false positives except 2 new ones on this session's own
comments using the word "call" in a non-forbidden sense — same
false-positive class as 12 of the pre-existing 13, not suppressed, left as
the compliance script's own accepted noise), 0 auth-fetch violations,
`next build` exit 0, all 29 routes generated.

**OPEN / carry forward:**
- Per the standing rule, this note lives in `redixfi-web/docs/` only — not
  yet pasted into the canonical `C:\Redixfi\api\docs\00_MASTER_CONTEXT.md`
  copy.
- No live/browser verification of the new header search dropdown, unread
  badge, avatar menu, or sidebar reorder — sandbox has no browser, same
  standing constraint as every prior session. **FOUNDER: please click
  through the new header search, notification badge (with an account that
  has unread alerts), avatar dropdown, and the reordered sidebar
  (including the AI Assistant nav item opening the same panel) live
  post-deploy.**
- The "AI Assistant" sidebar entry point is a flagged deviation from the
  locked "single entry point" design note above — founder should confirm
  this is wanted, not just accepted by default.
- Notification badge count is an approximation (first 20 inbox items, not
  a true total) — would need a real backend unread-count endpoint for
  exactness; not built here (no new API endpoints, per standing rules).

## Completion note — Session 4: Fixed/sticky sidebar (2026-08-11)
FRONTEND ONLY, pure CSS/layout — no logic, no data, no component
restructuring, no backend files touched (confirmed via `git status` before
commit — only 2 files changed).

**Root cause confirmed by reading the actual code (not guessed):**
`Sidebar.tsx`'s `<aside>` (the ONLY sidebar component — no `AppSidebar.tsx`
exists) was a normal in-flow flex child of `app/(app)/layout.tsx`'s
`<div className="flex min-h-screen">` row, with `shrink-0` but no
positioning — flex's default `align-items: stretch` made it as tall as the
row, which grows with page content, so it scrolled away with the rest of
the page exactly as reported.

**Fix (2 files, minimal diff):**
- `Sidebar.tsx`: `<aside>` className changed from
  `hidden w-56 shrink-0 flex-col border-r border-border bg-surface md:flex`
  to `hidden w-56 flex-col overflow-y-auto border-r border-border bg-surface
  md:fixed md:left-0 md:top-0 md:flex md:h-screen` — `md:fixed`/`md:h-screen`
  pin it to the viewport at the same `md` breakpoint it's already shown at
  (mobile stays `hidden`, unaffected); `overflow-y-auto` lets the sidebar's
  OWN content scroll independently if it's ever taller than the viewport.
  `shrink-0` dropped (a flex-sizing hint, meaningless once `fixed` removes
  the element from flex flow). The existing `flex-1` on the inner `<nav>`
  already pushes the bottom Account/Checkout links + subscription/data-
  status cards to the bottom of the sidebar's own box — now that the box is
  a real `h-screen` instead of stretched-to-page-content, this already
  achieves the requested "bottom cards pinned to the bottom of the
  viewport" result with zero new `mt-auto`, so none was added (would have
  been redundant with the existing `flex-1`).
- `app/(app)/layout.tsx`: main-content wrapper (`MarketRibbon` + `main` +
  `FooterDisclaimer`) gets `md:ml-56` added — reserves the exact width
  (`w-56`) the sidebar no longer occupies in-flow now that it's `fixed`,
  so content starts at the sidebar's edge instead of hiding underneath it.
  `MarketRibbon` needed no change — it already lives inside this now-offset
  wrapper, confirmed by reading the JSX tree, not assumed.
- `BottomNav` (mobile) and `AppLayout`'s outer `flex min-h-screen` row:
  confirmed untouched — `BottomNav` was already independently `fixed
  ... md:hidden`, no interaction with this change.

**Build result:** `npx tsc --noEmit` clean (exit 0). `npm run build` clean:
compliance sweep 0 errors (same 14 pre-existing warnings, zero new — this
change touched no user-facing copy), 0 auth-fetch violations, `next build`
exit 0, all 29 routes generated, identical route list to the prior session
(confirms no routes broke).

**OPEN:**
- No live/browser verification — sandbox has no browser, standing
  constraint every session flags. **FOUNDER: please confirm live that
  scrolling the Home (or any) page's main content leaves the sidebar
  completely stationary with all nav items visible, and that a short
  viewport (sidebar content taller than the window) scrolls the sidebar
  independently rather than clipping it.**
- Per the standing rule, this note lives in `redixfi-web/docs/` only — not
  yet pasted into the canonical `C:\Redixfi\api\docs\00_MASTER_CONTEXT.md`
  copy.

## Completion note — Session 5: AI Daily Brief "Show less" to the bottom (2026-08-11)
FRONTEND ONLY, single file. `AiDailyBriefCard.tsx` was confirmed (not
guessed) to use a native `<details>/<summary>` — by HTML spec, `<summary>`
always renders as the FIRST child of `<details>`, so the toggle line sat
between the summary paragraph and the expanded content, matching exactly
what this session reported (a prior session's completion note had reasoned
this placement was already "correct" on the assumption bottom-placement
wasn't the actual ask — this session's literal requirement supersedes
that: expanded state must read summary → full content → toggle, with the
toggle last).

**Fix:** replaced `<details>/<summary>` with a `useState` toggle (the
task doc's own prescribed pattern for this exact situation, since a native
`<summary>` structurally cannot be moved to the bottom). File promoted to
`"use client"` (a new requirement — `useState` needs it; the only caller,
Home's `page.tsx`, is a server component rendering this as a child, which
composes fine, no other change needed there). Render order now: summary
paragraph → (`rest` block, only when `expanded`) → toggle button (always
last when `rest` exists), text switching between "Read full brief →" and
"Show less ↑" the same way the old `<summary>` spans did. Header block
(icon, "AI Daily Brief" label, session label, "AI-generated" badge) is
untouched — confirmed via diff, only the body section changed. No
gainers/decliners table exists in this component today (checked — nothing
to preserve there).

**Build result:** `npx tsc --noEmit` clean (exit 0). `npm run build`
clean: compliance sweep 0 errors (same 14 pre-existing warnings, 0 new),
0 auth-fetch violations, `next build` exit 0, all 29 routes generated,
unchanged route list.

**OPEN:** no live/browser verification (sandbox has no browser, standing
constraint). **FOUNDER: please confirm live that expanding the brief shows
summary → full text → "Show less ↑" at the very bottom, with no toggle
line in the middle, and that collapsing scrolls/reflows correctly (no
layout jump).**

## Completion note — Session 6: Signals page redesign (2026-08-11)
FRONTEND ONLY, 5 files, all under Signals: `signals/page.tsx`,
`education/SummaryCard.tsx`, `signals/SignalTableRow.tsx`,
`signals/SignalsExplorer.tsx`, `signals/SmartScreenerBox.tsx`. No
backend/API/auth files touched (confirmed via `git status`). No filter/
sort/search/CSV/watchlist/compare logic changed — verified by diffing:
every edit is either a className, a copy string, a new purely-additive
prop, or a `useState`-backed split of an already-fetched array.

**STEP 0 AUDIT (done before any edits, findings reported to the user
first):** confirmed table column order (Symbol/Sector/Price/Score/
Delivery/Volume/Signals/Event) matches the task's stated order exactly,
no reorder needed. Confirmed AI Smart Screener is real (`POST
/signals/smart-screen` via `smartScreen()`, backend's B9
`run_smart_screen`), not UI-only. Confirmed the compare tray is a single
shared `comparison-queue.ts` localStorage queue (MAX 5), genuinely
bidirectional across `SignalTableRow`'s "+Compare" button,
`CompareIndicator` (detail pages), and `SmartScreenerBox`'s embedded
chip tray — verified by reading all 3 call sites. Confirmed all 4
filters + sort + column picker + CSV export are wired to the real
`/signals` endpoint, no stubs.
⚠️ REAL BUG FOUND (not assumed — read `core/summary_cards.py`):
`SectorSummaryCard`'s own docstring claimed "strongest AND weakest
sector always shown," but the code only ever sliced the first N of a
strongest-to-weakest sorted list — the weakest sector was NEVER actually
rendered by default. This is exactly what Step 2 asked to build, so it
doubled as a genuine fix, not just new UI.

**Step 1 (header):** added a subtitle "Measured market signals across
{N} tracked stocks" — N is a REAL live count, `getSignals({ size: 1 })`
server-side reading `page_info.total` (same `/signals` endpoint the
table itself lists from), not hardcoded. `@auth-ok` marker added since
`getSignals` is `@auth required` — the anonymous SSR call is safe
because universe SIZE doesn't vary by tier (only which rows are masked
does, per B8), same precedent as `sitemap.ts`'s existing anonymous
`getAllSignals` call.

**Step 2 (sector standing):** `SectorSummaryCard` rewritten to
genuinely split `data.ranked` (confirmed sorted strongest→weakest by
`core/summary_cards.py::sector_summary`) into a STRONGEST (top ~4) |
WEAKEST (bottom ~3, reversed to read worst-first) two-column grid
(`grid-cols-1 sm:grid-cols-2`), caps shrinking to avoid overlap when the
sector count is small. Each row still shows name/count/color-coded
`DeltaValue` exactly as before. "View all sectors →" expands to the
full ranked list (unchanged full-list render path); "Show less ↑" to
collapse — literal copy strings per the task, matching
`AiDailyBriefCard`'s established toggle-string convention from the
prior session.

**Step 3 (AI Smart Screener):** heading + `AiLabel` badge unchanged
(already present). Description copy replaced verbatim with the task's
literal text. Added two clickable example pills — the task's literal
two example queries — that prefill + immediately run the query through
the EXACT existing `setQuery`/`runQuery` path (not a new submit path).
Card visually promoted: accent-tinted gradient background + a 1px
accent gradient top bar, same visual language `AiDailyBriefCard` already
established for "this is an AI feature" framing — reused, not invented.

**Step 4 (table):** confirmed "+Compare" already visible/working, chips
already using the shared `SignalStateChip`/`Chip` components (no change
needed — already consistent). Confirmed B8 masking is visually correct
(`LockedInline`/`UnlockBanner` blur+lock pattern) — read, not changed.
Mobile: found the table uses responsive column-hiding (Tailwind
`hidden .. sm/md/lg:table-cell`), NOT a tap-to-expand stacked card — no
such card pattern exists elsewhere in the repo to reuse, and building one
fresh would be new component work, not "polish." Treated the existing
tap-through-to-`/signals/{symbol}` (via the Symbol link) as the "rest on
tap" mechanism and tightened the one inconsistency found: the Event
column had NO responsive hide at all (every other optional column did),
so the smallest viewports showed Symbol+Price+Score+Event instead of
just Symbol+Price+Score. Added `hidden ... sm:table-cell` to match
Delivery/Volume's existing treatment — now the mobile view matches the
task's literal "Symbol + Price + Score visible" requirement.

**Step 5 (filter bar):** wrapped the filter row in a
`rounded-xl border border-border bg-surface-raised p-3` card (previously
a bare flex row with no outer card treatment) — matches the design
system's card convention used by `SectorSummaryCard`/`SmartScreenerBox`.
Individual controls switched from `bg-surface-raised` to `bg-hover` so
they read with depth against the new card background rather than
flattening into it (same layering `SmartScreenerBox`'s own input row
already uses) — column-picker's floating dropdown deliberately LEFT on
`bg-surface-raised` (a popup should read as elevated, not flattened).
`ExportButton` given an explicit `className` override (the component
already supports this prop) to match, rather than changing its shared
default (used elsewhere, e.g. Research page). CSV export logic, column
picker logic, sort logic: unchanged, confirmed via diff.

**Step 6 (compare tray):** the compare tray is deliberately MERGED into
`SmartScreenerBox`, not a separate UI — a prior session's explicit,
documented architecture decision ("one real component ... not two
disconnected UIs"). The task's Step 6 offered "a sticky bottom bar OR a
prominent indicator" — read as an either/or, chose "prominent
indicator" to honor the existing architecture rather than silently
re-splitting it into two UIs the prior session deliberately merged.
Added a real "Compare (N): SYM1, SYM2…" readout in the box's own header
(previously a static, non-dynamic help sentence) as that prominent
indicator; the existing chip row + "Compare now"/"Clear all" buttons are
unchanged. Re-confirmed (Step 0) the bidirectional shared state with the
Signal detail page's `CompareIndicator` — still true, same
`comparison-queue.ts` singleton.

**Build result:** `npx tsc --noEmit` clean (exit 0). `npm run build`
clean: compliance sweep 0 errors (same 14 pre-existing warnings, 0 new),
0 auth-fetch violations, `next build` exit 0, all 29 routes generated
(`/signals` still dynamic `ƒ`, unchanged).

**OPEN:**
- No live/browser verification — sandbox has no browser, standing
  constraint every session flags. **FOUNDER: please confirm live: the
  strongest/weakest two-column sector view with real data, the AI Smart
  Screener's example-pill prefill actually submitting, the table's
  mobile column collapse at a real narrow viewport, "+Compare" updating
  the tray, CSV export downloading a real file, and free-tier masking
  rendering correctly.**
- The Step 6 "sticky bottom bar" reading was NOT built (see above) —
  flagged for founder confirmation this interpretation (prominent
  indicator inside the existing merged component) is the intended one,
  not a silent scope-narrowing.

## Completion note — Session 7: Intraday + Research Pro redesign (2026-08-11)
FRONTEND ONLY, 4 files: `intraday/page.tsx`, `intraday/PostmarketRecap.tsx`,
`research/FundamentalsPanels.tsx`, `research/ResearchDetail.tsx`. No
backend/API/auth files touched. No fundamentals data, CSV export, or B8
masking logic changed. No other page touched (confirmed via `git status`).

**STEP 0 AUDIT (done before any edits, reported to the user first):**
- Intraday: session badge (LIVE/PRE-MARKET/CLOSED, green pulse for live,
  muted otherwise) + high-severity event count already real, wired to
  `getIntradaySession()`. **A5 Active Universe disclosure already existed,
  verbatim-correct** — `ScannerTab.tsx` already renders "Active Universe:
  N stocks meeting minimum liquidity and price criteria today (criteria)"
  from real `getIntradayScan()` fields. Scanned all Intraday components for
  predictive/curated language (A3) — found none, only the existing
  compliant "factual, not a prediction" disclaimer.
- Research: confirmed 2 of 3 action buttons work (Compare, Set Alert) but
  **"Add to Watchlist" was genuinely missing** — the nearby `RecordView`
  component is unrelated (recently-viewed tracking, not a watchlist
  toggle); the real `WatchlistButton` component already exists and is
  used on the Signal detail page. Confirmed `FundamentalsPanels.tsx`
  Collapsible defaults had drifted: "Is it growing?" was `defaultOpen`
  correctly, but "Is it expensive versus peers?" and "Who owns it?" were
  NOT `defaultOpen` despite the task's (and their own content's) intent —
  a real, confirmed bug, not assumed. "Smart Money & Activity" and
  "Corporate events" were plain always-open `Card`s, not `Collapsible` at
  all, despite the task listing them as expected-collapsed sections.
  Confirmed concalls section (Task 21) renders correctly with real data —
  no change needed. Confirmed news timeline hierarchy (severity badge,
  category, headline vs. muted source/date) already correct — no change.
  ⚠️ Confirmed Research's fetched data (`ResearchSignalSummary`:
  composite_score/delta_1d/narrative only) has NO Price Momentum/Volume/
  Trend/News/Ownership breakdown — that lives behind `/signals/{symbol}`
  (`SignalDetail.signals`, used by `AnalystChecklist.tsx` on the Signals
  page), a different endpoint Research doesn't call. Per the task's own
  explicit instruction, reported rather than guessed/fabricated.
  ⚠️ Found the task's own B6 premise didn't match reality NOR a prior
  session's own documented finding: insider trades has never had a
  mobile stacked-card view — a prior completion note explicitly concluded
  it's one horizontally-scrolling `<table>` at every breakpoint, by
  design. Re-verified directly in the current code — still true, not
  fixed (would be new component work contradicting that prior finding).

**Part A (Intraday):**
- A1: `<h1>` and page `<Metadata>` title changed "Intraday Live" →
  "Intraday Monitor". Session badge/event count: kept the existing
  richer 3-state LIVE/PRE-MARKET/CLOSED badge (green for live, muted
  otherwise — already matches the task's literal "OPEN(green)/
  CLOSED(muted)" color split) rather than collapsing to a literal 2-state
  label, which would lose real, meaningful pre-market-vs-live information
  — a deliberate, reasoned deviation, flagged here rather than silently
  applied.
- A2: `PostmarketRecap.tsx`'s advancers/decliners/unchanged line now
  prefixed "NIFTY 500:" — confirmed accurate, not fabricated, against
  `data-pipeline/intraday_recap_builder.py`'s own
  `build_market_line()` comment ("NIFTY 500 preferred anchor"). The
  underlying numbers are unchanged.
- A3: confirmed compliant, no predictive language found, no fix needed.
- A4: `MoverTable`/`SectorTable` in `PostmarketRecap.tsx` switched from
  hand-rolled `+`/color logic to the shared `DeltaValue` component (used
  everywhere else — Signals table, Home cards) — genuinely more
  consistent (adds the arrow glyph too), same underlying `pct` data.
- A5: confirmed already correct and accurate, no change.

**Part B (Research Pro):**
- B1: added a compact "Signal snapshot" block (Score/100 + `DeltaValue`
  delta + a link to the full Signal Dashboard page) right after the
  52-week range bar, near the top — sourced entirely from
  `data.signal_summary`, already fetched, no new request. The 5-row
  Positive/Negative/Neutral breakdown was NOT built (see Step 0 finding)
  — building it would require either a new backend request (forbidden
  this session) or inventing categorizations not backed by real
  measured_signals data, a real compliance risk this codebase has
  avoided elsewhere. The existing fuller "Signal summary" card
  (narrative + link) lower on the page is unchanged, not duplicated away.
- B2: added `<WatchlistButton symbol={data.symbol} />` to the action row
  (Export/Compare/Watchlist/Alert) — the real, existing component
  already used on the Signal detail page, not a new one. Compare and Set
  Alert confirmed already working, untouched.
- B3: fixed the 2 drifted `Collapsible` defaults in
  `FundamentalsPanels.tsx` ("Is it expensive versus peers?", "Who owns
  it?" now both `defaultOpen`). Converted "Smart Money & Activity"
  (renamed from "Smart money" per the task's literal wording) and
  "Corporate events" from plain `Card`s to the same `Collapsible`
  component `FundamentalsPanels.tsx` already uses — reuse, not a new
  component — both collapsed by default, matching the task's spec.
- B4: confirmed already correct, no change.
- B5: confirmed already correct, no change.
- B6: NOT fixed — see Step 0 finding above (task premise didn't match a
  prior session's own documented audit).

**Build result:** `npx tsc --noEmit` clean (exit 0). `npm run build`
clean: compliance sweep 0 errors (15 warnings — the pre-existing 14 plus
1 new false-positive hit on this session's own comment using "call" in
a non-forbidden sense, reworded to "backend request" rather than
suppressed, same as prior sessions' handling of this class of hit), 0
auth-fetch violations, `next build` exit 0, all 29 routes generated.

**OPEN:**
- No live/browser verification — sandbox has no browser, standing
  constraint. **FOUNDER: please confirm live: the Intraday header/badge/
  recap line with a real closed-session recap, the Signal Snapshot block
  rendering with real data on a real stock (task suggested TCS), the new
  Watchlist button actually toggling, and the 3 Collapsible sections'
  new default open/closed states.**
- B1's 5-row breakdown gap: if the founder wants the literal Price
  Momentum/Volume/Trend/News/Ownership panel, it needs either a new
  Research-page backend fetch (of `/signals/{symbol}` or an equivalent)
  or a product decision on which of Research's own fields may
  legitimately stand in for each row — flagged, not decided here.
- A1's OPEN/CLOSED vs. the existing LIVE/PRE-MARKET/CLOSED 3-state badge:
  flagged deviation, founder should confirm the richer version is
  preferred (recommended) over literally collapsing to 2 states.
- B6: insider trades mobile behavior — confirmed unchanged from a prior
  session's explicit, documented finding (one scrollable table, no
  stacked-card view, by design) — this task's brief assumed otherwise;
  flagged, not silently overridden.

## Completion note — Session 8: Concalls polish + app-wide rough-edge pass (2026-08-11)
FRONTEND ONLY, 3 files: `research/ResearchDetail.tsx`, new
`research/ConcallSummary.tsx`, `watchlist/WatchlistMainView.tsx`. No
backend/API files touched, no data fetching/attribution text/link
behavior/masking logic changed (confirmed via `git status` + diff review).

**Part A (Concalls section, all 5 items):**
- A1: new `ConcallSummary.tsx` — a `useState` toggle (native `<details>`
  ruled out per the task's own reasoning, same one that applied to
  AiDailyBriefCard's earlier fix: `<summary>` can't be moved to the
  bottom). Collapsed to `line-clamp-3` by default with "Show more →";
  expanded shows the full text with "Show less ↑" directly after it (same
  relative position = bottom of whatever's currently shown). Split into
  its own file because `ResearchDetail.tsx` is a Server Component (no
  `"use client"`) — `useState` can't live there directly, same reason
  `Collapsible` is already its own client leaf. Only renders a toggle at
  all when the summary is long enough (>220 chars) to actually be
  truncated — avoids a "Show more" that reveals nothing.
- A2: tone badge — real values confirmed via `ConcallTranscript.tone_label`
  (types.ts): exactly Positive/Neutral/Negative/Mixed, no "Cautious"
  value exists on the type (the task mentioned "Cautious" as an example;
  real data doesn't have it). Mapped Positive→up(green)/Negative→
  down(red)/Mixed+Neutral→amber via the existing `Chip` component (same
  one Event Risk Today's severity badges use) — moved after the filing-
  type chip, before the date; "Tone (this document):" prefix dropped.
- A3: "View source filing →" now reuses the EXACT className
  `ResearchExportButton` already uses in this same page's action row
  (`rounded-lg border border-border bg-hover ...`) — same href/target/rel,
  visual-only change.
- A4: attribution line moved one rung up the app's existing muted-text
  ladder (`text-foreground-faint` → `text-foreground-muted`) — text
  content byte-for-byte unchanged.
- A5: both `formatShortDate` (year-less) calls in this section switched to
  `formatDateIst` (year-inclusive) — confirmed real gap via `grep`, same
  fix already applied to insider trades / "What's coming up?" in a prior
  session. `formatShortDate` import removed from `ResearchDetail.tsx`
  (zero remaining callers in that file after the switch).

**Part B (read-through of Alerts/Watchlist/Account):**
- Alerts (`account/alerts/page.tsx` → `AlertRulesSection.tsx`): confirmed
  fully working, no fix needed — `AlertCreateButton` renders and creates
  real rules, the management list shows Pause/Resume + Delete per rule,
  and the "N of M used" cap messaging (header badge + a full "Upgrade to
  Pro" banner at cap) both render from real `getAlertRules()` data. The
  page's `<h1>Account</h1>` (not "Alerts") is confirmed the SAME
  deliberate pattern all 4 `/account/*` sub-pages share (verified via
  `grep` across all of them) — not a bug, `AccountTabs` is the actual
  per-tab differentiator.
- Watchlist (`WatchlistMainView.tsx`): ⚠️ REAL GAP FOUND AND FIXED — the
  table showed Symbol/Industry/Score/Behavior but was missing Price and
  Delivery entirely, despite both already being present on the SAME
  per-symbol signal-detail fetch this view already makes (`last_price`/
  `day_change_pct` — confirmed "never masked when locked" per that type's
  own comment — and `signals.delivery_pct`/`.delivery_avg20`, masked in
  lockstep with the rest of `signals` same as Score already is). Added
  both as 2 new columns, same `DeltaValue`/stacked-cell visual pattern
  the Signals table itself uses — no new fetch, no new endpoint.
- Account (`account/page.tsx` → `SubscriptionStatusCard.tsx`): plan tier,
  subscription status, and renewal date all confirmed real and rendering
  correctly (`profile.subscription.plan/.status/.renews`). ⚠️ REPORTED,
  NOT BUILT: "AI questions used today" usage stat does not exist ANYWHERE
  in the frontend today — confirmed via grep across every component;
  `AskLimitDetail` (the only usage-count shape that exists) is a 429-
  error-only value inside `AskRedixFi.tsx`'s own panel, never a standing
  GET-able field. `MeProfile` (from `GET /me`) has no such field either.
  Building a persistent stat would need either a new backend endpoint
  (this task explicitly forbids new endpoints) or piggybacking on a fetch
  that doesn't carry this data today — a genuine backend-scope decision,
  not a small frontend fix, so reported per the task's own explicit
  instruction rather than silently built or skipped without a note.

**Build result:** `npx tsc --noEmit` clean (exit 0). `npm run build`
clean: compliance sweep 0 errors (15 warnings, all pre-existing negated-
word false positives — 2 NEW hits this session on this session's own
comments, both reworded not suppressed: `ResearchDetail.tsx`'s "new API
call" → "new backend request", `WatchlistMainView.tsx`'s literal
`getSignalDetail()` text in a comment tripped the auth-fetch guard's
naive text match, reworded to prose), 0 auth-fetch violations, `next
build` exit 0, all 29 routes generated, unchanged route list.

**OPEN:**
- No live/browser verification — sandbox has no browser, standing
  constraint. **FOUNDER: please confirm live on ABB (has real concall
  data per the task): Show more/less toggle behavior, the Positive tone
  badge color, and "View source filing" as a button with a working link.
  Also confirm the Watchlist page's new Price/Delivery columns render
  correctly for a real watchlist.**
- Account page's "AI questions used today" gap — needs a founder/backend
  decision (see above), not decided or built here.
- Minor, NOT flagged as broken (so not touched): `SubscriptionStatusCard`
  still uses year-less `formatShortDate` for the renewal date — same
  class of gap as A5 above, but out of this session's explicit scope
  (Part A named only the concalls section); noting it here in case a
  future session wants to sweep the rest of the app for the same pattern.

## Completion note — Session 9: Concalls contrast fix (2026-08-11)
FRONTEND ONLY, CSS-only, 2 files: `research/ConcallSummary.tsx`,
`research/ResearchDetail.tsx`. No logic or data changes (confirmed via
diff — only className additions/changes and 2 explanatory comments).

**Component confirmed:** the summary line lives in `ConcallSummary.tsx`
(the client-leaf toggle component from the prior session's A1 fix), the
attribution line lives in `ResearchDetail.tsx`'s own concalls block —
there is no `ConcallCard.tsx` (the task's guess) anywhere in the repo,
confirmed via `find`.

**⚠️ Token names in the task didn't exist — mapped to this project's real
ones, confirmed via `grep` against `globals.css` before applying anything:**
`text-secondary`, `text-muted`, and `border-subtle` appear nowhere in
this codebase's CSS or components. The real 3-tier text ladder is
`text-foreground` > `text-foreground-muted` > `text-foreground-faint`
(mapped from `--foreground`/`--foreground-muted`/`--foreground-faint` in
`globals.css`), and there is a single `border-border` token, not a
separate "subtle" variant. Applied the task's literal INTENT onto these
real tokens:
1. Summary → `text-foreground-muted` (the real mid tier — "slightly more
   readable than fully muted" maps to this, not the top tier). It was
   previously unstyled entirely (silently inheriting the page body's
   full-strength `text-foreground`), not actually "very muted" as the
   task described — this is a genuine, confirmed styling gap, not a
   misreading.
2. Attribution → `text-foreground-faint` (the real faintest/"most muted"
   tier) + `border-t border-border pt-2` separator above it. NOTE: this
   deliberately REVERSES the prior session's own A4 change (which had
   moved this line from faint→muted for readability) — that direction
   is now wrong given the founder's live visual feedback that the two
   lines blend together; the faint tier is what actually distinguishes
   them from the summary's new muted tier. Flagging the reversal
   explicitly so it doesn't read as an accidental undo.
3. Added `mt-3` to each subsequent concall card's wrapper (alongside its
   existing `border-t pt-4`) — widens the gap between one card's
   attribution line and the next card's top border.

**Build result:** `npx tsc --noEmit` clean (exit 0) — one real syntax
error caught and fixed during this session (a JSX `{/* comment */}`
placed directly before the returned element inside `.map()`'s implicit-
return parens isn't valid JSX-child syntax there; switched to a plain
`//` comment). `npm run build` clean: compliance sweep 0 errors (same 15
pre-existing warnings, 0 new), 0 auth-fetch violations, `next build` exit
0, all 29 routes generated, unchanged route list.

**OPEN:** no live/browser verification — sandbox has no browser, standing
constraint. **FOUNDER: please confirm live on a stock with concall data
(e.g. ABB) that the summary and attribution lines now read as clearly
distinct tiers, and that the separator line + extra gap between cards
look right, not just technically correct per the token math above.**

## Completion note — Session 10: Concalls primary text + label + font-size audit (2026-08-11)
FRONTEND ONLY, CSS/text-only, 3 files: `research/ConcallSummary.tsx`,
`research/ResearchDetail.tsx`, `ui/Card.tsx`. No logic or data changes.

**1. Summary → primary text:** reverted `ConcallSummary.tsx`'s summary
paragraph from the prior session's `text-foreground-muted` to
`text-foreground` (this project's real primary/full-strength tier — no
literal "white" or `text-primary` utility exists, confirmed via grep;
`--foreground` is `#e8eaf2`, near-white in dark mode). This directly
supersedes last session's own contrast fix — flagged explicitly in the
component's docstring so it doesn't read as an accidental revert; the
contrast problem that fix was solving is now handled by the new label
(below) instead of by muting the summary itself.

**2. "Key takeaway:" label:** added as a `text-foreground-muted` inline
`<span>` (same `text-sm` size as the summary, per the task) immediately
before the summary text, inside the same `<p>` — reads exactly as
specified: "Key takeaway: Management highlighted...". Applied in both
branches (short-summary early return and the line-clamped/expandable
version) so it's present whether or not the Show more/less toggle is
active.

**3. Font-size audit — actual sizes found, reported as requested:**
- Summary paragraph (main body text): `text-sm` = 14px. Already AT the
  task's 14px minimum — no size change needed (color was the issue, see
  #1 above).
- Concalls row (filing-type badge / tone chip / date — "secondary text,
  dates, labels"): was `text-xs` = 12px, below the 13px minimum. FIXED to
  `text-[13px]` (Tailwind has no named 13px step) on the wrapping div —
  the filing-type badge and date spans inherit it. ⚠️ The tone `Chip`
  itself sets its OWN internal `text-xs` (12px) regardless of its
  parent's size — `Chip` is a shared component used for every badge
  sitewide (Signals table chips, Home cards, etc.); resizing it globally
  is out of this session's minimal-footprint scope, so it stays 12px,
  flagged here rather than silently left unmentioned.
- "View source filing" button: was `text-xs` = 12px, below 13px. FIXED to
  `text-[13px]`, same audit as the row above.
- Attribution/disclaimer line: `text-xs` = 12px. Already exactly at the
  task's stated floor ("minimum 12px, never smaller") — correct, no
  change.
- Section headings — "Concalls & investor presentations" / "Signal
  summary": both render via the shared `Card` component's title, which
  was `text-sm` = 14px, below the 15-16px minimum. FIXED via a new
  optional `titleClassName` prop on `Card` (backward-compatible, default
  unchanged — every other `Card` usage sitewide, e.g. Home/Signals/
  Watchlist, keeps its exact current 14px look) — applied `text-base`
  (16px) to ONLY these 2 named headings rather than changing `Card`'s
  shared default, which would have rippled across every Card on every
  page. ⚠️ Two OTHER headings on this same Research page were found at
  the same 14px ("News timeline" Card, and every `Collapsible` section
  question in `FundamentalsPanels.tsx`/`ResearchDetail.tsx` — "Is it
  growing?", "Smart Money & Activity", etc., `text-sm` in
  `Collapsible.tsx`) — NOT resized, since the task named only "Concalls…"
  and "Signal summary" specifically; reported here since the task asked
  to "check font sizes... throughout... the Research page generally."

**Build result:** `npx tsc --noEmit` clean (exit 0). `npm run build`
clean: compliance sweep 0 errors (same 15 pre-existing warnings, 0 net
new — 1 new hit on this session's own `Card.tsx` comment using "call" in
a non-forbidden sense, reworded not suppressed, same handling as every
prior session), 0 auth-fetch violations, `next build` exit 0, all 29
routes generated, unchanged route list.

**OPEN:**
- No live/browser verification — sandbox has no browser, standing
  constraint. **FOUNDER: please confirm live on a stock with concall
  data (e.g. ABB): the summary now reads in full-brightness primary
  text with a "Key takeaway:" label ahead of it, the concalls metadata
  row/button text is visibly a touch larger, and the two bumped section
  headings look right at 16px (not oversized relative to the rest of
  the page).**
- Two flagged-not-fixed items above (the tone `Chip`'s 12px, and the
  "News timeline"/`Collapsible` headings' 14px) are real, confirmed
  sub-minimum sizes per the task's own stated floors — left alone only
  because they're shared sitewide components / not explicitly named in
  this task. A future session should decide whether to extend `Chip`
  and `Collapsible` the same `titleClassName`-style opt-in size override
  `Card` just got, if the founder wants those bumped too.

## Completion note — Session 11: Global font-size audit (2026-08-11)
FRONTEND ONLY, CSS-only, 5 files, all table `<thead>` rows. No logic or
data changes.

**STEP 0 AUDIT (reported to the user before any edits):**
- Base font size: confirmed UNSET anywhere — no `font-size` rule on
  `html`/`body` in `globals.css`, no override in the `@theme inline`
  block (which only remaps colors/fonts, not the size scale). Relies on
  the browser default, 16px.
- Class usage counts (grep, all `.tsx`): `text-xs` 194, `text-sm` 277
  (already the dominant class), `text-base` 2, `text-lg` 11, `text-xl`
  19, `text-2xl` 2.
- ~55 hardcoded `text-[Npx]` values (9-15px) across ~30 files, mostly
  badges/timestamps/tiny labels; zero `text-[Nrem]` anywhere.
- Table cells: EVERY real data table (`SignalsExplorer`,
  `WatchlistMainView`, insider trades, `GenericRecordTable`, fundamentals
  peer/annual tables) sets `text-sm` on the `<table>` itself, so cell
  VALUES already render at exactly 14px — already matching the task's
  target. Table HEADER rows were the one confirmed, systemic gap: 5
  tables hardcoded at `text-[10px]` (SignalsExplorer, WatchlistMainView,
  and 3 inline result tables in AskRedixFi/SmartScreenerBox/
  PromoCodeAdminView), well below the 13px "secondary labels" floor. A
  second, less severe group (ScannerTab, PremarketTable,
  GenericRecordTable, insider trades, fundamentals peer/annual tables)
  sits at `text-xs` (12px) — close to but technically below 13px.

**DECISION — Option B, narrowly scoped, NOT Option A:** since `text-sm`
already renders at exactly 14px (the task's own body-text target) and is
already used 277 times as the dominant body/table class, setting
`html{font-size:14px}` (Option A) would DEMOTE every one of those 277
already-correctly-sized elements to 12.25px, requiring a systemic
text-sm→text-base rewrite across the entire app to compensate — the
opposite of "cleanest." Sampled all 65 `text-xs`-on-`<p>` instances
app-wide before deciding Option B's scope: confirmed every one is a
legitimate caption/label/disclaimer/timestamp/loading-state (matching
the task's own "do not change labels/captions" exclusion), not
misapplied body content — so no bulk `text-xs`→`text-sm` rewrite either.
Also checked (all unchanged, already correct, confirmed via grep):
Sidebar nav items (`text-sm`, exactly matches the 14px nav target),
large numbers (price/score: `text-lg`-`text-2xl`, 18-24px, within/above
target), page titles (`text-xl`, 20px, matches the 20-22px target).

**FIX APPLIED — the one confirmed, systemic gap:** all 5 `text-[10px]`
table header rows bumped to `text-[13px]` (Tailwind has no named 13px
step): `SignalsExplorer.tsx`, `WatchlistMainView.tsx`, `AskRedixFi.tsx`
(inline compare/screen result table), `SmartScreenerBox.tsx` (inline
screen result table), `PromoCodeAdminView.tsx`.

**NOT fixed, reported per the task's own instruction:**
- The 12px-header table group (ScannerTab, PremarketTable,
  GenericRecordTable, insider trades, fundamentals peer/annual tables) —
  only 1px below target, left alone to control scope/risk; a future pass
  could bump these too if the founder wants full literal compliance.
- `MarketRibbon`'s base `text-xs` (12px) — the NIFTY/BANKNIFTY/market-
  status single-line header the task itself flags as an overflow-risk
  area; deliberately NOT touched given its density (many elements already
  competing for one line) without a live-tested follow-up.
- `BottomNav`'s mobile nav labels (`text-[11px]`) — deliberately kept;
  bumping toward the 14px desktop-nav target risks exactly the "5 items
  overflow" failure Step 2 itself warns about, and 10-11px tab labels are
  a standard, appropriate mobile convention (matches iOS/Android tab
  bars), not an oversight.
- `Chip` component's internal `text-xs` (signal chips like "Trend up")
  and `Collapsible`'s question heading (`text-sm`) — both already flagged
  as shared-component gaps in the prior session's completion note, still
  open, still out of this session's scope for the same reason (sitewide
  blast radius).

**STEP 2 — breakage check:** this session's ONLY changes were the 5
table header rows above — Sidebar, MarketRibbon, `Chip`, and `BottomNav`
were never touched, so items 2 ("Sidebar nav — 8 items"), 3 ("Market
ribbon"), 4 ("Signal chips"), and 5 ("Mobile bottom nav — 5 items") carry
ZERO regression risk from this session by construction, not just by
inspection. Item 1 ("Signals table — 7 columns at 1280px", the only area
actually modified) reasoned through carefully since the sandbox has no
browser: all 5 changed headers are single uppercase words ("Symbol",
"Score", "Delivery", etc.) inside `<th>` cells with no fixed width;
`SignalsExplorer`'s table already has `min-w-[680px]` + `overflow-x-auto`
as a fallback, and at 1280px the available content width (viewport minus
the 224px fixed sidebar minus page padding) leaves roughly 1000px of
room — comfortably more than needed to absorb single-word headers
growing 10px→13px. Reasoned as low-risk, not visually confirmed.

**Build result:** `npx tsc --noEmit` clean (exit 0). `npm run build`
clean: compliance sweep 0 errors (same 15 pre-existing warnings, 0 new),
0 auth-fetch violations, `next build` exit 0, all 29 routes generated,
unchanged route list.

**OPEN:** no live/browser verification — sandbox has no browser, standing
constraint every session flags, but especially load-bearing this session
given the task's own emphasis on visual verification. **FOUNDER: please
confirm live at 1280px desktop width: the Signals table's 7 columns
still fit without wrapping/overflow with the larger header text, and
that the Watchlist table and the 3 inline AI-result tables (Ask panel,
Smart Screener) read clearly at the new header size without looking
oversized relative to their compact row heights.** Also confirms/denies
whether the founder wants a follow-up pass on the flagged-not-fixed
items above (12px table-header group, MarketRibbon, Chip, Collapsible).

## Completion note — Session 12: Full-width fixed header + Concalls callout box (2026-08-11)
FRONTEND ONLY, CSS/layout-only, 6 files: `app/(app)/layout.tsx`,
`layout/MarketRibbon.tsx`, `layout/Sidebar.tsx`, `layout/HeaderSearch.tsx`,
`app/ask/AskRedixFi.tsx`, `research/ConcallSummary.tsx`. No logic/data
changes.

**FIX 1 — header full-width + alignment:**
`MarketRibbon.tsx` restructured from an in-flow element inside
`layout.tsx`'s `md:ml-56` column (starting AFTER the sidebar, the
reported misalignment) to `fixed inset-x-0 top-0 h-16 w-full`, spanning
the entire viewport including the sidebar's x-range. Its own left
section is now exactly `w-56` (224px, matching the sidebar's width
precisely, `hidden md:flex`) and shows the RedixFi logo/wordmark/tagline
— content MOVED here verbatim from `Sidebar.tsx`'s old header block, not
duplicated: `Sidebar.tsx` no longer renders its own copy (would
otherwise sit in the exact same screen rectangle, one z-layer under this
one, wastefully rendering twice). `Sidebar.tsx`'s own `top-0`/`h-screen`
shifted to `top-16`/`h-[calc(100vh-4rem)]` so its nav items start
exactly where the header's left section ends — reads as one continuous
left column, per the task's own description, rather than two stacked
copies. `layout.tsx`'s main-content column gained `pt-16` (unconditional,
not `md:pt-16` — the header is fixed-height at every breakpoint, only
its LEFT section hides below `md`) to reserve the vertical space the now-
fixed ribbon no longer occupies in-flow — same `md:ml-56`-for-the-sidebar
pattern applied to the header's own dimension.

Font-size bumps applied exactly as specified: NIFTY/BANKNIFTY value
spans → `text-[15px]` (label/delta unchanged, task named only "values");
market status badge (`StateChip`) → `text-[13px]` (was inheriting the
ribbon's `text-xs`/12px); `HeaderSearch` input → `text-sm` (14px, was
`text-xs`); `AskRedixFi`'s floating trigger button → `text-sm` (14px,
was `text-xs`). "Scores as of…" (`signalsAsOf`) confirmed already
`text-xs` = 12px, exactly the task's stated floor — no change made.

**FIX 2 — Concalls "Key takeaway" callout box:**
`ConcallSummary.tsx`'s whole "Key takeaway: …" line (and its Show
more/less toggle, when the summary is long enough to have one) now
renders inside one `border-l-2 border-accent bg-accent/10 px-3 py-2`
callout div — this project's real gold-accent tokens at low opacity (no
separate "highlight" CSS variable exists; confirmed via grep, reused the
same `--accent` pair every other gold CTA/active-state already uses).
Label switched from `text-foreground-muted` to `text-accent` (now draws
the eye, matching the task's "not muted" instruction); takeaway text
stays `text-foreground` (primary tier, from the prior session's fix)
plus a new `font-medium`. Position unchanged — still renders in
`ResearchDetail.tsx`'s concalls block between the metadata row and the
tone_note/attribution lines, per the task's explicit "same position, just
visually elevated" instruction. Simplified the component's internal
branching (`long` computed once, single return path) while making this
change — same behavior, less duplicated JSX.

**Build result:** `npx tsc --noEmit` clean (exit 0). `npm run build`
clean: compliance sweep 0 errors (same 15 pre-existing warnings, 0 net
new — 1 new hit on this session's own `layout.tsx` comment using "call"
in a non-forbidden sense, reworded not suppressed, same handling as
every prior session), 0 auth-fetch violations, `next build` exit 0, all
29 routes generated, unchanged route list.

**Reasoned-through, not visually verified (no browser in this sandbox):**
- z-index: header is `z-40`; `HeaderSearch`/`UserMenu` dropdowns
  (`z-30`) are DESCENDANTS of the header, so they still layer correctly
  above the header's own siblings within its local stacking context —
  confirmed no conflict with `BottomNav` (`z-30`, mobile-only, bottom of
  screen, no y-overlap with the header) or `AskRedixFi`'s panel (`z-50`,
  correctly above everything).
- Signals page/table: this session touched NO Signals-specific files —
  the only shared risk surface is the header's own height change, which
  every page already absorbs identically via `layout.tsx`'s new `pt-16`.

**OPEN:** no live/browser verification — sandbox has no browser, standing
constraint, especially load-bearing for a layout-restructuring session
like this one. **FOUNDER: please confirm live: the header's left 224px
section visually lines up with the sidebar's left edge/nav items below
it (no gap, no double-logo flash), NIFTY/BANKNIFTY still fit on one line
at both the new 15px size and the existing responsive breakpoint
(BANKNIFTY hides below `sm`), the Signals page renders correctly below
the new fixed header with no content hidden underneath it, and the
Concalls "Key takeaway" box on a stock with real concall data (e.g. ABB)
shows the gold left border + subtle background clearly.**

## Correction — Session 12 follow-up: callout box moved from summary to tone_note (2026-08-11)
Live founder feedback on Session 12's Fix 2: the callout box had been
wrapped around the WRONG content. Founder's own example ("Management
highlighted strong order growth and profitability improvements." on
ABB) was the key clue — checked the actual generator,
`data-pipeline/concall_summarizer.py`, before touching anything (its
own LLM prompt spec, not guessed): `summary` (what `ConcallSummary.tsx`
renders as "Key takeaway: …") is a **120-180 WORD paragraph** — the
founder's short example sentence can't be that field. `tone_note` is
explicitly specced as **"one short neutral sentence explaining the
tone_label"** — an exact length match for the founder's example, and
it's the real field rendering directly below the Key takeaway/Show
more-less toggle and above the source/attribution line, i.e. the "box
should be for the content below show more/less and above the source"
the founder described.

**Fix:** `ConcallSummary.tsx`'s box removed — "Key takeaway:" label
keeps its gold `text-accent` color and the takeaway text keeps
`text-foreground font-medium`, but plain, unboxed (matching "highlighted
good" — keep — "but the box should not be around the key takeaway
content" — remove). The callout box (`border-l-2 border-accent
bg-accent/10 px-3 py-2`) moved to `ResearchDetail.tsx`'s `tone_note`
paragraph instead — same real gold-accent tokens, same visual treatment,
just relocated to the correct field. Text content of both fields
unchanged.

**Build result:** `npx tsc --noEmit` clean (exit 0). `npm run build`
clean: compliance sweep 0 errors (same 15 pre-existing warnings, 0 new),
0 auth-fetch violations, `next build` exit 0, all 29 routes generated.

**OPEN:** no live/browser verification — sandbox has no browser.
**FOUNDER: please re-confirm on ABB that the box now wraps the tone_note
sentence ("Management highlighted…") rather than the longer Key
takeaway summary, and that the Key takeaway line itself now reads plain
(gold label, bold primary text, no box) as intended.**

## 2026-08-17 — BUG 1: Daily Brief decimal percentage render corruption

**Proven root cause:** backend and production API data were correct. The
production `GET /api/v1/brief/latest` body contained `the Nikkei 225 fell
0.03%. The market closed...`; it did not contain a bare `03%.` fragment.
`src/components/app/AiDailyBriefCard.tsx` used the decimal-unsafe regex
`/[^.!?]+[.!?]+(\s+|$)/g`. That regex interpreted the decimal point in
`0.03%` as a sentence boundary, discarded the unmatched prefix, and made
the visible summary start at `03%. The market closed...`.

**Fix:** moved the summary parser to
`src/lib/dailyBriefSplit.ts`. It scans punctuation and treats `.` between
two digits as part of a decimal; sentence-ending punctuation is split only
at an actual boundary. `AiDailyBriefCard` otherwise retains its exact
summary/rest, expanded-state, and empty-body rendering behavior.

**Regression:** `scripts/test-daily-brief-split.mjs` passes **10/10**,
covering the real production `0.03%` shape, arbitrary decimal percentages
(`0.5%`, `12.5%`, `99.99%`, `3.14%`), plain decimal and currency values,
and ordinary sentence splitting. TypeScript is clean. The production
Next build completed successfully (the same two transient local `.next`
cache-lock warnings occurred while prerendering; all 29 routes generated).

**LIVE UI VERIFICATION PENDING:** deploy this frontend commit, refresh the
Home page, and confirm the rendered lead begins `The Nikkei 225 fell
0.03%. The market closed...`, never `03%.`.
