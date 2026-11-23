"""Browser checks for Shortlist Lab releases 2 and 3 (21 Nov 2026), the 22 Nov 2026 release and the 23 Nov 2026 releases (Rules and Results tabs, step list with counts, one result button, saved results and limits, Ask AI status, one report): fixed tab bars, Learn tab, Ask AI clean-up, blank-field rules (no Use/Skip),
Fill typical values, the Price and volume step, saved results, Save this result, reports, Ask AI for 2 to 8 stocks, Read your shortlist with AI, Full check page. Real site build, real figures file and real shortlist (live API, read only);
logged-in-only endpoints are answered by a mock so Free / paid screens can be exercised without a real account.

  python scripts/browser-lab-r2r3.py <site url> [shots dir]
Widths 360, 414 and 1280 (desktop), themes light / dark / slate. One line per check, then a count.
"""
import base64
import json
import os
import re
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

SITE = sys.argv[1].rstrip("/")
SHOTS = Path(sys.argv[2]) if len(sys.argv) > 2 else None
if SHOTS:
    SHOTS.mkdir(parents=True, exist_ok=True)
RESULTS = []
LADDER_JSON = Path(os.environ["LADDER_FILE"]).read_text(encoding="utf-8") if os.environ.get("LADDER_FILE") else None   # a rebuilt counts file, before it is deployed
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
    def __init__(self, tier="pro", limit=10, saved=True, fail=(), daily_used=None, run_limit=None, runs=None):
        self.tier, self.limit = tier, limit
        self.fail = set(fail)
        self.daily_used = 4 if daily_used is None else daily_used
        self.screens = [{"id": "s1", "name": "My growers", "params": RULE_PARAMS, "created_at": "2026-11-18T10:00:00Z", "last_viewed_at": None, "updated_at": "2026-11-19T10:00:00Z",
                         "stock_count": 52, "counted_at": None, "snapshot": None, "answers": 0}] if saved else []
        self.runs = [{"id": "r1", "run_date": "2026-11-19", "count": 9, "as_of": "2026-11-18", "earlier_values": True, "answers": 2, "params": {"roe_min": 12},
                      "added": None, "dropped": None, "since": None}]
        if runs is not None:
            self.runs = runs
        self.run_limit = run_limit if run_limit is not None else limit
        self.next_run = 2
        self.convq = {}
        self.calls = []
        self.urls = []
        self.answers_saved = []
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
        self.urls.append(req.url)
        j = lambda data, status=200: route.fulfill(status=status, content_type="application/json", body=json.dumps(env(data)))
        if path == "/ladder-data" and LADDER_JSON:
            return route.fulfill(status=200, content_type="application/json", body=LADDER_JSON)
        if path in ("/signals", "/ladder-data"):
            r = route.fetch(headers={k: v for k, v in req.headers.items() if k.lower() != "authorization"})
            return route.fulfill(response=r)
        if path == "/me":
            return j({**user(self.tier), "subscription": {"plan": self.tier, "status": "active", "renews": "2026-12-20T00:00:00Z", "cancel_requested_at": None, "cancel_at": None}, "phone_verified": False})
        if path == "/me/usage":
            if self.tier == "free":
                return j({"research_views_remaining": 0, "unlimited": False, "ask_redixfi": {"tier": "free", "is_pro_trial": False, "daily_limit_per_symbol": None,
                          "daily_used": self.daily_used, "daily_limit": 3, "monthly_used": None, "monthly_limit": None, "topup_questions_remaining": 0}})
            return j({"research_views_remaining": 0, "unlimited": True, "ask_redixfi": {"tier": self.tier, "is_pro_trial": False, "daily_limit_per_symbol": None,
                      "daily_used": self.daily_used, "daily_limit": 10, "monthly_used": 40, "monthly_limit": 200, "topup_questions_remaining": 25}})
        if path == "/ask" and m == "POST":
            sym = (body or {}).get("chat_context_symbol") or "NONE"
            self.asked = getattr(self, "asked", []) + [(sym, (body or {}).get("question"))]
            self.convq[sym] = (body or {}).get("question")
            if sym in self.fail:
                return route.fulfill(status=500, content_type="application/json", body=json.dumps({"detail": "model down"}))
            self.daily_used += 1
            return j({"answer": f"Answer for {sym}: the filing says what it says.", "sources_used": [], "source_citations": [], "refused": False, "conversation_id": f"c_{sym}",
                      "mode": "symbol", "resolved_symbol": sym, "compare": None, "screen": None, "table": None, "follow_ups": [], "choices": [], "quota_unchanged": False})
        if path == "/my-screens/with-result" and m == "POST":
            if len(self.screens) >= self.limit:
                return route.fulfill(status=403, content_type="application/json", body=json.dumps({"detail": "Your Free plan keeps 1 saved rule. Delete the saved rule, or update it with Save, to save this one. Basic keeps 10 and Pro 30."}))
            s = {"id": "s9", "name": body["name"], "params": body["params"], "created_at": "2026-11-22T10:00:00Z", "last_viewed_at": None, "updated_at": "2026-11-22T10:00:00Z",
                 "stock_count": len(SYMS), "counted_at": None, "snapshot": None, "answers": 0}
            self.screens.append(s)
            self.runs.insert(0, {"id": "r9", "run_date": "2026-11-22", "count": len(SYMS), "as_of": "2026-11-20", "earlier_values": False, "answers": 0, "params": body["params"], "added": None, "dropped": None, "since": None})
            return j({"saved": True, "rule": s, "run": {"id": "r9", "run_date": "2026-11-22", "count": len(SYMS), "as_of": "2026-11-20"}, "limit": self.run_limit, "rule_limit": self.limit})
        if path == "/my-screens" and m == "GET":
            return j({"screens": self.screens, "limit": self.limit, "count": len(self.screens)})
        if path == "/my-screens" and m == "POST":
            if len(self.screens) >= self.limit:
                return route.fulfill(status=403, content_type="application/json", body=json.dumps({"detail": "Your Free plan keeps 1 saved rule. Delete the saved rule, or update it with Save, to save this one. Basic keeps 10 and Pro 30."}))
            s = {"id": "s9", "name": body["name"], "params": body["params"], "created_at": "2026-11-20T10:00:00Z", "last_viewed_at": None, "updated_at": "2026-11-20T10:00:00Z",
                 "stock_count": body.get("stock_count"), "counted_at": None, "snapshot": None, "answers": 0}
            self.screens.append(s)
            return j(s)
        if re.match(r"^/my-screens/s\d/runs/", path) and path.endswith("/report.pdf"):
            return route.fulfill(status=200, content_type="application/pdf", headers={"content-disposition": 'attachment; filename="rule-report.pdf"'}, body=b"%PDF-1.4 test")
        if re.match(r"^/my-screens/s\d/runs/", path) and path.endswith("/report.csv"):
            return route.fulfill(status=200, content_type="text/csv", headers={"content-disposition": 'attachment; filename="rule-report.csv"'}, body=b"Stock,Company\r\n")
        if re.match(r"^/my-screens/s\d/runs$", path) and m == "POST":
            if len(self.runs) > self.run_limit:
                return j({"saved": False, "needs_confirm": False, "blocked": True, "limit": self.run_limit, "count": len(self.runs),
                          "message": f"Your plan keeps {self.run_limit} saved result for each rule and this rule has {len(self.runs)}. Delete some results to save a new one. Nothing was removed."})
            if body.get("confirm_drop") is not True and len(self.runs) >= self.run_limit:
                return j({"saved": False, "needs_confirm": True, "drops": {"id": self.runs[-1]["id"], "run_date": self.runs[-1]["run_date"]}, "limit": self.run_limit})
            if len(self.runs) >= self.run_limit:
                self.runs.pop()
            rid = f"r{self.next_run}"
            self.next_run += 1
            self.runs.insert(0, {"id": rid, "run_date": "2026-11-21", "count": len(SYMS), "as_of": "2026-11-20", "earlier_values": False, "answers": 0,
                                 "params": body["params"], "added": 2, "dropped": 1, "since": "2026-11-19"})
            return j({"saved": True, "needs_confirm": False, "run": {"id": rid, "run_date": "2026-11-21", "count": len(SYMS), "as_of": "2026-11-20"}, "updated_same_day": False,
                      "dropped": None, "limit": self.run_limit, "diff": {"since": "2026-11-19", "added": ["OFSS", "TECHM"], "dropped": ["ZZZZ"]}})
        if re.match(r"^/my-screens/s\d/runs$", path) and m == "GET":
            return j({"runs": self.runs, "limit": self.run_limit, "count": len(self.runs)})
        if re.match(r"^/my-screens/s\d/runs/", path) and m == "GET":
            return j({"run": {"id": "r2", "run_date": "2026-11-21", "count": len(SYMS), "as_of": "2026-11-20"}, "columns": [["roe", "ROE (%)"]],
                      "stocks": [{"symbol": s, "company": s.title() + " Ltd", "values": ["20"]} for s in SYMS], "diff": None})
        mm = re.match(r"^/my-screens/s\d/runs/(\w+)$", path)
        if mm and m == "DELETE":
            self.runs = [x for x in self.runs if x["id"] != mm.group(1)]
            return j({"deleted": True})
        if path.startswith("/my-screens/") and m == "DELETE":
            return j({"deleted": True})
        if re.match(r"^/my-screens/s\d/answers", path) and m == "POST":
            self.answers_saved.append((path, body))
            return j({"answer": {"id": "a%d" % len(self.answers_saved)}, "already_saved": False})
        if re.match(r"^/my-screens/s\d/answers", path):
            run = (re.search(r"run_id=(\w+)", req.url) or [None, None])[1]
            rows = []
            for i, (pth, b) in enumerate(self.answers_saved):
                if run and b.get("run_id") not in (run, None):
                    continue
                sym = b.get("symbol")
                rows.append({"id": f"a{i}", "rule_id": "s1", "run_id": b.get("run_id") or "r1", "symbol": sym, "symbols": [sym], "question": self.convq.get(sym) or "", "answer": b.get("answer_text"),
                             "sources": [], "table": None, "answered_at": "2026-11-21", "saved_at": "2026-11-21T10:00:00Z"})
            return j({"answers": rows, "count": len(rows), "limit": 40})
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
    elif LADDER_JSON:
        page.route("**/api/v1/ladder-data", lambda route: route.fulfill(status=200, content_type="application/json", body=LADDER_JSON))
    return ctx, page


def wait_counts(page):
    """The counts show only once a field is filled: Fill typical values, then wait for 'About N stocks match so far' (the figures file has loaded)."""
    page.locator("[data-testid=ladder-fill]").click()
    page.wait_for_function("document.querySelector('[data-testid=ladder-left]') && document.querySelector('[data-testid=ladder-left]').textContent.includes('match')", timeout=40000)
    page.locator("[data-testid=ladder-clear]").click()
    page.wait_for_timeout(200)


def count_of(page):
    t = page.locator("[data-testid=ladder-left]").inner_text()
    return int(re.search(r"About ([\d,]+)", t).group(1).replace(",", ""))


def open_step(page, n):
    page.locator(f"[data-testid=ladder-step-{n}]").click()
    page.wait_for_selector(f"[data-testid=step-page-{n}]", timeout=10000)


def back_to_steps(page):
    page.locator("[data-testid=step-back]").click()
    page.wait_for_selector("[data-testid=step-list]", timeout=10000)


def go_section(page, name):
    """The two top tabs: Rules (the list, or the rule page that is open) and Results."""
    page.locator(f"[data-testid=rules-sec-{name}]").click()
    page.wait_for_selector("[data-testid=section-results]" if name == "results" else "[data-testid=section-rules], [data-testid=section-create]", timeout=10000)


def to_rules_tab(page):
    page.goto(SITE + "/shortlist-lab", wait_until="networkidle", timeout=90000)
    page.click("[data-testid=lab-tab-rules]")
    page.wait_for_selector("[data-testid=create-new-rule]", timeout=40000)


def create_rule(page):
    page.locator("[data-testid=create-new-rule]").click()
    page.wait_for_selector("[data-testid=section-create]", timeout=10000)


def light_rule(page):
    """One easy rule (ROE at least 15) so the list always has stocks; Fill typical values now also fills the price and volume step, which can leave very few."""
    open_step(page, 2)
    page.fill("input#rule-roe", "15")
    back_to_steps(page)


def result_button(page):
    return page.locator("[data-testid=rule-result-button]")


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
    check(f"{tag}: Learn: step lines name the real tab, only Screener is a link", page.locator("[data-testid=learn-find-line] a").count() == 7 and "look in the Overview tab." in page.locator("[data-testid=learn-find-line]").first.inner_text()
          and "Annual report and Insiders & promoters tabs" in page.locator("[data-testid=learn-step-4] [data-testid=learn-find-line]").inner_text())
    check(f"{tag}: Lab tab bar is fixed while the content scrolls", fixed_ok(page, "[data-testid=lab-tablist]", width), str(top_of(page, "[data-testid=lab-tablist]")))
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    check(f"{tag}: Learn: the long 5-questions card is gone; every step lists its fields with an example", page.locator("[data-testid=learn-try]").count() == 0 and "The 5 questions" not in page.inner_text("body")
          and page.locator("[data-testid=learn-fields]").count() == 7 and page.locator("[data-testid=learn-field]").count() >= 20)
    check(f"{tag}: Learn: the price-swings option and the Price and volume fields are explained", "Day-to-day price swings" in page.locator("[data-testid=learn-step-5]").inner_text() and "Price close to its 52-week high" in page.locator("[data-testid=learn-step-7]").inner_text()
          and "Calmer" in page.locator("[data-testid=learn-step-5]").inner_text())
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.locator("[data-testid=learn-ready-link]").click()
    page.wait_for_selector("[data-testid=ladder-step-0]", timeout=40000)
    check(f"{tag}: the words My rules tab switch to that tab", page.evaluate("location.hash") == "#my-rules" and page.locator("[data-testid=lab-tab-rules][aria-selected=true]").count() == 1)
    check(f"{tag}: My rules: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
    # two tabs
    page.wait_for_selector("[data-testid=create-new-rule]", timeout=40000)
    secs = [page.locator(f"[data-testid=rules-sec-{k}]").inner_text().strip() for k in ("rules", "results")]
    check(f"{tag}: two tabs at the top: Rules | Results", secs == ["Rules", "Results"], str(secs))
    check(f"{tag}: the Rules page opens with a Create new rule button and (logged out) the sign-up line", page.locator("[data-testid=create-new-rule]").inner_text().strip() == "Create new rule" and page.locator("[data-testid=my-rules-loggedout-saved]").count() == 1)
    create_rule(page)
    body = page.inner_text("body")
    check(f"{tag}: the long explanation lines are gone, only the two short lines stay", all(t not in body for t in ("Set the rules that matter to you", "The bar that stays on screen", "Why this rule", "Open a rule you saved"))
          and page.locator("[data-testid=ladder-blank-line]").inner_text().strip() == "Leave a field blank to ignore it." and page.locator("[data-testid=ladder-past]").inner_text().strip() == "Filters use past reported numbers. They do not tell what happens next.")
    # ONE result button at the bottom, no count until a field is filled, nothing sticky
    shows = page.get_by_role("button", name="Show stocks that meet my rule")
    check(f"{tag}: ONE result button, 'Show stocks that meet my rule', no number on it", shows.count() == 1 and result_button(page).inner_text().strip() == "Show stocks that meet my rule")
    check(f"{tag}: no stock count and no counts note until a field is filled", page.locator("[data-testid=ladder-left]").count() == 0 and page.locator("[data-testid=ladder-counts-note]").count() == 0 and "stocks left" not in body)
    stick = page.evaluate("() => Array.from(document.querySelectorAll('[data-testid=ladder] *')).filter(e => getComputedStyle(e).position === 'sticky' || getComputedStyle(e).position === 'fixed').length")
    check(f"{tag}: nothing in My rules is sticky or fixed (nothing can overlap the Results page)", stick == 0, str(stick))
    result_button(page).click()
    page.wait_for_selector("[data-testid=ladder-nofilter]", timeout=5000)
    check(f"{tag}: Show with nothing filled says 'No filter applied. Fill at least one field.' and lists nothing", page.locator("[data-testid=ladder-nofilter]").inner_text().strip() == "No filter applied. Fill at least one field."
          and page.locator("[data-testid=ladder-card]").count() == 0 and page.locator("[data-testid=section-create]").count() == 1)
    # the step list: name, tick or "N set"; a step opens on its own page with Back and Next
    rows = page.locator("[data-testid=step-list] > li")
    names = [page.locator(f"[data-testid=ladder-step-{i}] [data-testid=ladder-step-name]").inner_text().strip() for i in range(7)]
    check(f"{tag}: a numbered list of the 7 steps", rows.count() == 7 and names == [f"{i + 1}. {n}" for i, n in enumerate(["Size and trading", "Earnings", "Returns", "Debt and pledge", "Price movement", "Price you pay", "Price and volume"])], str(names))
    check(f"{tag}: every step reads 'Not set' at the start, with no stock count", all(page.locator(f"[data-testid=ladder-set-{i}]").inner_text().strip() == "Not set" for i in range(7)))
    check(f"{tag}: no Use / Skip switch, no 'N of M filters set' line, no Common starting values card", page.locator("[data-testid^=step-switch-]").count() == 0 and "filters set" not in page.inner_text("body") and page.locator("[data-testid=common-values]").count() == 0)
    fill = page.locator("[data-testid=ladder-fill]")
    check(f"{tag}: Fill typical values and Clear all sit above the steps, with the one-line note", fill.inner_text().strip() == "Fill typical values" and page.locator("[data-testid=ladder-clear]").inner_text().strip() == "Clear all"
          and top_of(page, "[data-testid=ladder-fill]") < top_of(page, "[data-testid=ladder-step-0]")
          and page.locator("[data-testid=ladder-fill-note]").inner_text().strip() == "Typical numbers from published methods. Change any of them. A field with no published number is left blank.")
    fill.click()
    page.wait_for_function("document.querySelector('[data-testid=ladder-left]') && document.querySelector('[data-testid=ladder-left]').textContent.includes('match')", timeout=40000)
    lt = page.locator("[data-testid=ladder-left]").inner_text()
    check(f"{tag}: once fields are filled a small bar shows 'About N stocks match so far' with the counts note", re.match(r"^About [\d,]+ stocks? match(es)? so far$", lt.strip()) is not None and "Counts come from last night's figures" in page.locator("[data-testid=ladder-counts-note]").inner_text(), lt)
    left_all = count_of(page)
    row_re = r"^\u2713 \d+ set \u00b7 [\d,]+ left$"
    check(f"{tag}: each step row reads 'N set · M left' (stocks left after that step, in step order)", all(re.match(row_re, page.locator(f"[data-testid=ladder-set-{i}]").inner_text().strip()) for i in (0, 1, 2, 3, 4, 5, 6)), page.locator("[data-testid=ladder-set-2]").inner_text())
    lefts = [int(page.locator(f"[data-testid=ladder-set-{i}]").get_attribute("data-left")) for i in range(7)]
    check(f"{tag}: the numbers left only go down from step to step, and the last one is the count in the bar ({lefts})", all(lefts[i] <= lefts[i - 1] for i in range(1, 7)) and lefts[6] == left_all, str(lefts))
    check(f"{tag}: the stock count in the bar matches the step rows", left_all == lefts[6])
    # Fill typical values: step 5 delivery, step 7 three fields; the others stay blank
    open_step(page, 4)
    check(f"{tag}: Fill typical values: Step 5 fills Delivery 50 and leaves Volume vs usual and the price-swings option blank", page.locator("input#rule-delivery").input_value() == "50" and page.locator("input#rule-volRatio").input_value() == "" and page.locator("[data-testid=rule-vol-select]").input_value() == "")
    back_to_steps(page)
    open_step(page, 6)
    check(f"{tag}: Fill typical values: Step 7 fills 25 % of the 52-week high, the 200-day average and volume 1.5 times its 20-day average; the 1, 3, 6 month change stays blank",
          page.locator("#rule-near52").input_value() == "25" and page.locator("#rule-avgDays").input_value() == "200" and page.locator("#rule-volDay").input_value() == "1.5" and page.locator("#rule-chgMonths").input_value() == "" and page.locator("#rule-chgMin").input_value() == "")
    check(f"{tag}: the volume filter says it uses its 20-day average", "times its 20-day average volume" in page.locator("[data-testid=pv-volDay]").inner_text())
    back_to_steps(page)
    page.locator("[data-testid=ladder-clear]").click()
    page.wait_for_timeout(300)
    check(f"{tag}: Clear all puts every step back to 'Not set' and hides the count", all(page.locator(f"[data-testid=ladder-set-{i}]").inner_text().strip() == "Not set" for i in range(7)) and page.locator("[data-testid=ladder-left]").count() == 0)
    # the step page shows what the step removed
    open_step(page, 1)
    check(f"{tag}: with nothing filled, a step page shows no count", page.locator("[data-testid=step-after]").count() == 0)
    page.fill("input#rule-profitYears", "5")
    page.wait_for_selector("[data-testid=step-after]", timeout=20000)
    l1 = count_of(page)
    back_to_steps(page)
    open_step(page, 2)
    page.fill("input#rule-roe", "15")
    page.wait_for_selector("[data-testid=step-after-line]", timeout=20000)
    l2 = count_of(page)
    line = page.locator("[data-testid=step-after-line]").inner_text().strip()
    check(f"{tag}: Returns step: 'After this step: {l2:,} left. This step removed {l1 - l2:,}.' and the line that the number depends on the steps before", line == f"After this step: {l2:,} left. This step removed {l1 - l2:,}."
          and page.locator("[data-testid=step-after-note]").inner_text().strip() == "The removed number depends on the steps before it.", line)
    page.fill("input#rule-roe", "")
    page.wait_for_timeout(300)
    check(f"{tag}: every field has one short example (e.g. ...)", page.locator("[data-testid=example-roe]").inner_text().strip() == "e.g. 15 (%)", page.locator("[data-testid=example-roe]").inner_text())
    nxt = page.locator("[data-testid=step-next]")
    check(f"{tag}: Back to the steps and 'Next: Step 4' keep the order clear", nxt.inner_text().strip() == "Next: Step 4" and page.locator("[data-testid=step-back]").inner_text().strip() == "Back to the steps")
    check(f"{tag}: blank boxes look empty (grey e.g. hint, no value)", page.locator("input#rule-roe").input_value() == "" and (page.locator("input#rule-roe").get_attribute("placeholder") or "").startswith("e.g. "))
    nxt.click()
    page.wait_for_selector("[data-testid=step-page-3]", timeout=10000)
    check(f"{tag}: Next opens Step 4 of 7", "Step 4 of 7. Debt and pledge" in page.locator("#step-page-title").inner_text())
    back_to_steps(page)
    page.locator("[data-testid=ladder-clear]").click()
    page.wait_for_timeout(300)
    # step 5: the price-swings control
    open_step(page, 4)
    sel = page.locator("[data-testid=rule-vol-select]")
    labels = page.evaluate("Array.from(document.querySelectorAll('#rule-volSel option')).map(o => o.textContent)")
    check(f"{tag}: Price movement: a clearly named control 'Day-to-day price swings' with plain options", "Day-to-day price swings" in page.locator("[data-testid=rule-vol]").inner_text()
          and labels == ["Not used", "Calmer: swung less than most stocks", "More active: swung more than most stocks"] and "21 trading days" in page.locator("[data-testid=rule-vol-line]").inner_text(), str(labels))
    sel.select_option("calmer")
    page.wait_for_selector("#rule-volNum", timeout=5000)
    check(f"{tag}: choosing Calmer asks for a number with a plain label and an example", page.locator("#rule-volNum").input_value() == "25" and "Swung more than at most" in page.locator("[data-testid=rule-vol]").inner_text()
          and page.locator("[data-testid=example-volNum]").inner_text().startswith("e.g. "))
    back_to_steps(page)
    check(f"{tag}: Price movement now reads 1 set", page.locator("[data-testid=ladder-set-4]").inner_text().strip().startswith("\u2713 1 set"), page.locator("[data-testid=ladder-set-4]").inner_text())
    page.locator("[data-testid=ladder-clear]").click()
    # step 7, Price and volume
    open_step(page, 6)
    page.wait_for_selector("[data-testid=pv-step]", timeout=10000)
    check(f"{tag}: Step 7 is Price and volume, with the bottom block (name box, result button) at its end", "Step 7 of 7. Price and volume" in page.locator("#step-page-title").inner_text() and page.locator("[data-testid=step-next]").count() == 0
          and result_button(page).count() == 1 and result_button(page).is_visible())
    blocks = [page.locator(f"[data-testid=pv-{k}]") for k in ("chg", "near52", "avg", "volDay")]
    check(f"{tag}: four optional filters, each with a plain line, an example and the two ideas folded away", all(b.count() == 1 for b in blocks)
          and all(page.locator(f"[data-testid=pv-{k}-line]").inner_text().strip() and page.locator(f"[data-testid=pv-{k}-example]").inner_text().startswith("e.g. ") for k in ("chg", "near52", "avg", "volDay"))
          and all("What it tells you:" in (b.text_content() or "") and "What it does not tell you:" in (b.text_content() or "") and "It is not a prediction and not advice." in (b.text_content() or "") for b in blocks))
    check(f"{tag}: the two ideas are folded away until opened", all(page.locator(f"[data-testid=pv-{k}-fold]").get_attribute("open") is None for k in ("chg", "near52", "avg", "volDay")))
    check(f"{tag}: the four are blank after Clear all", page.locator("#rule-chgMonths").input_value() == "" and page.locator("#rule-chgMin").input_value() == ""
          and page.locator("#rule-near52").input_value() == "" and page.locator("#rule-avgDays").input_value() == "" and page.locator("#rule-volDay").input_value() == "")
    opts = page.evaluate("Array.from(document.querySelectorAll('#rule-chgMonths option')).map(o => o.value)")
    check(f"{tag}: the price change period is 1, 3 or 6 months, nothing shorter", opts == ["", "1", "3", "6"], str(opts))
    pvtxt = " ".join((b.text_content() or "") for b in blocks)
    check(f"{tag}: no indicator names and none of the banned words in the new labels", not re.search(r"\b(RSI|MACD|strong|breakout|buy|picks?|top|best)\b", pvtxt, re.I), pvtxt[:200])
    page.select_option("#rule-chgMonths", "3")
    page.wait_for_selector("[data-testid=problem-chg-pair]", timeout=5000)
    check(f"{tag}: a period with no number is not used (told in words)", "Choose both the period and the number" in page.locator("[data-testid=problem-chg-pair]").inner_text() and page.locator("[data-testid=ladder-left]").count() == 0)
    page.fill("#rule-chgMin", "10")
    page.wait_for_function("document.querySelector('[data-testid=ladder-left]')", timeout=20000)
    c1 = count_of(page)
    page.select_option("#rule-avgDays", "200")
    page.wait_for_timeout(300)
    c2 = count_of(page)
    page.fill("#rule-near52", "10")
    page.wait_for_timeout(300)
    c3 = count_of(page)
    page.fill("#rule-volDay", "1.5")
    page.wait_for_timeout(300)
    c4 = count_of(page)
    check(f"{tag}: each Price and volume filter narrows the live count ({c1} -> {c2} -> {c3} -> {c4})", c1 > 0 and c2 <= c1 and c3 <= c2 and c4 <= c3 and c1 < 2400, f"{c1},{c2},{c3},{c4}")
    back_to_steps(page)
    check(f"{tag}: Price and volume reads '4 set'", page.locator("[data-testid=ladder-set-6]").inner_text().strip().startswith("\u2713 4 set"), page.locator("[data-testid=ladder-set-6]").inner_text())
    page.locator("[data-testid=ladder-clear]").click()
    page.wait_for_timeout(300)
    check(f"{tag}: Clear all empties every field including the new ones", all(page.locator(f"[data-testid=ladder-set-{i}]").inner_text().strip() == "Not set" for i in range(7)))
    check(f"{tag}: the rule page: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
    # the result button opens the Results page with the stocks
    light_rule(page)
    result_button(page).click()
    page.wait_for_selector("[data-testid=ladder-card]", timeout=40000)
    check(f"{tag}: Show opens the Results page; the list is called 'Your rule today' and says it is not saved", page.locator("[data-testid=rules-sec-results][aria-selected=true]").count() == 1
          and "match your rule today" in page.locator("[data-testid=ladder-total]").inner_text() or "matches your rule today" in page.locator("[data-testid=ladder-total]").inner_text())
    check(f"{tag}: the Results page has no Show button and nothing sticky on top of it", page.get_by_role("button", name="Show stocks that meet my rule").count() == 0
          and page.evaluate("() => Array.from(document.querySelectorAll('[data-testid=ladder] *')).filter(e => getComputedStyle(e).position === 'sticky').length") == 0)
    ask = page.locator("[data-testid=ask-about]")
    check(f"{tag}: the Ask AI card sits inside the result card, after the stocks; no 'Read your shortlist with AI' card", ask.locator("h3").inner_text() == "Ask AI" and "Read your shortlist with AI" not in page.inner_text("body")
          and page.evaluate("() => document.querySelector('[data-testid=ask-about]').compareDocumentPosition(document.querySelector('[data-testid=ladder-cards]')) & 2") != 0
          and page.evaluate("() => !!document.querySelector('[data-testid=ladder-results] [data-testid=ask-about]')") and page.locator("[data-testid=ask-block-explain]").count() == 0)
    go_section(page, "rules")
    page.locator("[data-testid=back-to-rules]").click()
    page.wait_for_selector("[data-testid=my-rules-loggedout-saved]", timeout=5000)
    check(f"{tag}: logged out, the Rules list asks to sign up or log in", page.locator("[data-testid=my-rules-loggedout-saved]").count() == 1)
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
    to_rules_tab(page)
    page.wait_for_selector("[data-testid=saved-list]", timeout=20000)
    check(f"{tag}: the Rules list: Create new rule on top, then the saved rules", top_of(page, "[data-testid=create-new-rule]") < top_of(page, "[data-testid=saved-list]"))
    plan = page.locator("[data-testid=my-rules-plan]")
    want = "Your plan keeps 1 saved rule. You have 1." if tier == "free" else "Your plan keeps 10 saved rules. You have 1."
    check(f"{tag}: the plan limit line is shown once ({want})", plan.count() == 1 and plan.inner_text().strip() == want, plan.inner_text() if plan.count() else "")
    saved = page.locator("[data-testid=saved-rule]").first
    check(f"{tag}: a saved rule shows its name and how many rules are applied; there is no Open, Run again or Delete on the list", "My growers" in saved.inner_text() and "3 rules applied" in saved.inner_text()
          and page.locator("[data-testid=saved-open]").count() == 0 and page.locator("[data-testid=saved-run-again]").count() == 0 and page.locator("[data-testid=saved-delete]").count() == 0, saved.inner_text()[:120])
    # tap the saved rule: it opens on the rule page, nothing is run
    saved.click()
    page.wait_for_selector("[data-testid=section-create]", timeout=10000)
    page.wait_for_selector("[data-testid=earlier-values-line]", timeout=10000)
    check(f"{tag}: tapping a saved rule opens it (3 steps set), nothing is run or saved", page.locator("[data-testid=ladder-card]").count() == 0 and page.locator("[data-testid=ladder-set-0]").inner_text().strip().startswith("\u2713 1 set")
          and page.locator("[data-testid=ladder-set-2]").inner_text().strip().startswith("\u2713 1 set") and page.locator("[data-testid=save-name]").input_value() == "My growers" and not [c for c in mock.calls if c[0] == "POST" and c[1] == "/my-screens/s1/runs"])
    check(f"{tag}: the open rule shows the line that its saved results keep the earlier values", page.locator("[data-testid=earlier-values-line]").inner_text().strip() == "Your saved results were made with the earlier values. They stay as they were.")
    check(f"{tag}: the bottom block has the name box, Save, Delete (saved rule) and ONE result button", all(page.locator(f"[data-testid={t}]").count() == 1 for t in ("save-name", "save-rules-button", "rule-delete", "rule-result-button"))
          and page.locator("[data-testid=save-new-button]").count() == 0)
    check(f"{tag}: an opened rule with no edits: the button says 'View stocks'", result_button(page).inner_text().strip() == "View stocks", result_button(page).inner_text())
    # an edit changes the button; putting the value back changes it back
    open_step(page, 2)
    page.fill("input#rule-roe", "20")
    back_to_steps(page)
    check(f"{tag}: after an edit the button says 'Show stocks that meet my rule'", result_button(page).inner_text().strip() == "Show stocks that meet my rule", result_button(page).inner_text())
    open_step(page, 2)
    page.fill("input#rule-roe", "15")
    back_to_steps(page)
    check(f"{tag}: with the old value back, it says 'View stocks' again", result_button(page).inner_text().strip() == "View stocks")
    # View stocks: the saved result, nothing is run
    result_button(page).click()
    page.wait_for_selector("[data-testid=saved-result]", timeout=20000)
    check(f"{tag}: View stocks opens Results with the rule's saved result and runs nothing", page.locator("[data-testid=rules-sec-results][aria-selected=true]").count() == 1 and page.locator("[data-testid=ladder-card]").count() == 0
          and not [c for c in mock.calls if c[0] == "POST" and c[1] == "/my-screens/s1/runs"] and not [u for u in mock.urls if "/signals" in u and "roe_min=15" in u and "page=1" in u])
    group = page.locator("[data-testid=results-group]").first
    check(f"{tag}: Results: saved results are grouped by rule, the open rule's group is open, each result has its date", page.locator("[data-testid=results-group]").count() == 1 and "My growers" in group.inner_text() and "19 Nov 2026" in page.locator("[data-testid=saved-result]").first.inner_text())
    check(f"{tag}: the newest result opens by itself and its stocks show their Ask AI status", page.locator("[data-testid=saved-result-stocks]").count() == 1 and page.locator("[data-testid=stock-ask-status]").count() == 10
          and all(t.strip() == "Not asked" for t in page.locator("[data-testid=stock-ask-status]").all_inner_texts()))
    check(f"{tag}: the Ask AI card sits inside the result card, no separate card at the bottom", page.locator("[data-testid=saved-result] [data-testid=ask-about]").count() == 1 and page.locator("[data-testid=ask-about]").count() == 1 and "Read your shortlist with AI" not in page.inner_text("body"))
    check(f"{tag}: a result with more than 8 stocks has a 'Tick next 8 not yet asked' button", page.locator("[data-testid=tick-next-8]").inner_text().strip() == "Tick next 8 not yet asked")
    page.locator("[data-testid=tick-next-8]").click()
    page.wait_for_timeout(300)
    cnt = page.locator("[data-testid=saved-result-stocks] [data-testid=ask-selected-count]").inner_text()
    check(f"{tag}: it ticks the first 8 stocks that were not asked ({cnt})", cnt.startswith("8 of 8") and page.locator("[data-testid=saved-result-stocks] input[type=checkbox]:checked").count() == 8, cnt)
    # edit, show, save this result
    go_section(page, "rules")
    open_step(page, 2)
    page.fill("input#rule-roe", "20")
    back_to_steps(page)
    result_button(page).click()
    page.wait_for_selector("[data-testid=ladder-card]", timeout=40000)
    check(f"{tag}: running a rule is temporary: the list says it is not saved and nothing was stored", "Not saved yet" in page.locator("[data-testid=live-not-saved]").inner_text() and not [c for c in mock.calls if c[0] == "POST" and c[1] == "/my-screens/s1/runs"] and len(mock.runs) == 1)
    page.locator("[data-testid=save-result-button]").click()
    if tier == "pro":
        page.wait_for_selector("[data-testid=run-saved-note]", timeout=20000)
        posts = [c for c in mock.calls if c[0] == "POST" and c[1] == "/my-screens/s1/runs"]
        note = page.locator("[data-testid=run-saved-note]").inner_text()
        check(f"{tag}: Save this result adds a NEW result (with added and dropped); the old one stays", len(posts) == 1 and len(mock.runs) == 2 and "2 added, 1 dropped" in note, note)
        sr = page.locator("[data-testid=saved-result]")
        check(f"{tag}: saved results list: date, stocks, figures date, earlier values, since line", sr.count() == 2 and "21 Nov 2026" in sr.nth(0).inner_text() and "earlier values" in sr.nth(1).inner_text().lower(), sr.nth(0).inner_text()[:80])
        check(f"{tag}: results: the limit line says Pro keeps 10", "Your plan keeps 10 saved results for each rule" in page.locator("[data-testid=saved-results-limit]").inner_text(), page.locator("[data-testid=saved-results-limit]").inner_text())
        page.locator("[data-testid=saved-result-view]").first.click()
        page.wait_for_selector("[data-testid=saved-result-stocks] input", timeout=10000)
        check(f"{tag}: a viewed result shows its Ask AI answers (none yet) and a PDF button on each stock", page.locator("[data-testid=saved-result-answers-none]").count() == 1 and page.locator("[data-testid=saved-result-stocks] [data-testid=stock-pdf]").count() == 10)
        boxes = page.locator("[data-testid=saved-result-stocks] input[type=checkbox]")
        for i in range(10):
            boxes.nth(i).click()
        page.wait_for_timeout(300)
        cnt = page.locator("[data-testid=saved-result-stocks] [data-testid=ask-selected-count]").inner_text()
        check(f"{tag}: up to 8 stocks can be selected from a result (ticked 10 -> {cnt})", cnt.startswith("8 of 8"), cnt)
        full = page.locator("[data-testid=saved-result] [data-testid=saved-result-pdf]").first
        check(f"{tag}: the main button is 'Download full report'", full.inner_text().strip() == "Download full report", full.inner_text())
        full.scroll_into_view_if_needed()
        with page.expect_download(timeout=15000) as dl:
            full.click()
        check(f"{tag}: Download full report downloads a PDF", dl.value.suggested_filename.endswith(".pdf"))
        rep = [u for u in mock.urls if "/report.pdf" in u]
        check(f"{tag}: the full report asks for the 8 chosen stocks and not for one page only", len(rep) == 1 and "only=stock" not in rep[0] and rep[0].count("%2C") == 7, str(rep))
        one = page.locator("[data-testid=saved-result-stocks] [data-testid=stock-pdf]").first
        one.scroll_into_view_if_needed()
        with page.expect_download(timeout=15000) as dl2:
            one.click()
        rep2 = [u for u in mock.urls if "/report.pdf" in u][-1]
        check(f"{tag}: Download PDF on a stock gives only that stock's page", dl2.value.suggested_filename.endswith(".pdf") and "only=stock" in rep2 and "%2C" not in rep2, rep2)
        # Ask all 5 -> opens the Full check page by itself
        page.locator("[data-testid=saved-result-stocks] [data-testid=ask-all-button]").click()
        page.wait_for_selector("[data-testid=ask-all-confirm]", timeout=10000)
        uses = page.locator("[data-testid=ask-all-uses]").inner_text()
        check(f"{tag}: the number of questions is shown before it runs", "uses 24 questions from your plan" in uses, uses)
        page.locator("[data-testid=ask-all-run]").click()
        page.wait_for_url("**/full-check**", timeout=20000)
        page.wait_for_selector("[data-testid=fc-banner]", timeout=20000)
        link = [c for c in mock.calls if c[0] == "POST" and c[1] == "/fullcheck/runs"]
        check(f"{tag}: Ask all 5 opens the Full check page with a progress banner and links the run to the saved result", "full-check" in page.url and link and link[0][2].get("rule_run_id") == "r2" and link[0][2].get("rule_id") == "s1", str(link[0][2] if link else None))
        page.wait_for_selector("[data-testid=fc-report-TCS]", timeout=30000)
        check(f"{tag}: Full check: no numbers-only CSV, one answers CSV for the run", page.get_by_text("Numbers CSV").count() == 0 and page.locator("[data-testid=fc-run-csv]").count() == 1)
        check(f"{tag}: Full check: the fifth question (price and delivery) is in the report", "Price change and delivery" in page.locator("[data-testid=fc-report-TCS]").inner_text())
        tabs = page.evaluate("() => Array.from(document.querySelectorAll('[data-testid=fc-report-TCS] table')).map(t => getComputedStyle(t).display)")
        check(f"{tag}: Full check report tables: stacked cards on phones, normal tables on desktop", all((d == "block") == (width < 640) for d in tabs) and len(tabs) >= 1, str(tabs))
        check(f"{tag}: Full check: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
        page.goto(SITE + "/full-check", wait_until="networkidle", timeout=60000)
        page.wait_for_selector("[data-testid=fc-select], [data-testid=fc-progress]", timeout=20000)
    else:
        page.wait_for_selector("[data-testid=run-drop-ask]", timeout=20000)
        warn = page.locator("[data-testid=run-drop-ask]")
        wt = warn.inner_text()
        check(f"{tag}: Free keeps 1 saved result: a warning comes first, nothing is saved yet", "Saving replaces your saved result, and the Ask AI answers saved with it are removed. Download the report or CSV first if you want to keep them." in wt
              and len(mock.runs) == 1 and len([c for c in mock.calls if c[0] == "POST" and c[1] == "/my-screens/s1/runs" and not c[2].get("confirm_drop")]) == 1, wt)
        check(f"{tag}: the Free dialog has Download report, Download CSV, Save and replace, Cancel and one line pointing to the plans", [page.locator(f"[data-testid={t}]").inner_text().strip() for t in ("dialog-dl-report", "dialog-dl-csv", "run-drop-confirm", "run-drop-cancel")] == ["Download report", "Download CSV", "Save and replace", page.locator("[data-testid=run-drop-cancel]").inner_text().strip()]
              and "Basic keeps 10" in page.locator("[data-testid=run-drop-plans]").inner_text() and page.locator("[data-testid=run-drop-plans] a").count() == 1 and page.locator("[data-testid=run-drop-other]").count() == 0)
        page.locator("[data-testid=dialog-dl-report]").click()
        page.wait_for_selector("[data-testid=dialog-dl-msg]", timeout=5000)
        check(f"{tag}: a Free account pressing Download report is told it is on Basic and Pro (no download, no API call)", "Downloads are on Basic and Pro." in page.locator("[data-testid=dialog-dl-msg]").inner_text() and not [u for u in mock.urls if "/report." in u])
        page.locator("[data-testid=run-drop-cancel]").click()
        check(f"{tag}: Cancel saves nothing", page.locator("[data-testid=run-drop-ask]").count() == 0 and len(mock.runs) == 1 and mock.runs[0]["id"] == "r1")
        page.locator("[data-testid=save-result-button]").click()
        page.wait_for_selector("[data-testid=run-drop-confirm]", timeout=10000)
        page.locator("[data-testid=run-drop-confirm]").click()
        page.wait_for_selector("[data-testid=run-saved-note]", timeout=10000)
        check(f"{tag}: after Save and replace, the new result replaces the only one", len(mock.runs) == 1 and mock.runs[0]["id"] == "r2")
        check(f"{tag}: Free sees the stored sample report and the upgrade message, no real download, no per-stock PDF", page.locator("[data-testid=saved-result-sample]").count() >= 1 and page.locator("[data-testid=saved-result-pdf]").count() == 0
              and page.locator("[data-testid=stock-pdf]").count() == 0 and "Free accounts can open a sample report" in page.locator("[data-testid=saved-results-report-note]").inner_text())
        go_section(page, "rules")
        page.locator("[data-testid=back-to-rules]").click()
        page.wait_for_selector("[data-testid=create-new-rule]", timeout=10000)
        create_rule(page)
        page.locator("[data-testid=ladder-fill]").click()
        page.locator("[data-testid=save-name]").fill("Another rule")
        page.locator("[data-testid=save-rules-button]").click()
        page.wait_for_selector("[data-testid=save-rules-msg]", timeout=10000)
        msg = page.locator("[data-testid=save-rules-msg]").inner_text()
        check(f"{tag}: a second saved rule asks to delete or update the old one", "Delete the saved rule, or update it with Save" in msg, msg)
    check(f"{tag}: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
    ctx.close()


def delete_rule_flow(br, width, theme, tier):
    """Delete (saved rules only): a warning first that its results and their answers go too, with Download report and Download CSV; Keep it changes nothing."""
    tag = f"[{theme} {width}] {tier} delete rule"
    mock = Mock(tier=tier, limit=1 if tier == "free" else 10)
    ctx, page = new_page(br, width, theme, mock, tier)
    to_rules_tab(page)
    create_rule(page)
    check(f"{tag}: a new rule has no Delete button", page.locator("[data-testid=rule-delete]").count() == 0)
    page.locator("[data-testid=back-to-rules]").click()
    page.locator("[data-testid=saved-rule]").first.click()
    page.wait_for_selector("[data-testid=rule-delete]", timeout=10000)
    page.locator("[data-testid=rule-delete]").click()
    page.wait_for_selector("[data-testid=rule-delete-ask]", timeout=5000)
    wt = page.locator("[data-testid=rule-delete-warn]").inner_text()
    check(f"{tag}: the warning says its saved result and the answers saved with it are deleted too", "also deletes its 1 saved result and the Ask AI answers saved with it" in wt, wt)
    check(f"{tag}: it offers Download report and Download CSV", page.locator("[data-testid=dialog-dl-report]").inner_text().strip() == "Download report" and page.locator("[data-testid=dialog-dl-csv]").inner_text().strip() == "Download CSV")
    page.locator("[data-testid=rule-delete-keep]").click()
    check(f"{tag}: Keep it closes the warning and deletes nothing", page.locator("[data-testid=rule-delete-ask]").count() == 0 and not [c for c in mock.calls if c[0] == "DELETE"])
    page.locator("[data-testid=rule-delete]").click()
    page.locator("[data-testid=rule-delete-confirm]").click()
    page.wait_for_selector("[data-testid=create-new-rule]", timeout=10000)
    check(f"{tag}: Delete the rule and its results sends the delete and returns to the list", [c for c in mock.calls if c[0] == "DELETE" and c[1] == "/my-screens/s1"] != [])
    ctx.close()


def limit_flow(br, width, theme):
    """Saving at the plan limit: Basic (2 results here) warns with the date of the oldest, offers Download report / CSV, Delete a different result, Save and remove the oldest, Cancel;
    over the limit after a downgrade nothing is saved or deleted."""
    tag = f"[{theme} {width}] limits"
    runs = [{"id": "r1", "run_date": "2026-11-19", "count": 9, "as_of": "2026-11-18", "earlier_values": False, "answers": 0, "params": {"roe_min": 15}, "added": 1, "dropped": 0, "since": "2026-11-10"},
            {"id": "r0", "run_date": "2026-11-10", "count": 8, "as_of": "2026-11-09", "earlier_values": False, "answers": 0, "params": {"roe_min": 15}, "added": None, "dropped": None, "since": None}]
    mock = Mock(tier="basic", limit=10, run_limit=2, runs=[dict(x) for x in runs])
    ctx, page = new_page(br, width, theme, mock, "basic")
    to_rules_tab(page)
    page.locator("[data-testid=saved-rule]").first.click()
    page.wait_for_selector("[data-testid=section-create]", timeout=10000)
    open_step(page, 2)
    page.fill("input#rule-roe", "20")
    back_to_steps(page)
    result_button(page).click()
    page.wait_for_selector("[data-testid=ladder-card]", timeout=40000)
    page.locator("[data-testid=save-result-button]").click()
    page.wait_for_selector("[data-testid=run-drop-ask]", timeout=20000)
    wt = page.locator("[data-testid=run-drop-text]").inner_text()
    check(f"{tag}: at the limit the warning names the result that will be removed by date and says its Ask AI answers go with it", "removes the oldest result (10 Nov 2026) and the Ask AI answers saved with it" in wt, wt)
    check(f"{tag}: buttons: Download report, Download CSV, Delete a different result, Save and remove the oldest, Cancel", [page.locator(f"[data-testid={t}]").inner_text().strip() for t in ("dialog-dl-report", "dialog-dl-csv", "run-drop-other", "run-drop-confirm")]
          == ["Download report", "Download CSV", "Delete a different result", "Save and remove the oldest"] and page.locator("[data-testid=run-drop-cancel]").count() == 1)
    page.locator("[data-testid=dialog-dl-report]").scroll_into_view_if_needed()
    with page.expect_download(timeout=15000) as dl:
        page.locator("[data-testid=dialog-dl-report]").click()
    rep = [u for u in mock.urls if "/report.pdf" in u]
    check(f"{tag}: Download report in the warning downloads the result that would be removed (r0)", dl.value.suggested_filename.endswith(".pdf") and len(rep) == 1 and "/runs/r0/" in rep[0], str(rep))
    page.locator("[data-testid=run-drop-cancel]").click()
    check(f"{tag}: Cancel keeps both results", page.locator("[data-testid=run-drop-ask]").count() == 0 and len(mock.runs) == 2)
    page.locator("[data-testid=save-result-button]").click()
    page.wait_for_selector("[data-testid=run-drop-other]", timeout=10000)
    page.locator("[data-testid=run-drop-other]").click()
    page.wait_for_selector("[data-testid=run-drop-choose]", timeout=10000)
    check(f"{tag}: Delete a different result lists the saved results by date", page.locator("[data-testid=run-drop-delete-one]").count() == 2)
    page.locator("[data-testid=run-drop-delete-one]").first.click()
    page.wait_for_selector("[data-testid=run-saved-note]", timeout=15000)
    check(f"{tag}: deleting the chosen result then saves the new one (no oldest removed)", sorted(x["id"] for x in mock.runs)[0] == "r0" and any(x["id"] == "r2" for x in mock.runs) and not any(x["id"] == "r1" for x in mock.runs) and len(mock.runs) == 2, str([x["id"] for x in mock.runs]))
    ctx.close()
    # downgraded: more results than the plan keeps
    many = [dict(runs[0], id=f"r{i}", run_date=f"2026-11-{10 + i}") for i in range(3)]
    mock = Mock(tier="free", limit=1, run_limit=1, runs=many)
    ctx, page = new_page(br, width, theme, mock, "free")
    to_rules_tab(page)
    page.locator("[data-testid=saved-rule]").first.click()
    page.wait_for_selector("[data-testid=section-create]", timeout=10000)
    open_step(page, 2)
    page.fill("input#rule-roe", "20")
    back_to_steps(page)
    result_button(page).click()
    page.wait_for_selector("[data-testid=ladder-card]", timeout=40000)
    page.locator("[data-testid=save-result-button]").click()
    page.wait_for_selector("[data-testid=run-saved-note]", timeout=15000)
    check(f"{tag}: over the limit after a downgrade: the new save is blocked in plain words and nothing is deleted", "Delete some results to save a new one. Nothing was removed." in page.locator("[data-testid=run-saved-note]").inner_text() and len(mock.runs) == 3 and page.locator("[data-testid=run-drop-ask]").count() == 0)
    page.wait_for_selector("[data-testid=saved-results-over]", timeout=15000)
    check(f"{tag}: all the saved results stay listed and viewable, with a line that says so", page.locator("[data-testid=saved-result]").count() == 3 and "open and download them all" in page.locator("[data-testid=saved-results-over]").inner_text())
    ctx.close()


def tick_cards(page, n):
    boxes = page.locator("[data-testid=ladder-select] input[type=checkbox]")
    for i in range(n):
        boxes.nth(i).click()
    page.wait_for_timeout(300)
    return page.evaluate("Array.from(document.querySelectorAll('[data-testid=ladder-select] input:checked')).map(i => i.getAttribute('aria-label').replace('Select ', '').replace(' for Ask AI', ''))")


def tick_result(page, n):
    boxes = page.locator("[data-testid=saved-result-stocks] input[type=checkbox]")
    for i in range(n):
        boxes.nth(i).click()
    page.wait_for_timeout(300)
    return page.evaluate("Array.from(document.querySelectorAll('[data-testid=saved-result-stocks] input[type=checkbox]:checked')).map(i => i.getAttribute('aria-label').replace('Select ', ''))")


def open_rule_and_tick(page, n):
    """Open the saved rule, View stocks (its newest saved result opens by itself), tick n stocks in that result."""
    to_rules_tab(page)
    page.wait_for_selector("[data-testid=saved-list]", timeout=20000)
    page.locator("[data-testid=saved-rule]").first.click()
    page.wait_for_selector("[data-testid=rule-result-button]", timeout=10000)
    page.wait_for_selector("[data-testid=earlier-values-line]", timeout=10000)
    result_button(page).click()
    page.wait_for_selector("[data-testid=saved-result-stocks] input[type=checkbox]", timeout=20000)
    return tick_result(page, n)


def group_ask(br, width, theme, tier):
    """Ask AI with 2 to 8 stocks: one question for every stock, shown as one reply; the number of questions is shown first; fewer stocks are offered when there are not enough."""
    tag = f"[{theme} {width}] {tier} group ask"
    mock = Mock(tier=tier, limit=1 if tier == "free" else 10, daily_used=(1 if tier == "free" else 4))
    ctx, page = new_page(br, width, theme, mock, tier)
    ticked = open_rule_and_tick(page, 3)
    mock.fail = {ticked[1]}
    page.locator("[data-testid=saved-result-stocks] [data-testid=ask-ai-button]").click()
    page.wait_for_selector("[data-testid=ask-stock-group]", timeout=20000)
    grp = page.locator("[data-testid=ask-stock-group]").inner_text()
    check(f"{tag}: the panel lists the stocks and the five questions say 'for all 3 stocks'", all(f"for all 3 stocks" in page.locator(f"[data-testid=ask-group-q-{k}]").inner_text() for k in ("points", "financials", "holders", "management", "price")) and ticked[0] in grp)
    check(f"{tag}: the 'asked one stock at a time' line is gone, no repeated One company labels", "one stock at a time" not in grp and "One company" not in grp and "Each question is asked for every stock" in grp)
    check(f"{tag}: the sample question text does not name only the first stock", ticked[0] not in page.locator("[data-testid=ask-group-q-holders]").inner_text())
    page.locator("[data-testid=ask-group-q-holders]").click()
    page.wait_for_selector("[data-testid=ask-group-confirm]", timeout=10000)
    left = 2 if tier == "free" else 6
    uses = page.locator("[data-testid=ask-group-uses]").inner_text()
    check(f"{tag}: before it runs: 'This will use 3 questions. You have {left} left.'", uses == f"This will use 3 questions. You have {left} left.", uses)
    check(f"{tag}: nothing was sent before the confirmation", not getattr(mock, "asked", []))
    if tier == "free":
        ne = page.locator("[data-testid=ask-group-notenough]").inner_text()
        check(f"{tag}: Free (3 live questions a day, 1 used): blocked with a clear message and an offer to run fewer", ne == "You have 2 left, which is not enough for all 3 stocks." and page.locator("[data-testid=ask-group-run]").count() == 0
              and page.locator("[data-testid=ask-group-fewer]").inner_text().strip() == "Run for the first 2 stocks", ne)
        page.locator("[data-testid=ask-group-fewer]").click()
    else:
        check(f"{tag}: enough questions: a Run it button, no block", page.locator("[data-testid=ask-group-run]").count() == 1 and page.locator("[data-testid=ask-group-notenough]").count() == 0)
        page.locator("[data-testid=ask-group-run]").click()
    page.wait_for_selector("[data-testid=ask-group-reply]", timeout=30000)
    asked = [a[0] for a in mock.asked]
    reply = page.locator("[data-testid=ask-group-reply]")
    if tier == "free":
        check(f"{tag}: only the first 2 stocks were asked, in the order selected", asked == ticked[:2], str(asked))
        check(f"{tag}: one reply, stock by stock; the stock that failed is named and not charged", reply.locator(f"[data-testid=ask-group-part-{ticked[0]}]").count() == 1 and f"{ticked[1]} could not be answered" in reply.inner_text() and "not charged" in reply.inner_text(), reply.inner_text()[:200])
    else:
        check(f"{tag}: every stock was asked once, in the order selected", asked == ticked, str(asked))
        check(f"{tag}: the same question for every stock, each naming its own stock", all(q and sym in q for sym, q in mock.asked) and all("promoter, insider" in q for _, q in mock.asked), str(mock.asked))
        parts = [t.get_attribute("data-testid") for t in reply.locator("[data-testid^=ask-group-part-]").all()]
        check(f"{tag}: one reply, stock by stock in the order selected (first and third; the second failed)", parts == [f"ask-group-part-{ticked[0]}", f"ask-group-part-{ticked[2]}"], str(parts))
        check(f"{tag}: the stock that failed is named, with 'not charged'", f"{ticked[1]} could not be answered. It was not charged." in reply.inner_text(), reply.inner_text()[:200])
    check(f"{tag}: one small 'Not investment advice' line under the reply", page.locator("[data-testid=ask-not-advice]").count() >= 1)
    check(f"{tag}: each stock's answer is its own separate block", reply.locator("[data-testid^=ask-group-part-]").count() == (1 if tier == "free" else 2))
    if tier == "pro":
        page.wait_for_selector("[data-testid=ask-group-saved]", timeout=10000)
        check(f"{tag}: the answers are attached to the result the stocks were ticked in, with the note 'Saved to your result'", page.locator("[data-testid=ask-group-saved]").inner_text().strip() == "Saved to your result"
              and len(mock.answers_saved) == 2 and all(a[0] == "/my-screens/s1/answers" and a[1].get("symbol") in ticked and a[1].get("run_id") == "r1" and a[1].get("conversation_id") == f"c_{a[1]['symbol']}" for a in mock.answers_saved), str(mock.answers_saved))
        check(f"{tag}: no 'Save result with answers' button when they were saved", page.locator("[data-testid=ask-group-save]").count() == 0)
        page.wait_for_function("Array.from(document.querySelectorAll('[data-testid=stock-ask-status]')).filter(e => e.textContent.trim() === '1 of 5 answered').length === 2", timeout=20000)
        sts = {a: t.strip() for a, t in zip(ticked, [page.locator("[data-testid=stock-ask-status]").nth(i).inner_text() for i in range(3)])}
        check(f"{tag}: each stock row shows its Ask AI status: '1 of 5 answered' for the two answered stocks, 'Not asked' for the one that failed", sorted(page.locator("[data-testid=stock-ask-status]").all_inner_texts()[:3]) == ["1 of 5 answered", "1 of 5 answered", "Not asked"], str(sts))
        check(f"{tag}: the 'Ask AI answers (N)' count follows: 2", "Ask AI answers (2)" in page.locator("[data-testid=saved-result-answers]").inner_text(), page.locator("[data-testid=saved-result-answers]").inner_text()[:60])
        # the same question again: answered stocks are skipped, not charged; Ask again is a choice
        page.locator("[data-testid=ask-group-q-holders]").click()
        page.wait_for_selector("[data-testid=ask-group-skipped]", timeout=10000)
        page.wait_for_function("document.querySelector('[data-testid=ask-group-uses]') && document.querySelector('[data-testid=ask-group-uses]').textContent === 'This will use 1 question. You have 4 left.'", timeout=10000)
        check(f"{tag}: the same question again: the two answered stocks are not asked again and not charged; only the one without an answer counts", "not asked again and not charged" in page.locator("[data-testid=ask-group-skipped]").inner_text()
              and page.locator("[data-testid=ask-group-uses]").inner_text() == "This will use 1 question. You have 4 left.")
        page.locator("[data-testid=ask-group-again] input").check()
        page.wait_for_function("document.querySelector('[data-testid=ask-group-uses]') && document.querySelector('[data-testid=ask-group-uses]').textContent === 'This will use 3 questions. You have 4 left.'", timeout=10000)
        check(f"{tag}: 'Ask again' (charged) counts all 3 stocks", page.locator("[data-testid=ask-group-uses]").inner_text() == "This will use 3 questions. You have 4 left.")
        page.locator("[data-testid=ask-group-cancel]").click()
    else:
        page.wait_for_selector("[data-testid=ask-group-saved]", timeout=10000)
        check(f"{tag}: the rule already has a saved result (its latest one), so the one answer given is attached to it: 'Saved to your result'", page.locator("[data-testid=ask-group-saved]").inner_text().strip() == "Saved to your result"
              and len(mock.answers_saved) == 1 and mock.answers_saved[0][0] == "/my-screens/s1/answers" and page.locator("[data-testid=ask-group-save]").count() == 0, str(mock.answers_saved))
    check(f"{tag}: no horizontal scroll with the reply", overflow(page) <= 0, str(overflow(page)))
    ctx.close()
    if tier != "pro":
        return
    # 8 stocks with 6 questions left: blocked, fewer offered
    mock = Mock(tier=tier, limit=10)
    ctx, page = new_page(br, width, theme, mock, tier)
    ticked8 = open_rule_and_tick(page, 8)
    page.locator("[data-testid=saved-result-stocks] [data-testid=ask-ai-button]").click()
    page.wait_for_selector("[data-testid=ask-stock-group]", timeout=20000)
    page.locator("[data-testid=ask-group-q-points]").click()
    page.wait_for_selector("[data-testid=ask-group-confirm]", timeout=10000)
    check(f"{tag}: 8 stocks, 6 left: 'This will use 8 questions. You have 6 left.' and a clear block", page.locator("[data-testid=ask-group-uses]").inner_text() == "This will use 8 questions. You have 6 left."
          and page.locator("[data-testid=ask-group-notenough]").inner_text() == "You have 6 left, which is not enough for all 8 stocks." and page.locator("[data-testid=ask-group-run]").count() == 0)
    page.locator("[data-testid=ask-group-fewer]").click()
    page.wait_for_selector("[data-testid=ask-group-reply]", timeout=40000)
    check(f"{tag}: it ran for the first 6 only", [a[0] for a in mock.asked] == ticked8[:6], str([a[0] for a in mock.asked]))
    page.wait_for_timeout(300)
    ctx.close()
    # a typed question with 2 stocks behaves the same, and Cancel sends nothing
    mock = Mock(tier=tier, limit=10)
    ctx, page = new_page(br, width, theme, mock, tier)
    open_rule_and_tick(page, 2)
    page.locator("[data-testid=saved-result-stocks] [data-testid=ask-ai-button]").click()
    page.wait_for_selector("[data-testid=ask-stock-group]", timeout=20000)
    inp = page.locator('input[placeholder="Ask about a stock, a sector, or up to 8 stocks"]')
    inp.fill("What does the company make?")
    inp.press("Enter")
    page.wait_for_selector("[data-testid=ask-group-confirm]", timeout=10000)
    check(f"{tag}: a typed question with 2 stocks shows 'This will use 2 questions. You have 6 left.' first", page.locator("[data-testid=ask-group-uses]").inner_text() == "This will use 2 questions. You have 6 left.")
    page.locator("[data-testid=ask-group-cancel]").click()
    page.wait_for_timeout(300)
    check(f"{tag}: Cancel sends nothing", not getattr(mock, "asked", []) and page.locator("[data-testid=ask-group-confirm]").count() == 0)
    ctx.close()


def save_result_flow(br, width, theme, tier):
    """Save this result: on the results of any run, also for a rule that is not saved yet (asks for a name); the report button sits next to it."""
    tag = f"[{theme} {width}] {tier} save result"
    mock = Mock(tier=tier, limit=1 if tier == "free" else 10, saved=(tier == "free"))
    ctx, page = new_page(br, width, theme, mock, tier)
    to_rules_tab(page)
    create_rule(page)
    light_rule(page)
    result_button(page).click()
    page.wait_for_selector("[data-testid=ladder-card]", timeout=40000)
    btn = page.locator("[data-testid=save-result-button]")
    check(f"{tag}: a clear 'Save this result' button on the results of a rule that is not saved yet", btn.count() == 1 and btn.inner_text().strip() == "Save this result")
    btn.click()
    page.wait_for_selector("[data-testid=save-result-form]", timeout=5000)
    page.locator("[data-testid=save-result-confirm]").click()
    check(f"{tag}: it asks for a rule name", "Give the rule a name first." in page.locator("[data-testid=save-result-msg]").inner_text())
    page.fill("[data-testid=save-result-name]", "Quality check")
    page.locator("[data-testid=save-result-confirm]").click()
    page.wait_for_selector("[data-testid=save-result-msg]", timeout=10000)
    page.wait_for_timeout(500)
    msg = page.locator("[data-testid=save-result-msg]").inner_text()
    if tier == "free":
        check(f"{tag}: Free already has 1 saved rule: asked to delete or update it, nothing saved", "Delete the saved rule, or update it with Save" in msg and len(mock.screens) == 1, msg)
    else:
        check(f"{tag}: confirmation: the rule and the result are saved together", msg.startswith('Saved the rule "Quality check" and its result (10 stocks).'), msg)
        page.wait_for_selector("[data-testid=saved-result]", timeout=10000)
        check(f"{tag}: the saved rule appears in the Results groups and its saved result is listed", page.locator("[data-testid=results-group]").count() == 1 and page.locator("[data-testid=saved-result]").count() >= 1 and "22 Nov 2026" in page.locator("[data-testid=saved-result]").first.inner_text())
        pdf = page.locator("[data-testid=save-result-block] [data-testid=saved-result-pdf]")
        check(f"{tag}: Download report (PDF) sits right next to the saved result", pdf.count() == 1 and pdf.inner_text().strip() == "Download full report" and pdf.is_visible(), str(pdf.count()))
        pdf.scroll_into_view_if_needed()
        with page.expect_download(timeout=15000) as dl:
            pdf.click()
        check(f"{tag}: the report downloads", dl.value.suggested_filename.endswith(".pdf"))
        box = pdf.bounding_box()
        check(f"{tag}: the report button is inside the screen (no sideways scroll)", box is not None and box["x"] >= 0 and box["x"] + box["width"] <= width + 1 and overflow(page) <= 0, str(box))
    ctx.close()
    if tier == "pro":
        # Free with no saved rule sees the stored sample next to the saved result, not a real report
        mock = Mock(tier="free", limit=1, saved=False)
        ctx, page = new_page(br, width, theme, mock, "free")
        to_rules_tab(page)
        create_rule(page)
        light_rule(page)
        result_button(page).click()
        page.wait_for_selector("[data-testid=ladder-card]", timeout=40000)
        page.locator("[data-testid=save-result-button]").click()
        page.fill("[data-testid=save-result-name]", "Free rule")
        page.locator("[data-testid=save-result-confirm]").click()
        page.wait_for_selector("[data-testid=save-result-block] [data-testid=saved-result-sample]", timeout=10000)
        check(f"[{theme} {width}] free save result: a Free account keeps the stored sample report (no real download)", page.locator("[data-testid=save-result-block] [data-testid=saved-result-pdf]").count() == 0)
        ctx.close()


def group_save_flow(br, width, theme):
    """A rule that is not saved yet: Ask AI for 3 stocks, then one button 'Save result with answers' (asks for a rule name, saves the rule, its result and the answers)."""
    tag = f"[{theme} {width}] pro group save"
    mock = Mock(tier="pro", limit=10, saved=False)
    ctx, page = new_page(br, width, theme, mock, "pro")
    to_rules_tab(page)
    create_rule(page)
    light_rule(page)
    result_button(page).click()
    page.wait_for_selector("[data-testid=ladder-card]", timeout=40000)
    ticked = tick_cards(page, 3)
    page.locator("[data-testid=ladder-results] [data-testid=ask-ai-button]").click()
    page.wait_for_selector("[data-testid=ask-stock-group]", timeout=20000)
    page.locator("[data-testid=ask-group-q-points]").click()
    page.wait_for_selector("[data-testid=ask-group-confirm]", timeout=10000)
    page.locator("[data-testid=ask-group-run]").click()
    page.wait_for_selector("[data-testid=ask-group-save]", timeout=30000)
    check(f"{tag}: no saved rule or result: one button 'Save result with answers' under the answers, with a rule name box", page.locator("[data-testid=ask-group-save]").inner_text().strip() == "Save result with answers"
          and page.locator("[data-testid=ask-group-save-name]").count() == 1 and page.locator("[data-testid=ask-group-saved]").count() == 0)
    check(f"{tag}: each of the 3 stocks has its own answer block", page.locator("[data-testid^=ask-group-part-]").count() == 3)
    page.locator("[data-testid=ask-group-save]").click()
    page.wait_for_selector("[data-testid=ask-group-save-failed]", timeout=10000)
    check(f"{tag}: without a name nothing is saved and the person is told", "could not be saved" in page.locator("[data-testid=ask-group-save-failed]").inner_text() and not mock.answers_saved)
    page.fill("[data-testid=ask-group-save-name]", "Growers")
    page.locator("[data-testid=ask-group-save]").click()
    page.wait_for_selector("[data-testid=ask-group-saved]", timeout=15000)
    wr = [c for c in mock.calls if c[0] == "POST" and c[1] == "/my-screens/with-result"]
    check(f"{tag}: the rule and its result were saved together, then the 3 answers were attached; note 'Saved to your result'", len(wr) == 1 and wr[0][2]["name"] == "Growers" and len(mock.answers_saved) == 3
          and page.locator("[data-testid=ask-group-saved]").inner_text().strip() == "Saved to your result" and {a[1]["run_id"] for a in mock.answers_saved} == {"r9"} and all(a[0] == "/my-screens/s9/answers" for a in mock.answers_saved), str(mock.answers_saved))
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
            group_ask(br, width, theme, "pro")
            group_ask(br, width, theme, "free")
            save_result_flow(br, width, theme, "pro")
            save_result_flow(br, width, theme, "free")
            group_save_flow(br, width, theme)
            delete_rule_flow(br, width, theme, "pro")
            delete_rule_flow(br, width, theme, "free")
            limit_flow(br, width, theme)
            account_page(br, width, theme)
            other_tab_pages(br, width, theme)
    br.close()

print(f"\n{sum(RESULTS)}/{len(RESULTS)} checks passed")
sys.exit(0 if all(RESULTS) else 1)
