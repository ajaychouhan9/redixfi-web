"""Browser checks for Stock Check release 1 (20 Nov 2026): real page, real figures file and real shortlist from a staged API on production data;
logged-in-only endpoints (saved rules, full check, Ask history) are answered by a mock so the logged-in screens can be exercised without a real account.

  python scripts/browser-rules-r1.py <site url> [shots dir]
Widths 360 and 414, themes light / dark / slate. Prints one line per check and a count. Needs: pip install playwright (chromium installed).
"""
import base64
import json
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

SITE = sys.argv[1].rstrip("/")
SHOTS = Path(sys.argv[2]) if len(sys.argv) > 2 else None
API = "https://api.redixfi.com/api/v1"
if SHOTS:
    SHOTS.mkdir(parents=True, exist_ok=True)
RESULTS = []


def check(name, ok, extra=""):
    RESULTS.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{extra}]" if extra and not ok else ""))


def jwt():
    def b(d):
        return base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b"=").decode()
    return f"{b({'alg': 'none'})}.{b({'exp': int(time.time()) + 86400 * 30, 'sub': 'u_test'})}.x"


USER = {"user_id": "u_test", "phone": None, "email": "t@example.com", "name": "Test", "tier": "pro", "plan_display_name": "Pro", "is_pro_trial": False,
        "pro_trial_started_at": None, "pro_trial_ends_at": None, "tnc_accepted_at": "2026-11-11T00:00:00Z", "terms_accepted": True}
AUTH = {"access_token": jwt(), "refresh_token": "r", "user": USER}
RULE_PARAMS = {"market_cap_min": 500, "eps_positive": True, "growth_up_3y": True, "roe_min": 15}


def env(data, **kw):
    return {"meta": {"as_of": None}, "data": data, **kw}


class Mock:
    """State of the fake logged-in account."""

    def __init__(self, tier="pro", limit=5):
        self.tier, self.limit = tier, limit
        self.screens = [
            {"id": "s1", "name": "My growers", "params": RULE_PARAMS, "created_at": "2026-11-18T10:00:00Z", "last_viewed_at": None, "updated_at": "2026-11-19T10:00:00Z",
             "stock_count": 52, "counted_at": "2026-11-19T10:00:00Z", "snapshot": {"at": "2026-11-19T10:00:00Z", "as_of": "2026-11-18", "count": 3}},
            {"id": "s2", "name": "Low debt", "params": {"de_max": 0.5}, "created_at": "2026-11-17T10:00:00Z", "last_viewed_at": None, "updated_at": None,
             "stock_count": None, "counted_at": None, "snapshot": None},
        ]
        self.calls = []

    def handle(self, route):
        req = route.request
        url = req.url
        path = url.split("/api/v1", 1)[1].split("?")[0]
        m = req.method
        body = None
        try:
            body = req.post_data_json
        except Exception:
            body = None
        self.calls.append((m, path, body))
        j = lambda data, status=200, **kw: route.fulfill(status=status, content_type="application/json", body=json.dumps(env(data, **kw)))
        if path in ("/signals", "/ladder-data"):
            r = route.fetch(headers={k: v for k, v in req.headers.items() if k.lower() != "authorization"})
            return route.fulfill(response=r)
        if path == "/me":
            return j({**USER, "tier": self.tier})
        if path == "/usage":
            return j({"research_views_remaining": 0, "unlimited": True, "ask_redixfi": {"tier": self.tier, "is_pro_trial": False, "daily_limit_per_symbol": None,
                      "daily_used": 0, "daily_limit": 100, "monthly_used": 0, "monthly_limit": 500, "topup_questions_remaining": 0}})
        if path == "/my-screens" and m == "GET":
            return j({"screens": self.screens, "limit": self.limit, "count": len(self.screens)})
        if path == "/my-screens" and m == "POST":
            if len(self.screens) >= self.limit:
                return route.fulfill(status=403, content_type="application/json", body=json.dumps({"detail": "Your plan keeps up to 5 saved screens. Delete one or choose a larger plan."}))
            s = {"id": f"s{len(self.screens) + 1}", "name": body["name"], "params": body["params"], "created_at": "2026-11-20T10:00:00Z", "last_viewed_at": None,
                 "updated_at": "2026-11-20T10:00:00Z", "stock_count": body.get("stock_count"), "counted_at": "2026-11-20T10:00:00Z",
                 "snapshot": {"at": "2026-11-20T10:00:00Z", "as_of": body.get("snapshot_as_of"), "count": len(body["snapshot_symbols"])} if body.get("snapshot_symbols") else None}
            self.screens.append(s)
            return j(s)
        if path.startswith("/my-screens/") and path.endswith("/snapshot"):
            return j({"snapshot": {"at": "2026-11-19T10:00:00Z", "as_of": "2026-11-18", "count": 3,
                                   "stocks": [{"symbol": "TCS", "company_name": "Tata Consultancy"}, {"symbol": "INFY", "company_name": "Infosys"}, {"symbol": "ZZZZ", "company_name": "Gone Ltd"}]}})
        if path.startswith("/my-screens/") and m == "PUT":
            sid = path.rsplit("/", 1)[1]
            for s in self.screens:
                if s["id"] == sid:
                    s.update({"params": body["params"], "name": body.get("name") or s["name"], "stock_count": body.get("stock_count"), "updated_at": "2026-11-20T10:00:00Z"})
                    return j(s)
        if path.startswith("/my-screens/") and m == "DELETE":
            sid = path.rsplit("/", 1)[1]
            self.screens = [s for s in self.screens if s["id"] != sid]
            return j({"deleted": True})
        if path == "/fullcheck/estimate":
            syms = body["symbols"]
            locked = self.tier == "free"
            return j({"items": [{"symbol": s, "cost": 3, "cached": False, "reason": "needs documents"} for s in syms], "total": 3 * len(syms), "max_companies": 10,
                      "locked": locked, "locked_message": "Full check is on Basic and Pro. Free accounts can read the stored sample at /stock-check." if locked else None})
        if path == "/fullcheck/runs" and m == "POST":
            return j({"run": {"id": "run1", "status": "queued", "items": [], "total_cost": 0, "progress_pct": 0, "done": 0, "total": 0, "created_at": None, "footer": ""}, "charged": 0})
        if path == "/fullcheck/runs":
            return j({"runs": []})
        if path.startswith("/ask/suggestions"):
            return j({"suggestions": [], "has_concall": False})
        if path.startswith("/ask/history") or path.startswith("/ask/conversations"):
            return j({"conversation": None, "conversations": []})
        if path.startswith("/watchlist"):
            return j({"symbols": []})
        return j({})


def overflow(page):
    return page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")


def set_theme(ctx_page, theme):
    ctx_page.add_init_script(f"try{{localStorage.setItem('redixfi:theme','{theme}')}}catch(e){{}}")


def run_logged_out(pw, theme, width):
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={"width": width, "height": 800}, device_scale_factor=1)
    page = ctx.new_page()
    set_theme(page, theme)
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    tag = f"[{theme} {width}] logged-out"
    page.goto(f"{SITE}/shortlist-lab#my-rules", wait_until="networkidle")
    page.wait_for_selector('[data-testid="ladder-left"]')
    page.wait_for_function("document.querySelector('[data-testid=ladder-left]').textContent.includes('left')", timeout=20000)
    check(f"{tag}: page loads, no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
    check(f"{tag}: one My rules card with common rules buttons", page.locator('[data-testid="my-rules"]').count() == 1 and page.locator('[data-testid="ladder-common"]').count() == 1)
    check(f"{tag}: no second Save my rules section, no Step 6", page.locator('[data-testid="save-rules"]').count() == 0 and page.locator('[data-testid="ladder-step-6"]').count() == 0)
    check(f"{tag}: logged-out My rules says to sign up", "Sign up free" in page.locator('[data-testid="my-rules"]').inner_text())
    total0 = int(page.locator('[data-testid="ladder-left"]').inner_text().split()[0].replace(",", ""))
    page.locator('[data-testid="ladder-step-1"] button').first.click()
    page.wait_for_selector('[data-testid="rule-growthUp"]')
    label = page.locator('[data-testid="rule-growthUp"]').inner_text()
    check(f"{tag}: growth checkbox text", "Sales and profit both higher than the year before, 3 years in a row." in label and "rupee figures" in label, label[:80])
    page.locator('[data-testid="rule-growthUp"] input').check()
    page.wait_for_function(f"!document.querySelector('[data-testid=ladder-left]').textContent.startsWith('{total0:,}')", timeout=10000)
    left = int(page.locator('[data-testid="ladder-left"]').inner_text().split()[0].replace(",", ""))
    gap = page.locator('[data-testid="growth-gap"]').inner_text() if page.locator('[data-testid="growth-gap"]').count() else ""
    check(f"{tag}: live count with the checkbox = 491 (production figures)", left == 491, f"{left}")
    check(f"{tag}: note with the count of stocks left out", "103 stocks have fewer than 4 years of annual figures and are left out of this rule" in gap, gap)
    page.locator('[data-testid="ladder-bar-show"]').click()
    page.wait_for_selector('[data-testid="ladder-total"]')
    page.wait_for_selector('[data-testid="ladder-card"]')
    tot = page.locator('[data-testid="ladder-total"]').inner_text()
    check(f"{tag}: list total = live count (shortlist = 491)", tot.startswith("491 stocks meet"), tot)
    check(f"{tag}: list shows the growth row on cards", "Sales and profit higher 3 years in a row" in page.locator('[data-testid="ladder-card"]').first.inner_text())
    check(f"{tag}: no Showing rule line for unsaved rules", page.locator('[data-testid="showing-rule"]').count() == 0)
    ra = page.locator('[data-testid="rules-applied"]')
    check(f"{tag}: rules applied card, collapsed, with count", ra.count() == 1 and "Rules applied (1)" in ra.inner_text())
    ra.locator("button").click()
    check(f"{tag}: rules applied opens and lists the rule", "Sales and profit both higher" in page.locator('[data-testid="rules-applied-list"]').inner_text())
    check(f"{tag}: gap note under the list", page.locator('[data-testid="ladder-growth-no-figure"]').count() == 1 and "103 stocks" in page.locator('[data-testid="ladder-growth-no-figure"]').inner_text())
    check(f"{tag}: logged out: no tick boxes; stored sample under Ask AI about these stocks", page.locator('[data-testid="ladder-select"]').count() == 0 and page.locator('[data-testid="ask-about"]').count() == 1 and "Sample" in page.locator('[data-testid="ask-about"]').inner_text())
    check(f"{tag}: no horizontal scroll after the list", overflow(page) <= 0, str(overflow(page)))
    if SHOTS:
        page.screenshot(path=str(SHOTS / f"out_{theme}_{width}.png"), full_page=False)
    check(f"{tag}: no page errors", not errs, "; ".join(errs)[:200])
    br.close()


def run_logged_in(pw, theme, width, tier="pro"):
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={"width": width, "height": 800}, device_scale_factor=1)
    page = ctx.new_page()
    set_theme(page, theme)
    page.add_init_script(f"try{{localStorage.setItem('redixfi:auth', {json.dumps(json.dumps(AUTH))})}}catch(e){{}}")
    mock = Mock(tier=tier, limit=5)
    page.route("**/api/v1/**", mock.handle)
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    tag = f"[{theme} {width}] {tier}"
    page.goto(f"{SITE}/shortlist-lab#my-rules", wait_until="networkidle")
    page.wait_for_selector('[data-testid="saved-list"]')
    page.wait_for_function("document.querySelector('[data-testid=ladder-left]').textContent.includes('left')", timeout=20000)
    saved = page.locator('[data-testid="saved-rule"]')
    check(f"{tag}: saved rules listed with name, date and stock count", saved.count() == 2 and "Saved 19 Nov 2026 · 52 stocks when saved" in saved.nth(0).inner_text(), saved.nth(0).inner_text()[:100])
    check(f"{tag}: snapshot line and Run again", "Stock list saved as of 18 Nov 2026: 3 stocks" in saved.nth(0).inner_text() and page.locator('[data-testid="saved-run-again"]').count() == 1)
    check(f"{tag}: buttons Open, Save, Save as new, Delete", page.locator('[data-testid="saved-open"]').count() == 2 and page.locator('[data-testid="save-rules-button"]').count() == 1 and page.locator('[data-testid="save-new-button"]').count() == 1 and page.locator('[data-testid="saved-delete"]').count() == 2)
    check(f"{tag}: plan line", "Your plan keeps" in page.locator('[data-testid="my-rules-plan"]').inner_text())
    check(f"{tag}: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
    # open a rule
    saved.nth(0).locator('[data-testid="saved-open"]').click()
    page.wait_for_selector('[data-testid="showing-rule"]')
    page.wait_for_selector('[data-testid="ladder-card"]')
    check(f"{tag}: Showing rule: My growers", page.locator('[data-testid="showing-rule"]').inner_text() == "Showing rule: My growers")
    ra = page.locator('[data-testid="rules-applied"]')
    ra.locator("button").click()
    lst = page.locator('[data-testid="rules-applied-list"]').inner_text()
    check(f"{tag}: rules applied lists every rule of the opened rule", all(t in lst for t in ["Market value at least 500", "Profit in the latest quarter", "higher than the year before", "Return on equity at least 15"]), lst)
    # change the rules then Save: ask once
    page.locator('[data-testid="ladder-step-2"] button').first.click()
    page.locator('#rule-roe').fill("20")
    page.wait_for_selector('text=(changed, not saved)')
    page.locator('[data-testid="save-rules-button"]').click()
    page.wait_for_selector('[data-testid="replace-ask"]')
    ask = page.locator('[data-testid="replace-ask"]').inner_text()
    check(f"{tag}: ask once after changing an opened rule", "Replace the old rule" in ask and "Save as a new rule" in ask, ask)
    page.locator('[data-testid="replace-old"]').click()
    page.wait_for_selector('[data-testid="save-rules-msg"]')
    put = [c for c in mock.calls if c[0] == "PUT"]
    check(f"{tag}: Replace the old rule sends a replace (PUT), not a new rule", len(put) == 1 and put[0][2]["params"].get("roe_min") == 20 and len(mock.screens) == 2, str(put)[:200])
    # change again and save as a new rule
    page.locator('#rule-roe').fill("25")
    page.locator('[data-testid="save-rules-button"]').click()
    page.locator('[data-testid="replace-new"]').click()
    page.wait_for_function("document.querySelectorAll('[data-testid=saved-rule]').length === 3")
    posts = [c for c in mock.calls if c[0] == "POST" and c[1] == "/my-screens"]
    check(f"{tag}: Save as a new rule creates one", len(posts) == 1 and posts[0][2]["name"] != "My growers" and len(mock.screens) == 3, str(posts)[:200])
    # plan limit
    mock.limit = 3
    page.locator('[data-testid="save-name"]').fill("One more")
    page.locator('[data-testid="save-new-button"]').click()
    page.wait_for_selector('[data-testid="save-rules-msg"]')
    check(f"{tag}: plan limit message when full", page.locator('[data-testid="save-rules-msg"]').inner_text().startswith("Your plan keeps up to"), page.locator('[data-testid="save-rules-msg"]').inner_text())
    # save with list
    page.locator('[data-testid="ladder-clear"]').click()
    page.locator('[data-testid="ladder-common"]').click()
    page.locator('[data-testid="save-with-list"]').check()
    mock.limit = 9
    page.locator('[data-testid="save-name"]').fill("Common with list")
    page.locator('[data-testid="save-new-button"]').click()
    page.wait_for_function("document.querySelectorAll('[data-testid=saved-rule]').length === 4", timeout=60000)
    posts = [c for c in mock.calls if c[0] == "POST" and c[1] == "/my-screens"]
    snap = posts[-1][2].get("snapshot_symbols") or []
    check(f"{tag}: saving with the stock list sends every symbol", len(snap) >= 5 and posts[-1][2]["stock_count"] == len(snap), f"{len(snap)}")
    # run again
    page.locator('[data-testid="saved-run-again"]').first.click()
    page.wait_for_selector('[data-testid="run-again-line"]', timeout=60000)
    line = page.locator('[data-testid="run-again-line"]').inner_text()
    check(f"{tag}: Run again compares with the saved list", line.startswith("Compared with the list saved as of 18 Nov 2026:") and "added" in line, line)
    # delete
    n0 = page.locator('[data-testid="saved-rule"]').count()
    page.locator('[data-testid="saved-delete"]').last.click()
    page.locator('[data-testid="saved-delete-confirm"]').click()
    page.wait_for_function(f"document.querySelectorAll('[data-testid=saved-rule]').length === {n0 - 1}")
    check(f"{tag}: delete asks first and removes the rule", True)
    # tick stocks, cap 8, Ask AI
    page.locator('[data-testid="ladder-clear"]').click()
    page.locator('[data-testid="ladder-bar-show"]').click()
    page.wait_for_selector('[data-testid="ladder-card"]')
    boxes = page.locator('[data-testid="ladder-select"] input')
    n = min(boxes.count(), 12)
    for i in range(n):
        boxes.nth(i).evaluate("e => e.scrollIntoView({ block: 'center' })")      # the sticky bar must not be on top of it
        boxes.nth(i).click(force=(i >= 8))
    cnt = page.locator('[data-testid="ask-selected-count"]').inner_text()
    check(f"{tag}: at most 8 can be ticked", cnt.startswith("8 of 8") and page.locator('[data-testid="ask-cap-note"]').count() == 1, cnt)
    check(f"{tag}: Ask AI about these stocks is after the stock list", page.evaluate("""() => { const a = document.querySelector('[data-testid=ladder-cards]'); const b = document.querySelector('[data-testid=ask-about]'); return !!a && !!b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) > 0; }"""))
    if SHOTS:
        page.locator('[data-testid="ask-about"]').scroll_into_view_if_needed()
        page.screenshot(path=str(SHOTS / f"in_ask_{theme}_{width}_{tier}.png"))
    page.locator('[data-testid="ask-all-button"]').click()
    if tier == "free":
        page.wait_for_selector('[data-testid="ask-all-locked"]')
        txt = page.locator('[data-testid="ask-all-locked"]').inner_text()
        check(f"{tag}: Free: Ask all 5 shows the plan message and the stored sample, nothing runs", "Basic and Pro" in txt and "Sample" in txt and not [c for c in mock.calls if c[1] == "/fullcheck/runs" and c[0] == "POST"])
    else:
        page.wait_for_selector('[data-testid="ask-all-confirm"]')
        cost = page.locator('[data-testid="ask-all-cost"]').inner_text()
        check(f"{tag}: Ask all 5 shows the quota it will use before running", "24 questions" in cost and not [c for c in mock.calls if c[1] == "/fullcheck/runs" and c[0] == "POST"], cost)
        page.locator('[data-testid="ask-all-run"]').click()
        page.wait_for_selector('[data-testid="ask-all-started"]')
        check(f"{tag}: confirm starts the run once", len([c for c in mock.calls if c[1] == "/fullcheck/runs" and c[0] == "POST"]) == 1)
        page.locator('[data-testid="ask-ai-button"]').scroll_into_view_if_needed()
        page.locator('[data-testid="ask-ai-button"]').click()
        page.wait_for_selector('[data-testid="ask-stock-group"]')
        grp = page.locator('[data-testid="ask-group-stocks"]').inner_text()
        check(f"{tag}: Ask AI opens a new session with the 8 stocks and 5 questions", page.locator('[data-testid="ask-group-stocks"] li').count() == 8 and page.locator('[data-testid="ask-group-questions"] li').count() == 5, grp)
        page.locator('[data-testid="ask-group-q-price"]').click()
        val = page.locator('input[placeholder^="Ask anything"]').input_value()
        check(f"{tag}: a question is typed in, not sent", val.startswith("Show the last 10 days of price change and delivery % for ") and not [c for c in mock.calls if c[1] == "/ask"], val)
        first = page.locator('[data-testid="ask-group-stocks"] li button').first.inner_text()
        page.locator('[data-testid="ask-group-q-points"]').click()
        val2 = page.locator('input[placeholder^="Ask anything"]').input_value()
        check(f"{tag}: a per-company question names one selected company", val2 == f"List the points to watch for {first}.", val2)
        if SHOTS:
            page.screenshot(path=str(SHOTS / f"in_panel_{theme}_{width}.png"))
    check(f"{tag}: no horizontal scroll at the end", overflow(page) <= 0, str(overflow(page)))
    check(f"{tag}: no page errors", not errs, "; ".join(errs)[:200])
    br.close()


def run_learn_logged_in(pw, theme, width, tier):
    """Shortlist Lab, Learn tab, logged in (21 Nov 2026): one Try button opens a NEW Ask AI session with the sample stock selected; Free sees the 3-a-day line."""
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={"width": width, "height": 800}, device_scale_factor=1)
    page = ctx.new_page()
    set_theme(page, theme)
    page.add_init_script(f"try{{localStorage.setItem('redixfi:auth', {json.dumps(json.dumps(AUTH))})}}catch(e){{}}")
    mock = Mock(tier=tier, limit=5)
    page.route("**/api/v1/**", mock.handle)
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    tag = f"[{theme} {width}] Learn, logged in {tier}"
    page.goto(f"{SITE}/shortlist-lab", wait_until="networkidle")
    page.wait_for_selector('[data-testid="learn-try-button"]')
    check(f"{tag}: no logged-out line", page.locator('[data-testid="learn-try-loggedout"]').count() == 0)
    free_line = page.locator('[data-testid="learn-try-free"]')
    if tier == "free":
        check(f"{tag}: Free sees the 3-a-day line", free_line.count() == 1 and free_line.inner_text() == "With a free account you get 3 live questions a day on any stock.")
    else:
        check(f"{tag}: no Free line for a paid plan", free_line.count() == 0)
    page.click('[data-testid="learn-try-button"]')
    page.wait_for_selector('[data-testid="ask-stock-group"]', timeout=15000)
    stocks = page.locator('[data-testid="ask-group-stocks"] li')
    check(f"{tag}: a new Ask AI session opens with the sample stock selected", stocks.count() == 1 and "HINDUNILVR" in stocks.first.inner_text())
    check(f"{tag}: the 5 questions are offered", page.locator('[data-testid="ask-group-questions"] li').count() == 5)
    check(f"{tag}: the person can remove the sample stock to change it", page.locator('[aria-label="Remove HINDUNILVR"]').count() == 1)
    check(f"{tag}: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
    check(f"{tag}: no page errors", not errs, "; ".join(errs)[:200])
    br.close()


with sync_playwright() as pw:
    for theme in ("light", "dark", "slate"):
        for width in (360, 414):
            run_logged_out(pw, theme, width)
            run_logged_in(pw, theme, width, "pro")
    run_logged_in(pw, "light", 360, "free")
    for th, w, t in (("light", 360, "pro"), ("dark", 414, "pro"), ("slate", 360, "free"), ("light", 414, "free")):
        run_learn_logged_in(pw, th, w, t)
print(f"\n{sum(RESULTS)}/{len(RESULTS)} checks passed")
sys.exit(0 if all(RESULTS) else 1)
