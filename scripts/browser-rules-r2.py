"""Browser checks for Stock Check release 2 (20 Nov 2026): Add to my rule (Ask AI), saved answers under a rule, PDF / CSV export for paid plans, the stored
sample report for Free. Real page, real figures file and shortlist from a staged API on production data; logged-in-only endpoints are answered by a mock.

  python scripts/browser-rules-r2.py <site url> [shots dir]
Widths 360 and 414, themes light / dark / premium.
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
ANSWER = "Points to watch: promoter pledge 0.54% as of 18 Jul 2026 (NSE record)."
PDF_BYTES = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


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
    def __init__(self, tier):
        self.tier = tier
        self.calls = []
        self.answers = [{"id": "a1", "rule_id": "s1", "symbol": "HINDUNILVR", "symbols": ["HINDUNILVR"], "question": "List the points to watch for HINDUNILVR.", "answer": ANSWER,
                         "sources": [{"label": "NSE promoter pledge disclosure", "detail": "18 Jul 2026"}], "table": {"columns": [{"key": "a", "label": "Point"}, {"key": "b", "label": "Date"}], "rows": [{"a": "Pledge 0.54%", "b": "18 Jul 2026"}]},
                         "answered_at": "2026-11-19", "saved_at": "2026-11-19T10:00:00Z"}]
        self.template = dict(self.answers[0])
        self.screens = [{"id": "s1", "name": "My growers", "params": {"growth_up_3y": True, "roe_min": 15}, "created_at": "2026-11-18T10:00:00Z", "last_viewed_at": None,
                         "updated_at": "2026-11-19T10:00:00Z", "stock_count": 52, "counted_at": "2026-11-19T10:00:00Z", "snapshot": None, "answers": 1},
                        {"id": "s2", "name": "Low debt", "params": {"de_max": 0.5}, "created_at": "2026-11-17T10:00:00Z", "last_viewed_at": None, "updated_at": None,
                         "stock_count": None, "counted_at": None, "snapshot": None, "answers": 0}]

    def handle(self, route):
        req = route.request
        path = req.url.split("/api/v1", 1)[1].split("?")[0]
        m = req.method
        try:
            body = req.post_data_json
        except Exception:
            body = None
        self.calls.append((m, path, body, req.headers.get("authorization")))
        j = lambda data, status=200: route.fulfill(status=status, content_type="application/json", body=json.dumps(env(data)))
        if path in ("/signals", "/ladder-data"):
            return route.fulfill(response=route.fetch(headers={k: v for k, v in req.headers.items() if k.lower() != "authorization"}))
        if path == "/me":
            return j(user(self.tier))
        if path == "/usage":
            return j({"research_views_remaining": 0, "unlimited": True, "ask_redixfi": {"tier": self.tier, "is_pro_trial": False, "daily_limit_per_symbol": None, "daily_used": 0,
                      "daily_limit": 100, "monthly_used": 0, "monthly_limit": 500, "topup_questions_remaining": 0}})
        if path == "/my-screens" and m == "GET":
            return j({"screens": self.screens, "limit": 5, "count": len(self.screens)})
        if path == "/my-screens/s1/answers" and m == "GET":
            return j({"answers": self.answers, "count": len(self.answers), "limit": 40})
        if path == "/my-screens/s1/answers" and m == "POST":
            return j({"answer": {**self.template, "id": "a2"}, "already_saved": False})
        if path.startswith("/my-screens/s1/answers/") and m == "DELETE":
            self.answers = [a for a in self.answers if a["id"] != path.rsplit("/", 1)[1]]
            return j({"deleted": True})
        if path.startswith("/my-screens/") and path.endswith(("/export.pdf", "/export.csv")):
            if self.tier == "free":
                return route.fulfill(status=403, content_type="application/json", body=json.dumps({"detail": {"reason": "plan_locked", "message": "Export is on Basic and Pro."}}))
            ext = path.rsplit(".", 1)[1]
            return route.fulfill(status=200, body=PDF_BYTES if ext == "pdf" else b"Rule,My growers\r\n", headers={
                "content-type": "application/pdf" if ext == "pdf" else "text/csv", "content-disposition": f'attachment; filename="redixfi-rule-my-growers.{ext}"', "access-control-expose-headers": "content-disposition"})
        if path == "/ask" and m == "POST":
            return j({"answer": ANSWER, "conversation_id": "c1", "source_citations": [{"type": "filing", "label": "NSE promoter pledge disclosure", "detail": "18 Jul 2026"}],
                      "follow_ups": [], "quota_unchanged": False, "question_weight": 1, "resolved_symbol": "HINDUNILVR", "choices": [], "chat_context": None})
        if path.startswith("/ask/suggestions"):
            return j({"suggestions": [], "has_concall": False})
        if path.startswith("/ask/history") or path.startswith("/ask/conversations"):
            return j({"conversation": None, "conversations": []})
        if path.startswith("/watchlist"):
            return j({"symbols": []})
        return j({})


def overflow(page):
    return page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")


def run(pw, theme, width, tier):
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={"width": width, "height": 800}, accept_downloads=True)
    page = ctx.new_page()
    page.add_init_script(f"try{{localStorage.setItem('redixfi:theme','{theme}')}}catch(e){{}}")
    page.add_init_script(f"try{{localStorage.setItem('redixfi:auth', {json.dumps(json.dumps({'access_token': jwt(), 'refresh_token': 'r', 'user': user(tier)}))})}}catch(e){{}}")
    mock = Mock(tier)
    page.route("**/api/v1/**", mock.handle)
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    tag = f"[{theme} {width}] {tier}"
    page.goto(f"{SITE}/stock-check", wait_until="networkidle")
    page.wait_for_selector('[data-testid="saved-list"]')
    rr = page.locator('[data-testid="rule-report"]').first
    # ---- saved answers under a rule
    check(f"{tag}: the answer count is on the rule", "Saved answers (1)" in rr.inner_text(), rr.inner_text()[:80])
    rr.locator('[data-testid="rule-answers-toggle"]').click()
    page.wait_for_selector('[data-testid="rule-answer"]')
    a = page.locator('[data-testid="rule-answer"]').first.inner_text()
    check(f"{tag}: the saved answer shows stock, question, 'as of' date, text, table and sources", all(t in a for t in ["HINDUNILVR", "List the points to watch", "Answer as of 2026-11-19", "promoter pledge 0.54%", "Pledge 0.54%", "Sources: NSE promoter pledge disclosure (18 Jul 2026)"]), a)
    check(f"{tag}: no horizontal scroll with the answer open", overflow(page) <= 0, str(overflow(page)))
    if SHOTS:
        rr.scroll_into_view_if_needed()
        page.screenshot(path=str(SHOTS / f"r2_answers_{theme}_{width}_{tier}.png"))
    page.locator('[data-testid="rule-answer-remove"]').first.click()
    page.wait_for_selector('[data-testid="rule-answers-empty"]')
    check(f"{tag}: removing an answer calls DELETE", any(c[0] == "DELETE" and c[1] == "/my-screens/s1/answers/a1" for c in mock.calls))
    # ---- export: paid downloads, Free sees the sample
    if tier == "free":
        link = rr.locator('[data-testid="rule-sample-report"]')
        check(f"{tag}: Free: See a sample report, no download buttons", link.count() == 1 and rr.locator('[data-testid="rule-export-pdf"]').count() == 0 and rr.locator('[data-testid="rule-export-csv"]').count() == 0)
        check(f"{tag}: Free: the sample is a stored file in a new tab", link.get_attribute("href") == "/samples/rule-report-sample.pdf" and link.get_attribute("target") == "_blank")
        with ctx.expect_page() as pop:
            link.click()
        np = pop.value
        for _ in range(50):
            if "rule-report-sample.pdf" in np.url:
                break
            time.sleep(0.1)
        check(f"{tag}: Free: the sample opens in a new tab (headless Chromium downloads a PDF instead of showing it, so the address can stay blank) and makes no export call", (np.url in ("about:blank", "") or np.url.endswith("/samples/rule-report-sample.pdf")) and not [c for c in mock.calls if "export" in c[1]], np.url)
        r = ctx.request.get(f"{SITE}/samples/rule-report-sample.pdf")
        body = r.body()
        check(f"{tag}: Free: sample file is a PDF with the facts-only note", r.status == 200 and "pdf" in r.headers.get("content-type", "") and body[:5] == b"%PDF-" and len(body) > 5000, f"{r.status} {len(body)}")
        c = ctx.request.get(f"{SITE}/samples/rule-report-sample.csv")
        t = c.body().decode("utf-8-sig")
        check(f"{tag}: Free: sample csv is the fixed sample (one company, no user data)", c.status == 200 and "SAMPLE" in t and t.count("HINDUSTAN UNILEVER") == 1 and "@" not in t)
        np.close()
    else:
        with page.expect_download() as dl:
            rr.locator('[data-testid="rule-export-pdf"]').click()
        d = dl.value
        check(f"{tag}: paid: Download PDF saves redixfi-rule-my-growers.pdf", d.suggested_filename == "redixfi-rule-my-growers.pdf", d.suggested_filename)
        call = [c for c in mock.calls if c[1] == "/my-screens/s1/export.pdf"]
        check(f"{tag}: paid: the export call carries the login token", len(call) == 1 and (call[0][3] or "").startswith("Bearer "))
        with page.expect_download() as dl2:
            rr.locator('[data-testid="rule-export-csv"]').click()
        check(f"{tag}: paid: Download CSV saves a .csv", dl2.value.suggested_filename.endswith(".csv"), dl2.value.suggested_filename)
        check(f"{tag}: paid: no sample link", rr.locator('[data-testid="rule-sample-report"]').count() == 0)
    check(f"{tag}: no horizontal scroll", overflow(page) <= 0, str(overflow(page)))
    # ---- Add to my rule, under an Ask AI answer
    page.locator('[data-testid="ladder-bar-show"]').click()
    page.wait_for_selector('[data-testid="ladder-card"]')
    first = page.locator('[data-testid="ladder-select"] input').first
    first.evaluate("e => e.scrollIntoView({ block: 'center' })")
    first.click()
    page.locator('[data-testid="ask-ai-button"]').scroll_into_view_if_needed()
    page.locator('[data-testid="ask-ai-button"]').click()
    page.wait_for_selector('[data-testid="ask-stock-group"]')
    page.locator('[data-testid="ask-group-q-points"]').click()
    inp = page.locator('input[placeholder^="Ask anything"]')
    inp.press("Enter")
    page.wait_for_selector('[data-testid="add-to-rule"]', timeout=20000)
    check(f"{tag}: Add to my rule appears under the answer", page.locator('[data-testid="add-to-rule-button"]').inner_text().strip() == "Add to my rule")
    page.locator('[data-testid="add-to-rule-button"]').click()
    page.wait_for_selector('[data-testid="add-to-rule-list"]')
    names = [t.inner_text() for t in page.locator('[data-testid="add-to-rule-choice"]').all()]
    check(f"{tag}: it lists the saved rules", len(names) == 2 and "My growers" in names[0], str(names))
    check(f"{tag}: no horizontal scroll with the choices open", overflow(page) <= 0, str(overflow(page)))
    if SHOTS:
        page.screenshot(path=str(SHOTS / f"r2_addrule_{theme}_{width}_{tier}.png"))
    page.locator('[data-testid="add-to-rule-choice"]').first.click()
    page.wait_for_selector('[data-testid="add-to-rule-done"]')
    post = [c for c in mock.calls if c[0] == "POST" and c[1] == "/my-screens/s1/answers"]
    check(f"{tag}: saving names the conversation and the answer (the server copies it)", len(post) == 1 and post[0][2] == {"conversation_id": "c1", "answer_text": ANSWER, "symbol": "HINDUNILVR"}, str(post)[:200])
    check(f"{tag}: the person is told", page.locator('[data-testid="add-to-rule-done"]').inner_text() == 'Added to "My growers"')
    check(f"{tag}: no page errors", not errs, "; ".join(errs)[:200])
    br.close()


with sync_playwright() as pw:
    for theme in ("light", "dark", "premium"):
        for width in (360, 414):
            run(pw, theme, width, "pro")
    run(pw, "light", 360, "free")
    run(pw, "premium", 414, "free")
print(f"\n{sum(RESULTS)}/{len(RESULTS)} checks passed")
sys.exit(0 if all(RESULTS) else 1)
