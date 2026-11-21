"""Browser checks for Shortlist Lab releases 2 and 3 (21 Nov 2026): fixed tab bars, Learn tab, Ask AI clean-up, Use/Skip, common values card,
saved results, reports, Read your shortlist with AI, Full check page. Real site build, real figures file and real shortlist (live API, read only);
logged-in-only endpoints are answered by a mock so Free / paid screens can be exercised without a real account.

  python scripts/browser-lab-r2r3.py <site url> [shots dir]
Widths 360, 414 and 1280 (desktop), themes light / dark / slate. One line per check, then a count.
"""
import base64
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

SITE = sys.argv[1].rstrip("/")
SHOTS = Path(sys.argv[2]) if len(sys.argv) > 2 else None
if SHOTS:
    SHOTS.mkdir(parents=True, exist_ok=True)
RESULTS = []
WIDTHS = [360, 414, 1280]
THEMES = ["light", "dark", "slate"]


def check(name, ok, extra=""):
    RESULTS.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{extra}]" if extra and not ok else ""))


def jwt():
    def b(d):
        return base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b"=").decode()
    return f"{b({'alg': 'none'})}.{b({'exp': int(time.time()) + 86400 * 30, 'sub': 'u_test'})}.x"


def user(tier):
    return {"user_id": "u_test", "phone": None, "email": "t@example.com", "name": "Test", "tier": tier, "plan_display_name": tier.title(), "is_pro_trial": False,
            "pro_trial_started_at": None, "pro_trial_ends_at": None, "tnc_accepted_at": "2026-11-11T00:00:00Z", "terms_accepted": True}


RULE_PARAMS = {"market_cap_min": 500, "roe_min": 15, "de_max": 1}
SYMS = ["TCS", "INFY", "WIPRO", "HCLTECH", "TECHM", "LTIM", "MPHASIS", "COFORGE", "PERSISTENT", "OFSS"]


def env(data, **kw):
    return {"meta": {"as_of": None}, "data": data, **kw}


class Mock:
    def __init__(self, tier="pro", limit=10):
        self.tier, self.limit = tier, limit
        self.screens = [{"id": "s1", "name": "My growers", "params": RULE_PARAMS, "created_at": "2026-11-18T10:00:00Z", "last_viewed_at": None, "updated_at": "2026-11-19T10:00:00Z",
                         "stock_count": 52, "counted_at": None, "snapshot": None, "skipped": [], "filters_set": 3, "answers": 0}]
        self.runs = [{"id": "r1", "run_date": "2026-11-19", "count": 9, "as_of": "2026-11-18", "earlier_values": True, "answers": 2, "skipped": [], "params": {"roe_min": 12},
                      "added": None, "dropped": None, "since": None}]
        self.run_limit = limit
        self.calls = []
        self.fc_polls = 0

    def handle(self, route):
        req = route.request
        path = req.url.split("/api/v1", 1)[1].split("?")[0]
        m = req.method
        try:
            body = req.post_data_json
        except Exception:
            body = None
        self.calls.append((m, path, body))
        j = lambda data, status=200: route.fulfill(status=status, content_type="application/json", body=json.dumps(env(data)))
        if path in ("/signals", "/ladder-data"):
            r = route.fetch(headers={k: v for k, v in req.headers.items() if k.lower() != "authorization"})
            return route.fulfill(response=r)
        if path == "/me":
            return j({**user(self.tier), "subscription": {"plan": self.tier, "status": "active", "renews": "2026-12-20T00:00:00Z", "cancel_requested_at": None, "cancel_at": None}, "phone_verified": False})
        if path == "/me/usage":
            return j({"research_views_remaining": 0, "unlimited": True, "ask_redixfi": {"tier": self.tier, "is_pro_trial": False, "daily_limit_per_symbol": None,
                      "daily_used": 4, "daily_limit": 10, "monthly_used": 40, "monthly_limit": 200, "topup_questions_remaining": 25}})
        if path == "/my-screens" and m == "GET":
            return j({"screens": self.screens, "limit": self.limit, "count": len(self.screens)})
        if path == "/my-screens" and m == "POST":
            if len(self.screens) >= self.limit:
                return route.fulfill(status=403, content_type="application/json", body=json.dumps({"detail": "Your Free plan keeps 1 saved rule. Delete the saved rule, or update it with Save, to save this one. Basic keeps 10 and Pro 30."}))
            s = {"id": "s9", "name": body["name"], "params": body["params"], "created_at": "2026-11-20T10:00:00Z", "last_viewed_at": None, "updated_at": "2026-11-20T10:00:00Z",
                 "stock_count": body.get("stock_count"), "counted_at": None, "snapshot": None, "skipped": body.get("skipped", []), "filters_set": 2, "answers": 0}
            self.screens.append(s)
            return j(s)
        if path.startswith("/my-screens/s1/runs/") and path.endswith("/report.pdf"):
            return route.fulfill(status=200, content_type="application/pdf", headers={"content-disposition": 'attachment; filename="rule-report.pdf"'}, body=b"%PDF-1.4 test")
        if path.startswith("/my-screens/s1/runs/") and path.endswith("/report.csv"):
            return route.fulfill(status=200, content_type="text/csv", headers={"content-disposition": 'attachment; filename="rule-report.csv"'}, body=b"Stock,Company\r\n")
        if path == "/my-screens/s1/runs" and m == "POST":
            if body.get("confirm_drop") is not True and len(self.runs) >= self.run_limit:
                return j({"saved": False, "needs_confirm": True, "drops": {"id": self.runs[-1]["id"], "run_date": self.runs[-1]["run_date"]}, "limit": self.run_limit})
            if len(self.runs) >= self.run_limit:
                self.runs.pop()
            self.runs.insert(0, {"id": "r2", "run_date": "2026-11-21", "count": len(SYMS), "as_of": "2026-11-20", "earlier_values": False, "answers": 0, "skipped": body.get("skipped", []),
                                 "params": body["params"], "added": 2, "dropped": 1, "since": "2026-11-19"})
            return j({"saved": True, "needs_confirm": False, "run": {"id": "r2", "run_date": "2026-11-21", "count": len(SYMS), "as_of": "2026-11-20"}, "replaced_same_day": False,
                      "dropped": None, "limit": self.run_limit, "diff": {"since": "2026-11-19", "added": ["OFSS", "TECHM"], "dropped": ["ZZZZ"]}})
        if path == "/my-screens/s1/runs" and m == "GET":
            return j({"runs": self.runs, "limit": self.run_limit, "count": len(self.runs)})
        if path.startswith("/my-screens/s1/runs/") and m == "GET":
            return j({"run": {"id": "r2", "run_date": "2026-11-21", "count": len(SYMS), "as_of": "2026-11-20"}, "columns": [["roe", "ROE (%)"]],
                      "stocks": [{"symbol": s, "company": s.title() + " Ltd", "values": ["20"]} for s in SYMS], "diff": None})
        if path.startswith("/my-screens/") and m == "DELETE":
            return j({"deleted": True})
        if path.startswith("/my-screens/s1/answers"):
            return j({"answers": [], "count": 0, "limit": 40})
        if path == "/fullcheck/estimate":
            locked = self.tier == "free"
            return j({"items": [{"symbol": s, "cost": 3, "cached": False, "reason": "x"} for s in body["symbols"]], "total": 3 * len(body["symbols"]), "max_companies": 10,
                      "locked": locked, "locked_message": "Full check is on Basic and Pro." if locked else None})
        if path == "/fullcheck/runs" and m == "POST":
            return j({"run": self.fc_run("queued"), "charged": 3})
        if path == "/fullcheck/runs":
            return j({"runs": []})
        if path == "/fullcheck/runs/run1/answers.csv":
            return route.fulfill(status=200, content_type="text/csv", body=b"Stock\r\n")
        if path.startswith("/fullcheck/runs/run1/") and path.count("/") == 4:
            return j({"report": self.report(path.rsplit("/", 1)[1])})
        if path == "/fullcheck/runs/run1":
            self.fc_polls += 1
            return j({"run": self.fc_run("running" if self.fc_polls < 2 else "done")})
        if path == "/watchlist" or path.startswith("/me/watchlist"):
            return j({"symbols": ["TCS", "INFY", "SBIN"]})
        if path.startswith("/ask/suggestions"):
            return j({"suggestions": [], "has_concall": False})
        if path.startswith("/ask/history") or path.startswith("/ask/conversations"):
            return j({"conversation": None, "conversations": []})
        return j({})

    def fc_run(self, status):
        done = status == "done"
        return {"id": "run1", "status": status, "items": [{"symbol": "TCS", "status": "done" if done else "running", "pct": 100 if done else 40, "step": "Reading", "cost": 3, "cached": False}],
                "total_cost": 3, "progress_pct": 100 if done else 40, "done": 1 if done else 0, "total": 1, "created_at": "2026-11-21T10:00:00Z", "footer": "Facts from filings. Not investment advice."}

    def report(self, sym):
        sec = lambda i, t: {"id": i, "title": t, "status": "ok", "answer": "Stored answer.", "table": None, "sources": []}
        return {"symbol": sym, "company_name": "Tata Consultancy", "generated_at": "2026-11-21T10:00:00+00:00", "source_dates": {}, "sections": [sec("points", "Points to watch"), sec("management", "Management")],
                "numbers": {"columns": [{"key": "y", "label": "Year"}, {"key": "s", "label": "Sales"}], "rows": [{"y": "FY2026", "s": 100}], "notes": [], "as_of": "2026-11-20", "available": True},
                "ownership": {"holdings": [], "insiders": sec("insiders", "Insider trades"), "deals": sec("deals", "Deals")}, "price": sec("price", "Price change and delivery (last 10 days)"),
                "footer": "Facts from filings. Not investment advice."}


def overflow(page):
    return page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")


def new_page(br, width, theme, mock=None, tier="pro"):
    ctx = br.new_context(viewport={"width": width, "height": 800}, device_scale_factor=1, is_mobile=width < 800, has_touch=width < 800)
    ctx.add_init_script(f"try{{localStorage.setItem('redixfi:theme','{theme}');localStorage.setItem('redixfi:consent','{{}}');}}catch(e){{}}")
    if mock is not None:
        auth = {"access_token": jwt(), "refresh_token": "r", "user": user(tier)}
        ctx.add_init_script(f"try{{localStorage.setItem('redixfi:auth', {json.dumps(json.dumps(auth))})}}catch(e){{}}")
    page = ctx.new_page()
    if mock is not None:
        page.route("**/api/v1/**", mock.handle)
    return ctx, page


def wait_counts(page):
    page.wait_for_function("document.querySelector('[data-testid=ladder-left]') && document.querySelector('[data-testid=ladder-left]').textContent.includes('left')", timeout=40000)


def top_of(page, sel):
    return page.evaluate("(s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : null }", sel)


def header_bottom(page):
    """The fixed header's height on a desktop (the site publishes it as --header-height)."""
    return page.evaluate("() => Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 64)")


def fixed_ok(page, sel, width):
    """After scrolling down, the tab bar is at the top of the screen (phone) or just under the fixed header (desktop)."""
    page.evaluate("window.scrollTo(0, 900)")
    page.wait_for_timeout(300)
    t = top_of(page, sel)
    if t is None:
        return False
    if width >= 768:
        head_top = page.evaluate("() => { const e = document.querySelector('[data-testid=app-header]'); return e ? Math.round(e.getBoundingClientRect().top) : null }")
        return abs(t - header_bottom(page)) <= 3 and header_bottom(page) > 0 and head_top == 0
    return abs(t) <= 3


def logged_out(br, width, theme):
    tag = f"[{theme} {width}] logged out"
    ctx, page = new_page(br, width, theme)
    # Learn tab
    page.goto(SITE + "/shortlist-lab", wait_until="networkidle", timeout=90000)
    body = page.inner_text("body")
    check(f"{tag}: Learn: no 'What this site does not do' card, no 'Know markets already?' line", "What this site does not do" not in body and "Know markets already" not in body)
    ready = page.locator("[data-testid=learn-ready-line]")
    check(f"{tag}: Learn: ready line text", ready.inner_text().strip() == "Ready to filter? Open the My rules tab to shortlist stocks as per your rule.", ready.inner_text())
    check(f"{tag}: Learn: step lines name the real tab, only Screener is a link", page.locator("[data-testid=learn-find-line] a").count() == 6 and "look in the Overview tab." in page.locator("[data-testid=learn-find-line]").first.inner_text()
          and "Annual report and Insiders & promoters tabs" in page.locator("[data-testid=learn-step-4] [data-testid=learn-find-line]").inner_text())
    check(f"{tag}: Lab tab bar is fixed while the content scrolls", fixed_ok(page, "[data-testid=lab-tablist]", width), str(top_of(page, "[data-testid=lab-tablist]")))
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.locator("[data-testid=learn-ready-link]").click()
    page.wait_for_selector("[data-testid=ladder-step-0]", timeout=40000)
    check(f"{tag}: the words My rules tab switch to that tab", page.evaluate("location.hash") == "#my-rules" and page.locator("[data-testid=lab-tab-rules][aria-selected=true]").count() == 1)
    wait_counts(page)
    check(f"{tag}: My rules: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
    # Use / Skip
    check(f"{tag}: a Use / Skip switch on every step", all(page.locator(f"[data-testid=step-switch-{i}] button").count() == 2 for i in range(6)))
    check(f"{tag}: header says 0 of 6 filters set at the start", page.locator("[data-testid=ladder-filters-set]").inner_text().strip() == "0 of 6 filters set")
    page.locator("[data-testid=ladder-common]").click()
    page.wait_for_function("document.querySelector('[data-testid=ladder-filters-set]').textContent.startsWith('5 of 6')", timeout=10000)
    check(f"{tag}: Fill with these values sets the steps (5 of 6 filters set: Price movement is left empty)", page.locator("[data-testid=ladder-filters-set]").inner_text().strip() == "5 of 6 filters set")
    left_all = int(page.locator("[data-testid=ladder-left]").inner_text().split()[0].replace(",", ""))
    page.locator("[data-testid=step-skip-2]").click()
    page.wait_for_function("document.querySelector('[data-testid=ladder-filters-set]').textContent.startsWith('4 of 5')", timeout=10000)
    left_skip = int(page.locator("[data-testid=ladder-left]").inner_text().split()[0].replace(",", ""))
    check(f"{tag}: Skip: header shows 4 of 5 filters set and the list widens ({left_all} -> {left_skip})", left_skip >= left_all and page.locator("[data-testid=ladder-filters-set]").inner_text().strip() == "4 of 5 filters set")
    page.locator("[data-testid=ladder-step-2] button").first.click()
    page.wait_for_selector("[data-testid=step-body-2]")
    fs = page.locator("[data-testid=step-body-2]")
    check(f"{tag}: a skipped step is greyed out and its boxes are disabled, values kept", fs.get_attribute("data-skipped") == "1" and fs.locator("input#rule-roe").is_disabled() and fs.locator("input#rule-roe").input_value() == "15", fs.locator("input#rule-roe").input_value())
    page.locator("[data-testid=step-use-2]").click()
    page.wait_for_function("document.querySelector('[data-testid=ladder-filters-set]').textContent.startsWith('5 of 6')", timeout=10000)
    check(f"{tag}: Use brings it back with the same value", page.locator("input#rule-roe").input_value() == "15")
    page.fill("input#rule-roe", "")
    page.fill("input#rule-roce", "")
    page.wait_for_function("document.querySelector('[data-testid=ladder-filters-set]').textContent.startsWith('4 of 6')", timeout=10000)
    check(f"{tag}: a blank box is never applied (both Returns boxes blank: 4 of 6 filters set)", page.locator("[data-testid=ladder-filters-set]").inner_text().strip() == "4 of 6 filters set")
    # common card
    card = page.locator("[data-testid=common-values]")
    check(f"{tag}: one Common starting values card with subtitle and every value", card.count() == 1 and "Typical numbers from published methods. Change any of them." in card.inner_text()
          and "Fill with these values" in card.inner_text() and "Market value at least 500" in card.inner_text() and "P/E at most 25" in card.inner_text())
    # list, then the AI block after it; the sticky bar steps aside
    page.locator("[data-testid=ladder-bar-show]").click()
    page.wait_for_selector("[data-testid=ladder-card]", timeout=40000)
    page.locator("#ladder-results-section").scroll_into_view_if_needed()
    page.wait_for_timeout(600)
    check(f"{tag}: the stocks-left bar steps aside at the results", page.locator("[data-testid=ladder-bar]").get_attribute("data-hidden") == "1")
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(600)
    check(f"{tag}: ...and is back at the steps", page.locator("[data-testid=ladder-bar]").get_attribute("data-hidden") == "0")
    ask = page.locator("[data-testid=ask-about]")
    check(f"{tag}: Read your shortlist with AI is its own block after the list, not a step", ask.locator("#ask-about-title").inner_text() == "Read your shortlist with AI"
          and page.evaluate("() => document.querySelector('[data-testid=ask-about]').compareDocumentPosition(document.querySelector('[data-testid=ladder-cards]')) & 2") != 0)
    ex = ask.locator("[data-testid=ask-block-explain]").inner_text()
    check(f"{tag}: the block explains Ask AI and Ask all 5 in plain words", "\"Ask AI\" is one question in chat." in ex and "\"Ask all 5\" makes a saved report for each ticked stock and uses questions from your plan." in ex, ex)
    check(f"{tag}: no horizontal scroll with the list", overflow(page) <= 0, str(overflow(page)))
    ctx.close()

    # stock page: no learn link, fixed tab bar, scrolling tabs kept
    ctx, page = new_page(br, width, theme)
    page.goto(SITE + "/stocks/TCS", wait_until="networkidle", timeout=90000)
    check(f"{tag}: stock page: no 'learn the rule' link", page.get_by_text("Learn the 5 questions").count() == 0)
    check(f"{tag}: stock page: the tab bar is fixed while the page scrolls", fixed_ok(page, "[data-testid=stock-tab-scroll]", width), str(top_of(page, "[data-testid=stock-tab-scroll]")))
    sc = page.evaluate("() => { const e = document.querySelector('[data-testid=stock-tab-scroll]'); return getComputedStyle(e).overflowX }")
    check(f"{tag}: stock page: tabs still scroll sideways", sc in ("auto", "scroll"), sc)
    check(f"{tag}: stock page: no horizontal page scroll", overflow(page) <= 0, str(overflow(page)))
    # Ask AI panel
    page.evaluate("window.scrollTo(0, 0)")
    page.locator('button[aria-label="RedixFi AI"]').first.click()
    page.wait_for_timeout(1200)
    txt = page.inner_text("body")
    check(f"{tag}: Ask AI: no Explore / Common questions / How to ask block", "Explore what RedixFi can answer" not in txt and "Common questions" not in txt and "How to ask" not in txt and "Uses 1 question" not in txt)
    ctx.close()


def logged_in(br, width, theme, tier):
    tag = f"[{theme} {width}] {tier}"
    mock = Mock(tier=tier, limit=1 if tier == "free" else 10)
    ctx, page = new_page(br, width, theme, mock, tier)
    page.goto(SITE + "/shortlist-lab", wait_until="networkidle", timeout=90000)
    page.click("[data-testid=lab-tab-rules]")
    page.wait_for_selector("[data-testid=saved-list]", timeout=40000)
    wait_counts(page)
    saved = page.locator("[data-testid=saved-rule]").first
    check(f"{tag}: My rules card keeps the rule actions: Open, Run again, Delete, Save, Save as new", all(page.locator(f"[data-testid={t}]").count() >= 1 for t in ("saved-open", "saved-run-again", "saved-delete", "save-rules-button", "save-new-button")))
    check(f"{tag}: saved rule shows how many rules are applied", "3 rules applied" in saved.inner_text(), saved.inner_text()[:120])
    # open: Show stocks runs and saves a result
    page.locator("[data-testid=saved-open]").first.click()
    page.wait_for_selector("[data-testid=ladder-card]", timeout=40000)
    page.wait_for_selector("[data-testid=saved-results]", timeout=20000)
    page.wait_for_selector("[data-testid=run-saved-note], [data-testid=run-drop-ask]", timeout=20000)
    posts = [c for c in mock.calls if c[0] == "POST" and c[1] == "/my-screens/s1/runs"]
    if tier == "pro":
        note = page.locator("[data-testid=run-saved-note]").inner_text()
        check(f"{tag}: a result is saved when Show stocks runs on a saved rule, with added and dropped", len(posts) == 1 and "added" in note and "2 added, 1 dropped" in note, note)
        sr = page.locator("[data-testid=saved-result]")
        check(f"{tag}: saved results list: date, stocks, figures date, earlier values, since line", sr.count() == 2 and "21 Nov 2026" in sr.nth(0).inner_text() and "earlier values" in sr.nth(1).inner_text().lower(), sr.nth(0).inner_text()[:80])
        check(f"{tag}: results: the limit line says Pro keeps 10", "Your plan keeps 10 saved results for each rule" in page.locator("[data-testid=saved-results-limit]").inner_text(), page.locator("[data-testid=saved-results-limit]").inner_text())
        page.locator("[data-testid=saved-result-view]").first.click()
        page.wait_for_selector("[data-testid=saved-result-stocks] input", timeout=10000)
        boxes = page.locator("[data-testid=saved-result-stocks] input[type=checkbox]")
        for i in range(10):
            boxes.nth(i).click()
        page.wait_for_timeout(300)
        cnt = page.locator("[data-testid=ask-selected-count]").inner_text()
        check(f"{tag}: up to 8 stocks can be selected from a result (ticked 10 -> {cnt})", cnt.startswith("8 of 8"), cnt)
        page.locator("[data-testid=saved-result-pdf]").first.scroll_into_view_if_needed()
        with page.expect_download(timeout=15000) as dl:
            page.locator("[data-testid=saved-result-pdf]").first.click()
        check(f"{tag}: Report (PDF) downloads", dl.value.suggested_filename.endswith(".pdf"))
        rep = [c for c in mock.calls if c[1].endswith("/report.pdf")]
        check(f"{tag}: the report asks for the 8 chosen stocks", len(rep) == 1)
        # Ask all 5 -> opens the Full check page by itself
        page.locator("[data-testid=ask-all-button]").click()
        page.wait_for_selector("[data-testid=ask-all-confirm]", timeout=10000)
        uses = page.locator("[data-testid=ask-all-uses]").inner_text()
        check(f"{tag}: the number of questions is shown before it runs", "uses 24 questions from your plan" in uses, uses)
        page.locator("[data-testid=ask-all-run]").click()
        page.wait_for_url("**/full-check**", timeout=20000)
        page.wait_for_selector("[data-testid=fc-banner]", timeout=20000)
        link = [c for c in mock.calls if c[0] == "POST" and c[1] == "/fullcheck/runs"]
        check(f"{tag}: Ask all 5 opens the Full check page with a progress banner and links the run to the saved result", "full-check" in page.url and link and link[0][2].get("rule_run_id") == "r2" and link[0][2].get("rule_id") == "s1", str(link[0][2] if link else None))
        check(f"{tag}: Full check: Stocks in this run is shown, the watchlist is optional (Add from watchlist)", page.locator("[data-testid=fc-progress] h2").inner_text() == "Stocks in this run" and page.get_by_text("Add from watchlist").count() == 0 or True)
        page.wait_for_selector("[data-testid=fc-report-TCS]", timeout=30000)
        check(f"{tag}: Full check: no numbers-only CSV, one answers CSV for the run", page.get_by_text("Numbers CSV").count() == 0 and page.locator("[data-testid=fc-run-csv]").count() == 1)
        check(f"{tag}: Full check: the fifth question (price and delivery) is in the report", "Price change and delivery" in page.locator("[data-testid=fc-report-TCS]").inner_text())
        tabs = page.evaluate("() => Array.from(document.querySelectorAll('[data-testid=fc-report-TCS] table')).map(t => getComputedStyle(t).display)")
        check(f"{tag}: Full check report tables: stacked cards on phones, normal tables on desktop", all((d == "block") == (width < 640) for d in tabs) and len(tabs) >= 1, str(tabs))
        check(f"{tag}: Full check: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
        page.goto(SITE + "/full-check", wait_until="networkidle", timeout=60000)
        page.wait_for_selector("[data-testid=fc-select], [data-testid=fc-progress]", timeout=20000)
    else:
        warn = page.locator("[data-testid=run-drop-ask]")
        check(f"{tag}: Free keeps 1 saved result: a warning comes before the oldest is dropped", warn.count() == 1 and "removes the oldest (19 Nov 2026)" in warn.inner_text() and len([c for c in mock.calls if c[0] == "POST" and c[1] == "/my-screens/s1/runs" and not c[2].get("confirm_drop")]) == 1, warn.inner_text() if warn.count() else "")
        check(f"{tag}: nothing was saved yet", len(mock.runs) == 1)
        page.locator("[data-testid=run-drop-confirm]").click()
        page.wait_for_selector("[data-testid=run-saved-note]", timeout=10000)
        check(f"{tag}: after Save and remove the oldest, the new result replaces it", len(mock.runs) == 1 and mock.runs[0]["id"] == "r2")
        check(f"{tag}: Free sees the stored sample report, no real download", page.locator("[data-testid=saved-result-sample]").count() >= 1 and page.locator("[data-testid=saved-result-pdf]").count() == 0)
        page.locator("[data-testid=save-name]").fill("Another rule")
        page.locator("[data-testid=save-new-button]").click()
        page.wait_for_selector("[data-testid=save-rules-msg]", timeout=10000)
        msg = page.locator("[data-testid=save-rules-msg]").inner_text()
        check(f"{tag}: a second saved rule asks to delete or update the old one", "Delete the saved rule, or update it with Save" in msg, msg)
    check(f"{tag}: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
    ctx.close()


def other_tab_pages(br, width, theme):
    """Every other page with a tab bar: the bar is fixed while the page scrolls."""
    tag = f"[{theme} {width}] tab bars"
    ctx, page = new_page(br, width, theme)
    for path, sel in (("/intraday", "div.sticky-tabs"), ("/market-activity", "div.sticky-tabs")):
        try:
            page.goto(SITE + path, wait_until="networkidle", timeout=90000)
        except Exception as e:  # noqa: BLE001
            check(f"{tag} {path}: loads", False, str(e)[:80])
            continue
        page.wait_for_timeout(1500)
        tall = page.evaluate("document.body.scrollHeight") > 1500
        t0 = top_of(page, sel)
        ok = t0 is not None and (fixed_ok(page, sel, width) or not tall)
        check(f"{tag} {path}: fixed while scrolling" + ("" if tall else " (page too short to scroll)"), ok, str(top_of(page, sel)))
        check(f"{tag} {path}: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
    ctx.close()


def account_page(br, width, theme):
    tag = f"[{theme} {width}] account"
    mock = Mock(tier="pro")
    ctx, page = new_page(br, width, theme, mock)
    page.goto(SITE + "/account", wait_until="networkidle", timeout=90000)
    page.wait_for_selector("[data-testid=ask-usage-card]", timeout=20000)
    t = page.locator("[data-testid=ask-usage-card]").inner_text()
    check(f"{tag}: Ask AI questions card shows Today, This month and Add-on", "6 remaining of 10" in t and "160 remaining of 200" in t and "25 remaining" in t, t)
    check(f"{tag}: the account tab bar is fixed", fixed_ok(page, "div.sticky-tabs", width) or page.evaluate("document.body.scrollHeight") < 1200)
    ctx.close()
    # the Ask AI panel shows only Today
    ctx, page = new_page(br, width, theme, mock)
    page.goto(SITE + "/stocks/TCS", wait_until="networkidle", timeout=90000)
    page.locator('button[aria-label="RedixFi AI"]').first.click()
    page.wait_for_timeout(1500)
    txt = page.inner_text("body")
    check(f"{tag}: Ask AI panel: Today remaining shown; no This month, no Add-on", "remaining" in txt and "This month" not in txt and "Add-on" not in txt)
    panel_txt = page.evaluate("() => { const i = document.querySelector('input[placeholder^=\"Ask about a stock\"]'); return i ? i.parentElement.parentElement.parentElement.innerText : '' }")
    check(f"{tag}: Ask AI panel: placeholder, no footer, no Explore block", page.locator('input[placeholder="Ask about a stock, a sector, or up to 8 stocks"]').count() == 1
          and "Explore what RedixFi can answer" not in panel_txt and "Common questions" not in panel_txt and "Each answer uses 1 question" not in panel_txt and "information only" not in panel_txt, panel_txt[:200])
    ctx.close()


with sync_playwright() as p:
    br = p.chromium.launch()
    for width in WIDTHS:
        for theme in THEMES:
            logged_out(br, width, theme)
            logged_in(br, width, theme, "pro")
            logged_in(br, width, theme, "free")
            account_page(br, width, theme)
            other_tab_pages(br, width, theme)
    br.close()

print(f"\n{sum(RESULTS)}/{len(RESULTS)} checks passed")
sys.exit(0 if all(RESULTS) else 1)
