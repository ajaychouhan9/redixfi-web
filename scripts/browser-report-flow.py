"""Browser checks for the 24 Nov 2026 release: a saved rule opens read-only, View stocks (names, search, Show more), Create report (sheet, custom questions, limits, progress),
the Results shelf, plan-limit dialogs, Free upgrade messages and the Account question pools. Real site build, real figures file and real shortlist (live API, read only);
logged-in-only endpoints are answered by a mock so Free / Basic / Pro screens can be exercised without a real account.

  python scripts/browser-report-flow.py <site url> [shots dir]
Env: LAB_WIDTHS (default 360,414,1280), LAB_THEMES (default light,dark,slate), LAB_ONLY (comma list of flow names).
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
WIDTHS = [int(x) for x in os.environ["LAB_WIDTHS"].split(",")] if os.environ.get("LAB_WIDTHS") else [360, 414, 1280]
THEMES = os.environ["LAB_THEMES"].split(",") if os.environ.get("LAB_THEMES") else ["light", "dark", "slate"]
ONLY = [x for x in os.environ.get("LAB_ONLY", "").split(",") if x]
RULE_PARAMS = {"market_cap_min": 500, "roe_min": 15, "de_max": 1}
SYMS = ["TCS", "INFY", "WIPRO", "HCLTECH", "TECHM", "LTIM", "MPHASIS", "COFORGE", "PERSISTENT", "OFSS"]
MANY = [f"S{i:02d}" for i in range(45)]
BANNED = re.compile(r"\b(recommended?|best|strong|standard)\b", re.I)


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


def env(data):
    return {"meta": {"as_of": None}, "data": data}


class Mock:
    def __init__(self, tier="pro", run_limit=None, runs=None, daily_used=0, report_used=0, count=10, rule_limit=10):
        self.tier = tier
        self.run_limit = run_limit if run_limit is not None else {"free": 1, "basic": 10, "pro": 30}[tier]
        self.rule_limit = rule_limit
        self.daily_used, self.report_used = daily_used, report_used
        self.screens = [{"id": "s1", "name": "My growers", "params": RULE_PARAMS, "created_at": "2026-11-18T10:00:00Z", "last_viewed_at": None, "updated_at": "2026-11-19T10:00:00Z",
                         "stock_count": 0, "counted_at": None, "snapshot": None, "answers": 0}]
        self.runs = runs if runs is not None else [{"id": "r1", "run_date": "2026-11-19", "count": count, "as_of": "2026-11-18", "earlier_values": False, "answers": 2, "params": RULE_PARAMS,
                                                    "added": None, "dropped": None, "since": None}]
        self.stocks = SYMS if count <= 10 else MANY[:count]
        self.calls = []
        self.job_polls = 0
        self.report_body = None

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
            if self.tier == "free":
                return j({"research_views_remaining": 0, "unlimited": False, "ask_redixfi": {"tier": "free", "is_pro_trial": False, "daily_limit_per_symbol": None, "daily_used": self.daily_used,
                          "daily_limit": 5, "monthly_used": None, "monthly_limit": None, "topup_questions_remaining": 0}})
            chat, rep = (150, 150) if self.tier == "basic" else (400, 350)
            return j({"research_views_remaining": 0, "unlimited": True, "ask_redixfi": {"tier": self.tier, "is_pro_trial": False, "daily_limit_per_symbol": None, "daily_used": 3,
                      "daily_limit": 10 if self.tier == "basic" else 25, "monthly_used": 40, "monthly_limit": chat, "chat_limit": chat, "chat_used": 40, "report_limit": rep,
                      "report_used": self.report_used, "resets_on": "2026-12-20", "topup_questions_remaining": 25}})
        if path == "/my-screens" and m == "GET":
            return j({"screens": self.screens, "limit": self.rule_limit, "count": len(self.screens)})
        if path == "/my-screens/question-check":
            q = (body or {}).get("question", "")
            if re.search(r"should i|buy|sell", q, re.I):
                return j({"ok": False, "message": "This asks for advice or a prediction. RedixFi only answers with facts from filings and market data, so this question cannot be added."})
            if not re.search(r"debt|concall|price|promoter|profit", q, re.I):
                return j({"ok": False, "message": "RedixFi cannot answer this from the data it holds (prices, delivery, financial statements, holdings, deals, concalls and annual reports). Try asking about one of those."})
            return j({"ok": True, "question": q.strip()})
        if path == "/my-screens/_reports/active":
            return j({"jobs": []})
        mm = re.match(r"^/my-screens/(s\d)/runs/(\w+)/report/estimate$", path)
        if mm:
            n_s, n_q = len(body["symbols"]), len(body["questions"]) + len(body["custom"])
            uses = n_s * n_q
            plan = (self.run_limit and (350 if self.tier == "pro" else 150) - self.report_used) if self.tier != "free" else 5 - self.daily_used
            if self.tier == "free" and n_s > 1:
                return j({"fits": False, "free_one_stock": True, "message": "A Free report covers 1 stock. Basic and Pro reports cover up to 10 stocks.", "cta": "upgrade"})
            return j({"fits": uses <= plan, "stocks": n_s, "per_stock": n_q, "total_pairs": uses, "already_answered": 0, "uses": uses, "left": {"plan": plan, "addon": 0, "resets_on": None, "daily": self.tier == "free"},
                      "after": plan - uses if uses <= plan else None, "options": [], "free": self.tier == "free", "max_stocks": 1 if self.tier == "free" else 10, "max_answers": 50})
        mm = re.match(r"^/my-screens/(s\d)/runs/(\w+)/report$", path)
        if mm and m == "POST":
            self.report_body = body
            total = len(body["symbols"]) * (len(body["questions"]) + len(body["custom"]))
            return j({"job": {"id": "j1", "run_id": mm.group(2), "rule_id": mm.group(1), "status": "running", "total": total, "done": 0, "failed": 0, "progress_pct": 0}, "uses": total, "already_answered": 0})
        if re.match(r"^/my-screens/s\d/runs/\w+/report/jobs/j1$", path):
            self.job_polls += 1
            done = self.job_polls >= 2
            return j({"job": {"id": "j1", "run_id": "r1", "rule_id": "s1", "status": "done" if done else "running", "total": 5, "done": 5 if done else 2, "failed": 0, "progress_pct": 100 if done else 40}})
        if re.match(r"^/my-screens/s\d/runs/\w+/report\.json$", path):
            return j({"report": {"name": "My growers", "run_date": "2026-11-19", "figures_as_of": "2026-11-18", "chosen": [{"symbol": "TCS", "company": "Tata Consultancy", "slots": [
                {"key": "points", "question": "List the points to watch for TCS.", "asked": True, "text": "Stored answer text.", "date": "2026-11-19", "sources": [{"label": "Annual report FY2026"}]}]}]}, "answered_stocks": 1})
        if re.match(r"^/my-screens/s\d/runs/", path) and path.endswith("/report.pdf"):
            return route.fulfill(status=200, content_type="application/pdf", headers={"content-disposition": 'attachment; filename="rule-report.pdf"'}, body=b"%PDF-1.4 test")
        if re.match(r"^/my-screens/s\d/runs/", path) and path.endswith("/report.csv"):
            return route.fulfill(status=200, content_type="text/csv", headers={"content-disposition": 'attachment; filename="rule-report.csv"'}, body=b"Stock,Company\r\n")
        if re.match(r"^/my-screens/s\d/runs$", path) and m == "POST":
            if len(self.runs) >= self.run_limit and body.get("confirm_drop") is not True:
                return j({"saved": False, "needs_confirm": True, "drops": {"id": self.runs[-1]["id"], "run_date": self.runs[-1]["run_date"]}, "limit": self.run_limit})
            if len(self.runs) >= self.run_limit:
                self.runs.pop()
            self.runs.insert(0, {"id": "r7", "run_date": "2026-11-24", "count": len(self.stocks), "as_of": "2026-11-23", "earlier_values": False, "answers": 0, "params": body["params"], "added": None, "dropped": None, "since": None})
            return j({"saved": True, "needs_confirm": False, "run": {"id": "r7", "run_date": "2026-11-24", "count": len(self.stocks), "as_of": "2026-11-23"}, "updated_same_day": False, "dropped": None, "limit": self.run_limit, "diff": None})
        if re.match(r"^/my-screens/s\d/runs$", path) and m == "GET":
            return j({"runs": self.runs, "limit": self.run_limit, "count": len(self.runs)})
        mm = re.match(r"^/my-screens/s\d/runs/(\w+)$", path)
        if mm and m == "DELETE":
            self.runs = [x for x in self.runs if x["id"] != mm.group(1)]
            return j({"deleted": True})
        if mm and m == "GET":
            return j({"run": {"id": mm.group(1), "run_date": "2026-11-19", "count": len(self.stocks), "as_of": "2026-11-18"}, "columns": [["roe", "ROE (%)"]],
                      "stocks": [{"symbol": s, "company": s.title() + " Ltd", "values": ["20"]} for s in self.stocks], "diff": None})
        if re.match(r"^/my-screens/s\d/answers", path):
            return j({"answers": [], "count": 0, "limit": 1500})
        if path == "/watchlist" or path.startswith("/me/watchlist"):
            return j({"symbols": []})
        if path.startswith("/ask/suggestions"):
            return j({"suggestions": [], "has_concall": False})
        if path.startswith("/ask/history") or path.startswith("/ask/conversations"):
            return j({"conversation": None, "conversations": []})
        return j({})


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


def to_rules_tab(page):
    page.goto(SITE + "/shortlist-lab", wait_until="networkidle", timeout=90000)
    page.click("[data-testid=lab-tab-rules]")
    page.wait_for_selector("[data-testid=create-new-rule]", timeout=40000)


def open_saved(page):
    page.wait_for_selector("[data-testid=saved-rule]", timeout=20000)
    page.locator("[data-testid=saved-rule]").first.click()
    page.wait_for_selector("[data-testid=section-readonly]", timeout=10000)


def close(ctx, page):
    try:
        page.unroute_all(behavior="ignoreErrors")
    except Exception:
        pass
    ctx.close()


def t(page, sel):
    return page.locator(sel).first.inner_text().strip()


def shot(page, name):
    if SHOTS:
        page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=True)


def logged_out(br, width, theme):
    tag = f"[{theme} {width}] logged out"
    ctx, page = new_page(br, width, theme)
    to_rules_tab(page)
    secs = [t(page, f"[data-testid=rules-sec-{k}]") for k in ("rules", "results")]
    check(f"{tag}: two tabs, Rules and Results", secs == ["Rules", "Results"], str(secs))
    page.locator("[data-testid=create-new-rule]").click()
    page.wait_for_selector("[data-testid=section-create]", timeout=10000)
    check(f"{tag}: the rule page has a plain Back button", t(page, "[data-testid=back-to-rules]") == "Back")
    page.locator("[data-testid=ladder-step-2]").click()
    page.wait_for_selector("[data-testid=step-page-2]", timeout=10000)
    page.fill("input#rule-roe", "15")
    page.wait_for_selector("[data-testid=step-after]", timeout=40000)
    check(f"{tag}: step page: After this step, and a View stocks button", page.locator("[data-testid=step-view-stocks]").count() == 1 and "After this step:" in t(page, "[data-testid=step-after-line]"))
    page.locator("[data-testid=step-view-stocks]").click()
    page.wait_for_selector("[data-testid=live-names-card-item]", timeout=30000)
    count_text = t(page, "[data-testid=live-names-card-count]")
    check(f"{tag}: names only, with a count and a search box", re.match(r"^[\d,]+ stocks?$", count_text) is not None and page.locator("[data-testid=live-names-card-search]").count() == 1, count_text)
    page.fill("[data-testid=live-names-card-search]", "TCS")
    page.wait_for_function("document.querySelectorAll('[data-testid=live-names-card-item]').length > 0 && document.querySelector('[data-testid=live-names-card-list]').innerText.includes('TCS')", timeout=20000)
    check(f"{tag}: the search box finds a stock by symbol", "TCS" in t(page, "[data-testid=live-names-card-list]"))
    page.fill("[data-testid=live-names-card-search]", "")
    page.wait_for_function("document.querySelectorAll('[data-testid=live-names-card-item]').length >= 30", timeout=20000)
    check(f"{tag}: logged out the list stops at the first 30 names with a sign-up line (no Show more)", page.locator("[data-testid=live-names-card-capped]").count() == 1 and "free account" in t(page, "[data-testid=live-names-card-capped]")
          and page.locator("[data-testid=live-names-card-more]").count() == 0)
    check(f"{tag}: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
    check(f"{tag}: no banned words on the page", not BANNED.findall(page.inner_text("body")), str(BANNED.findall(page.inner_text("body"))))
    page.locator("[data-testid=rules-sec-results]").click()
    page.wait_for_selector("[data-testid=results-loggedout]", timeout=5000)
    check(f"{tag}: Results asks a logged-out visitor to log in", "Log in" in t(page, "[data-testid=results-loggedout]"))
    shot(page, f"lo-{theme}-{width}")
    close(ctx, page)


def pro_flow(br, width, theme, tier="pro"):
    tag = f"[{theme} {width}] {tier}"
    mock = Mock(tier)
    ctx, page = new_page(br, width, theme, mock, tier)
    to_rules_tab(page)
    open_saved(page)
    page.wait_for_function("document.querySelector('[data-testid=open-rule-line]').innerText.includes('stocks')", timeout=15000)
    line = t(page, "[data-testid=open-rule-line]")
    check(f"{tag}: opened rule: one line with the name, count and date of its saved result", line == "My growers · 10 stocks · 19 Nov 2026", line)
    check(f"{tag}: opened rule: no big count box, no Fill, Clear, name box, Save, Delete or Show", all(page.locator(s).count() == 0 for s in (
          "[data-testid=ladder-bar]", "[data-testid=ladder-fill]", "[data-testid=ladder-clear]", "[data-testid=save-name]", "[data-testid=save-rules-button]", "[data-testid=rule-delete]")))
    check(f"{tag}: opened rule: a plain Back button", t(page, "[data-testid=back-to-rules]") == "Back")
    btns = [t(page, "[data-testid=edit-rule]"), t(page, "[data-testid=rule-result-button]")]
    check(f"{tag}: opened rule: only Edit rule and View stocks at the bottom", btns == ["Edit rule", "View stocks"] and page.locator("[data-testid=readonly-buttons] button").count() == 2, str(btns))
    page.locator("[data-testid=rule-result-button]").click()
    page.wait_for_selector("[data-testid=read-names-item]", timeout=10000)
    check(f"{tag}: View stocks: names, count and date in a short card, with a link to Results", "10 stocks" in t(page, "[data-testid=read-names-title]") and "19 Nov 2026" in t(page, "[data-testid=read-names-title]")
          and t(page, "[data-testid=see-in-results]") == "See details in Results" and page.locator("[data-testid=read-card] a[download], [data-testid=read-card] button:has-text('Download')").count() == 0)
    check(f"{tag}: View stocks: Create report is offered, no downloads and no Ask AI in the card", t(page, "[data-testid=create-report]") == "Create report" and "Ask AI" not in t(page, "[data-testid=read-card]"))
    page.locator("[data-testid=create-report]").click()
    page.wait_for_selector("[data-testid=report-sheet]", timeout=10000)
    page.wait_for_selector("[data-testid=report-uses]", timeout=10000)
    left = 350 if tier == "pro" else 150
    uses = t(page, "[data-testid=report-uses]")
    check(f"{tag}: sheet: the add-on balance is named on its own line", "25 add-on questions" in t(page, "[data-testid=report-addon-line]"))
    check(f"{tag}: sheet: 10 stocks all chosen, 5 questions, 'This uses 50 questions. You will have {left - 50} left this month.'", uses == f"This uses 50 questions. You will have {left - 50} left this month."
          and "TCS" in t(page, "[data-testid=report-stocks-line]") and page.locator("[data-testid=report-questions] li").count() == 5, uses)
    check(f"{tag}: sheet: two buttons plus Customise", [t(page, "[data-testid=report-create]"), t(page, "[data-testid=report-create-no-ai]"), t(page, "[data-testid=report-customise]")] == ["Create report", "Create without AI", "Customise"])
    page.locator("[data-testid=report-customise]").click()
    page.fill("[data-testid=report-custom-input]", "Should I buy TCS")
    page.locator("[data-testid=report-custom-button]").click()
    page.wait_for_function("document.querySelector('[data-testid=report-custom-msg]') && document.querySelector('[data-testid=report-custom-msg]').innerText.includes('advice')", timeout=10000)
    check(f"{tag}: custom question: advice is refused in plain words and not added", page.locator("[data-testid=report-custom-q]").count() == 0)
    page.fill("[data-testid=report-custom-input]", "What is the weather today")
    page.locator("[data-testid=report-custom-button]").click()
    page.wait_for_function("document.querySelector('[data-testid=report-custom-msg]').innerText.includes('cannot answer this from the data')", timeout=10000)
    page.fill("[data-testid=report-custom-input]", "Show the promoter pledge for the last 4 quarters")
    page.locator("[data-testid=report-custom-button]").click()
    page.wait_for_timeout(600)
    check(f"{tag}: custom question over the 50-answer limit is not accepted (10 stocks x 6 questions)", page.locator("[data-testid=report-custom-q]").count() == 0 and "50 answers" in t(page, "[data-testid=report-custom-msg]"))
    page.locator("[data-testid=report-stock-chips] button").first.click()
    page.locator("[data-testid=report-stock-chips] button").first.click()
    page.locator("[data-testid=report-custom-button]").click()
    page.wait_for_selector("[data-testid=report-custom-q]", timeout=10000)
    total = t(page, "[data-testid=report-total-line]")
    check(f"{tag}: after removing 2 stocks the checked question is added, and the live total shows 8 stocks x 6 questions = 48 of 50", total.startswith("8 stocks × 6 questions = 48 of 50 answers"), total)
    page.locator("[data-testid=report-customise]").click()
    page.locator("[data-testid=report-create]").click()
    page.wait_for_selector("[data-testid=report-progress]", timeout=10000)
    check(f"{tag}: progress bar while it builds, and the page says you can leave", "Building your report" in t(page, "[data-testid=report-progress-line]") and "You can leave this page" in t(page, "[data-testid=report-leave-note]")
          and page.locator("[data-testid=report-progress] [role=progressbar]").count() == 1)
    page.wait_for_function("document.querySelector('[data-testid=report-progress-line]').innerText.includes('ready')", timeout=20000)
    check(f"{tag}: when ready it says so and points to Results", "ready in Results" in t(page, "[data-testid=report-progress-line]"))
    check(f"{tag}: the report asked for the chosen stocks and questions", mock.report_body is not None and len(mock.report_body["symbols"]) == 8 and len(mock.report_body["custom"]) == 1 and len(mock.report_body["questions"]) == 5)
    # edit
    page.locator("[data-testid=back-to-rules]").click()
    page.wait_for_selector("[data-testid=saved-rule]", timeout=10000)
    open_saved(page)
    page.locator("[data-testid=edit-rule]").click()
    page.wait_for_selector("[data-testid=section-create]", timeout=10000)
    check(f"{tag}: Edit rule: Fill, Clear, name box, Save, Delete and Show appear", all(page.locator(s).count() >= 1 for s in (
          "[data-testid=ladder-fill]", "[data-testid=ladder-clear]", "[data-testid=save-name]", "[data-testid=save-rules-button]", "[data-testid=rule-delete]")) and t(page, "[data-testid=rule-result-button]") == "Show stocks that meet my rule")
    page.locator("[data-testid=rule-result-button]").click()
    page.wait_for_selector("[data-testid=live-names-card-item]", timeout=30000)
    check(f"{tag}: Show lists the names of today's matches and offers Create report", t(page, "[data-testid=create-report]") == "Create report")
    check(f"{tag}: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
    check(f"{tag}: no banned words on the page", not BANNED.findall(page.inner_text("body")), str(BANNED.findall(page.inner_text("body"))))
    shot(page, f"{tier}-{theme}-{width}")
    close(ctx, page)


def shelf_flow(br, width, theme, tier="pro"):
    tag = f"[{theme} {width}] {tier} shelf"
    mock = Mock(tier)
    ctx, page = new_page(br, width, theme, mock, tier)
    to_rules_tab(page)
    page.locator("[data-testid=rules-sec-results]").click()
    page.wait_for_selector("[data-testid=results-group-toggle]", timeout=20000)
    check(f"{tag}: Results is a shelf of saved reports grouped by rule", t(page, "[data-testid=shelf-title]") == "Saved reports" and page.locator("[data-testid=results-group]").count() == 1)
    check(f"{tag}: no live list, no ticking and no per-result Ask AI card", page.locator("[data-testid=ladder-cards]").count() == 0 and page.locator("input[type=checkbox]").count() == 0 and "Your rule today" not in page.inner_text("body"))
    page.locator("[data-testid=results-group-toggle]").click()
    page.wait_for_selector("[data-testid=saved-result]", timeout=10000)
    if tier == "free":
        check(f"{tag}: Free: Open report on screen, no download buttons, upgrade line with a Pricing link", page.locator("[data-testid=shelf-open-screen]").count() == 1 and page.locator("[data-testid=shelf-download]").count() == 0
              and "Basic and Pro" in t(page, "[data-testid=shelf-free-note]") and page.locator("[data-testid=shelf-free-note] a[href='/pricing']").count() == 1 and page.locator("[data-testid=saved-result-sample]").count() == 1)
        page.locator("[data-testid=shelf-open-screen]").click()
        page.wait_for_selector("[data-testid=onscreen-report]", timeout=10000)
        check(f"{tag}: Free: the report opens on screen with answers and sources", "Stored answer text." in t(page, "[data-testid=onscreen-report]") and "Annual report FY2026" in t(page, "[data-testid=onscreen-report]"))
    else:
        labels = [t(page, "[data-testid=shelf-open-pdf]"), t(page, "[data-testid=shelf-download]"), t(page, "[data-testid=shelf-add-ai]"), t(page, "[data-testid=saved-result-delete]")]
        check(f"{tag}: Open PDF, Download, Add AI for more stocks, Delete", labels == ["Open PDF", "Download", "Add AI for more stocks", "Delete"], str(labels))
        with page.expect_download() as d:
            page.locator("[data-testid=shelf-download]").click()
        check(f"{tag}: Download saves the PDF", d.value.suggested_filename.endswith(".pdf"))
        page.locator("[data-testid=shelf-add-ai]").click()
        page.wait_for_selector("[data-testid=shelf-add-sheet] [data-testid=report-sheet]", timeout=10000)
        check(f"{tag}: Add AI for more stocks opens the report sheet for this result", t(page, "[data-testid=shelf-add-sheet] [data-testid=report-create]") == "Create report")
        page.locator("[data-testid=shelf-add-sheet] [data-testid=report-sheet-close]").click()
    page.locator("[data-testid=saved-result-delete]").click()
    check(f"{tag}: Delete asks first and says the answers go too", "deleted too" in t(page, "[data-testid=saved-result-delete-note]"))
    check(f"{tag}: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
    shot(page, f"shelf-{tier}-{theme}-{width}")
    close(ctx, page)


def free_flow(br, width, theme):
    tag = f"[{theme} {width}] free"
    mock = Mock("free", daily_used=0)
    ctx, page = new_page(br, width, theme, mock, "free")
    to_rules_tab(page)
    open_saved(page)
    page.locator("[data-testid=rule-result-button]").click()
    page.wait_for_selector("[data-testid=create-report]", timeout=10000)
    page.locator("[data-testid=create-report]").click()
    page.wait_for_selector("[data-testid=report-sheet]", timeout=10000)
    page.wait_for_selector("[data-testid=report-free-one]", timeout=10000)
    check(f"{tag}: sheet: a Free report is 1 stock from the daily 5", "1 stock" in t(page, "[data-testid=report-free-one]") and page.locator("[data-testid=report-names-tick]").count() >= 2)
    page.locator("[data-testid=report-names-tick]").nth(0).check()
    page.locator("[data-testid=report-names-tick]").nth(1).click()
    page.wait_for_timeout(500)
    check(f"{tag}: choosing a second stock is stopped with a plain note", page.locator("[data-testid=report-cap-note]").count() == 1 and "up to 1 stock" in t(page, "[data-testid=report-cap-note]"))
    uses = t(page, "[data-testid=report-uses]")
    check(f"{tag}: 'This uses 5 questions. You will have 0 left today.'", uses == "This uses 5 questions. You will have 0 left today.", uses)
    mock.daily_used = 5
    close(ctx, page)
    mock2 = Mock("free", daily_used=5)
    ctx, page = new_page(br, width, theme, mock2, "free")
    to_rules_tab(page)
    open_saved(page)
    page.locator("[data-testid=rule-result-button]").click()
    page.locator("[data-testid=create-report]").click()
    page.wait_for_selector("[data-testid=report-pool-empty]", timeout=10000)
    txt = t(page, "[data-testid=report-pool-empty]")
    check(f"{tag}: today's 5 used: an upgrade message with a Pricing link, not 'Log in'", "5 questions" in txt and "Basic and Pro" in txt and "log in" not in txt.lower() and page.locator("[data-testid=report-pool-empty] a[href='/pricing']").count() == 1, txt)
    check(f"{tag}: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
    check(f"{tag}: nothing on the page tells a logged-in Free user to log in", "Log in" not in page.inner_text("main"))
    shot(page, f"free-{theme}-{width}")
    close(ctx, page)


def limits_flow(br, width, theme, tier, label):
    tag = f"[{theme} {width}] {tier} limit"
    n_runs = 1 if tier == "free" else 3
    runs = [{"id": f"r{i}", "run_date": f"2026-11-{12 - i:02d}", "count": 10, "as_of": "2026-11-09", "earlier_values": False, "answers": 0, "params": RULE_PARAMS, "added": None, "dropped": None, "since": None} for i in range(n_runs)]
    mock = Mock(tier, run_limit=n_runs, runs=runs)
    ctx, page = new_page(br, width, theme, mock, tier)
    to_rules_tab(page)
    open_saved(page)
    page.locator("[data-testid=edit-rule]").click()
    page.wait_for_selector("[data-testid=section-create]", timeout=10000)
    page.locator("[data-testid=ladder-step-2]").click()
    page.fill("input#rule-roe", "20")
    page.locator("[data-testid=step-back]").click()
    page.locator("[data-testid=rule-result-button]").click()
    page.wait_for_selector("[data-testid=create-report]", timeout=30000)
    page.locator("[data-testid=create-report]").click()
    page.wait_for_selector("[data-testid=report-create-no-ai]", timeout=10000)
    page.wait_for_selector("[data-testid=report-names-tick]", timeout=30000)
    page.locator("[data-testid=report-names-tick]").first.check()
    page.locator("[data-testid=report-create-no-ai]").click()
    page.wait_for_selector("[data-testid=run-drop-ask]", timeout=15000)
    txt = t(page, "[data-testid=run-drop-text]")
    if tier == "free":
        check(f"{tag}: Free: the warning says the saved result is replaced, with an upgrade line and a Pricing link", "replaces your saved result" in txt and page.locator("[data-testid=run-drop-plans] a[href='/pricing']").count() == 1 and "Basic keeps 10" in t(page, "[data-testid=run-drop-plans]"))
        check(f"{tag}: Free: Save and replace and Cancel (no 'delete a different result')", t(page, "[data-testid=run-drop-confirm]") == "Save and replace" and page.locator("[data-testid=run-drop-other]").count() == 0)
    else:
        check(f"{tag}: paid: the warning names the result removed, with Download, Delete a different result, Save and remove the oldest, Cancel", "removes the oldest result (10 Nov 2026)" in txt
              and t(page, "[data-testid=run-drop-confirm]") == "Save and remove the oldest" and t(page, "[data-testid=run-drop-other]") == "Delete a different result" and t(page, "[data-testid=dialog-dl-report]") == "Download report", txt)
    page.locator("[data-testid=run-drop-cancel]").click()
    check(f"{tag}: Cancel closes the warning and nothing was saved", page.locator("[data-testid=run-drop-ask]").count() == 0 and len(mock.runs) == n_runs and mock.runs[0]["id"] == "r0")
    page.locator("[data-testid=report-create-no-ai]").click()
    page.wait_for_selector("[data-testid=run-drop-ask]", timeout=15000)
    page.locator("[data-testid=run-drop-confirm]").click()
    page.wait_for_selector("[data-testid=report-done-note]", timeout=15000)
    check(f"{tag}: Save and replace / remove the oldest saves the new result", mock.runs[0]["id"] == "r7" and len(mock.runs) == n_runs)
    check(f"{tag}: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
    close(ctx, page)


def account_flow(br, width, theme):
    tag = f"[{theme} {width}] account"
    mock = Mock("pro", report_used=30)
    ctx, page = new_page(br, width, theme, mock, "pro")
    page.goto(SITE + "/account", wait_until="networkidle", timeout=90000)
    try:
        page.wait_for_selector("[data-testid=ask-usage-card]", timeout=20000)
    except Exception:
        check(f"{tag}: the Ask AI questions card loads", False)
        close(ctx, page)
        return
    card = t(page, "[data-testid=ask-usage-card]")
    check(f"{tag}: card shows chat and report pools, the reset date and add-ons", "Reports, this month" in card and "320 remaining of 350" in card and "Chat, this month" in card and "360 remaining of 400" in card and "20 Dec 2026" in card and "25 remaining" in card, card)
    check(f"{tag}: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
    close(ctx, page)


FLOWS = {
    "logged_out": lambda br, w, th: logged_out(br, w, th),
    "pro": lambda br, w, th: pro_flow(br, w, th, "pro"),
    "basic": lambda br, w, th: pro_flow(br, w, th, "basic"),
    "shelf_pro": lambda br, w, th: shelf_flow(br, w, th, "pro"),
    "shelf_free": lambda br, w, th: shelf_flow(br, w, th, "free"),
    "free": lambda br, w, th: free_flow(br, w, th),
    "limit_free": lambda br, w, th: limits_flow(br, w, th, "free", "Free"),
    "limit_basic": lambda br, w, th: limits_flow(br, w, th, "basic", "Basic"),
    "account": lambda br, w, th: account_flow(br, w, th),
}

if __name__ == "__main__":
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        for width in WIDTHS:
            for theme in THEMES:
                for name, fn in FLOWS.items():
                    if ONLY and name not in ONLY:
                        continue
                    try:
                        fn(br, width, theme)
                    except Exception as e:  # a flow that crashes is one failed check, not a silent skip
                        check(f"[{theme} {width}] flow {name} ran to the end", False, repr(e)[:300])
        br.close()
    print(f"\n{sum(RESULTS)} / {len(RESULTS)} checks passed")
    sys.exit(0 if all(RESULTS) else 1)
