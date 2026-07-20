# TASK 07 — UI: WEB (pre-RA)

## Objective
Web app (Next.js recommended — SSR matters here) with the same feature
set as mobile PLUS the two web-specific jobs: SEO acquisition and
primary payment checkout. Spec: `redixfi_prera_screen_spec.md` v2.

## Structure
- Left sidebar: Home · Signals · Intraday · Research · More;
  top MarketRibbon persistent.
- Shared API client/types with mobile where practical.

## Web-specific requirements (beyond mobile parity)
1. **SEO pages (the acquisition engine):**
   - Public (no-login) company snapshot pages `/stocks/{symbol}` —
     limited Research-Pro data (price, 52wk, delivery sparkline, last 3
     news) + login-gated rest. 750 indexed pages.
   - Public daily brief archive `/market-brief/{date}` (B12 content) —
     shareable, indexed.
   - Public screener landing pages for 5–6 canned measurable screens
     ("high delivery stocks today") — user-runnable without login,
     results capped at 10 with signup prompt.
   - Proper meta/OG tags, sitemap, robots.
2. **Checkout home:** Razorpay primary checkout lives on web (mobile
   deep-links here) — pricing page with founding counter.
3. **Signals table (desktop):** full data-grid experience — column
   picker, multi-filter, CSV export (paid only).
4. Charts richer than mobile (candles + volume + delivery overlay).

## Acceptance criteria
- [ ] Feature parity with mobile screens 2–10
- [ ] Public pages render server-side, pass Lighthouse SEO ≥ 90
- [ ] Canned screens work logged-out with caps
- [ ] Checkout end-to-end on web; mobile deep-link lands correctly
- [ ] Same automated forbidden-words CI sweep as mobile
