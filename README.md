# redixfi-web

Next.js 16 (App Router, Turbopack) web app for RedixFi — Task 07. Pre-RA
analytics only: measured signals, delivery/options data, AI-classified
news and daily briefs across 750 NSE/BSE stocks. No directional advice
until SEBI RA registration completes (`ra_mode` flag, server-enforced).

Full context: `docs/00_MASTER_CONTEXT.md`, `docs/07_TASK_UI_WEB.md`,
`docs/redixfi_prera_screen_spec.md`, `docs/openapi-reference.json` (live
API schema dump, pulled from `/api/v1/openapi.json`).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_API_URL etc.
npm run dev
```

Open http://localhost:3000.

## Structure

- `src/app/(app)/` — the product itself: sidebar + MarketRibbon shell
  wrapping Home, Signals, Intraday, Research, News, Pricing, Account,
  More. Screens 2–10 of the mobile spec, plus the web-only data-grid
  (column picker, multi-filter, CSV export) and richer chart.
- `src/app/(seo)/` — public, no-login, SSR/ISR pages: `/stocks/{symbol}`
  (750 pages), `/market-brief/{date}`, `/screens/{slug}` (5 canned
  screens, capped at 10 results). Lightweight header/footer, no sidebar
  — these exist to be crawled and to convert, not to be "the app".
- `src/app/sitemap.ts` / `robots.ts` — sitemap pulls the live symbol
  list from `/signals` (paginated) plus the static + screen + brief
  routes.
- `src/lib/api/` — typed client (`client.ts`), typed responses
  (`types.ts`), read endpoints (`endpoints.ts`, server- and
  client-usable), and auth-required mutations (`mutations.ts`,
  client-only). Types were built against the LIVE API's actual sampled
  responses, not just the screen spec — see inline comments where the
  two disagree (e.g. the real API root is `/api/v1`, not bare paths;
  `/signals/{symbol}` isn't B8-masked; `GET /intraday/watchlist-states`
  doesn't exist yet).
- `src/lib/auth/` — Firebase client auth (phone OTP) → exchanged for the
  API's own JWT via `POST /auth/firebase-login`. Requires
  `NEXT_PUBLIC_FIREBASE_*` to be set; there is no dev/test-user bypass —
  the API always requires a real Firebase ID token.
- `src/lib/compliance/` + `scripts/check-compliance.mjs` — the
  forbidden-words/tense CI sweep, wired into `npm run build`. Scans
  `src/app` and `src/components` for the master-context word list;
  negated matches ("not a prediction") are auto-cleared as compliant
  disclaimer language, standard financial compounds ("net buy", "PCR
  call-heavy") are excluded by pattern; anything else fails the build.
- `src/data/metric-explainers.ts` — the ~15 static explainer templates
  behind the tap-to-learn `ExplainTerm` component (education system,
  screen spec Part 3). `src/data/canned-screens.ts` — the 5 public
  screen definitions. `src/data/sectors.ts` — the `/signals.sector`
  field's actual (inconsistent) taxonomy, verified live against all 751
  rows.

## Known gaps (carried over from the live API, not fixed here)

- `GET /intraday/watchlist-states` (screen spec's per-watchlist
  behavior-state feed) doesn't exist in the deployed API — the
  Watchlist tab on `/intraday` says so plainly instead of faking data.
- `/brief/latest` is the only brief-read endpoint — no by-date archive
  endpoint exists yet, so `/market-brief/{date}` only resolves when the
  date matches the latest brief.
- Billing (`POST /billing/order`) 503s in this sandbox — Razorpay keys
  aren't provisioned server-side. The checkout flow is fully wired
  (order → Razorpay Checkout.js → verify) and will work once they are.
- `promo_codes` (mentioned in the master-context pricing decision
  record) has no backing endpoint — no promo-code UI was built against
  a route that doesn't exist.
- Web push isn't implemented — only the in-app inbox
  (`/account/inbox`), which is what the API actually serves.

## Compliance

`npm run build` runs the forbidden-words sweep first and fails the
build on violations. Design rules (symmetric up/down color, no
verdict-shaped visuals, default sort never by score, "AI-generated"
label on every AI output) are encoded in `globals.css` tokens and the
shared `DeltaValue`/`AiLabel`/`Chip` components — build new screens on
top of those rather than ad hoc styling so the rules stay structural,
not remembered.
