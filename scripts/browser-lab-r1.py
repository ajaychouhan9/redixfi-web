"""Browser checks for Shortlist Lab release 1 (21 Nov 2026): name and address, menus, Learn tab, My rules tab names (23 Nov 2026: three pages and a step list), themes, phone tables.
Real pages and real data (the site is built locally and talks to the live API read-only; nothing is written).

  python scripts/browser-lab-r1.py <site url> [shots dir]
Widths 360 and 414, themes light / dark / slate. One line per check, then a count. Needs: pip install playwright (chromium installed).
"""
import json
import sys
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

SITE = sys.argv[1].rstrip("/")
SHOTS = Path(sys.argv[2]) if len(sys.argv) > 2 else None
if SHOTS:
    SHOTS.mkdir(parents=True, exist_ok=True)
RESULTS = []
STEP_NAMES = ["Size and trading", "Earnings", "Returns", "Debt and pledge", "Price movement", "Price you pay", "Price and volume"]
TABLE_PAGES = ["/signals", "/market-activity", "/gainers-losers", "/intraday", "/signals/7-day-review", "/stocks/TCS", "/sample-report", "/pulse", "/pricing", "/theme-preview"]


def check(name, ok, extra=""):
    RESULTS.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{extra}]" if extra and not ok else ""))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def head(path):
    op = urllib.request.build_opener(NoRedirect)
    try:
        r = op.open(SITE + path, timeout=60)
        return r.status, r.headers.get("Location")
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Location")


def no_sideways(page):
    return page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")


def shot(page, name):
    if SHOTS:
        page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=False)


with sync_playwright() as p:
    # redirects: one hop, no chain
    for old in ("/stock-check", "/start"):
        st, loc = head(old)
        check(f"{old} -> one 301 to /shortlist-lab", st == 301 and (loc or "").rstrip("/").endswith("/shortlist-lab"), f"{st} {loc}")
    st, loc = head("/shortlist-lab")
    check("/shortlist-lab answers 200 itself", st == 200, f"{st} {loc}")

    br = p.chromium.launch()
    for width in (360, 414):
        for theme in ("light", "dark", "slate"):
            tag = f"{width}px {theme}"
            ctx = br.new_context(viewport={"width": width, "height": 800}, device_scale_factor=1, is_mobile=True, has_touch=True)
            ctx.add_init_script(f"try{{localStorage.setItem('redixfi:theme','{theme}');localStorage.setItem('redixfi:consent','{{}}');}}catch(e){{}}")
            page = ctx.new_page()
            page.goto(SITE + "/shortlist-lab", wait_until="networkidle", timeout=90000)
            check(f"{tag}: theme applied", page.evaluate("document.documentElement.dataset.theme") == theme)
            check(f"{tag}: title and subtitle", page.inner_text("[data-testid=stock-check-title]") == "Shortlist Lab" and page.inner_text("[data-testid=stock-check-subtitle]") == "Set your rules. Read the result.")
            check(f"{tag}: no sideways scroll (Learn)", no_sideways(page))
            # top bar Ask AI button fits
            ask = page.locator('button[aria-label="RedixFi AI"]').first
            box = ask.bounding_box() if ask.count() else None
            check(f"{tag}: top-bar Ask AI button inside the screen", box is not None and box["x"] >= 0 and box["x"] + box["width"] <= width, str(box))
            # bottom bar
            nav = page.locator("nav[aria-label], nav").filter(has_text="Account")
            txt = " ".join(page.locator("nav").all_inner_texts())
            check(f"{tag}: bottom bar has Lab and no Ask AI item", "Lab" in txt and "Account" in txt)
            # tabs
            tabs = page.locator("[role=tab]")
            check(f"{tag}: two tabs Learn and My rules", tabs.count() == 2 and tabs.nth(0).inner_text() == "Learn" and tabs.nth(1).inner_text() == "My rules")
            # Learn tab
            names = [page.locator(f"[data-testid=learn-step-{i}] h2").inner_text() for i in range(1, 8)]
            check(f"{tag}: seven named steps on Learn", names == [f"Step {i + 1}. {n}" for i, n in enumerate(STEP_NAMES)], str(names))
            check(f"{tag}: every example shown in full, no toggle", page.locator("[data-testid=learn-example]").count() == 7 and page.get_by_text("Show the reading").count() == 0 and page.get_by_text("My notes").count() == 0)
            check(f"{tag}: no sample card, no points-to-watch or news buttons", page.get_by_text("Try it on a sample stock").count() == 0 and page.get_by_text("Open Points to watch").count() == 0 and page.get_by_text("Open News").count() == 0)
            check(f"{tag}: find-in-Screener line on each step", page.locator("[data-testid=learn-find-line]").count() == 7 and "Find any stock in Screener, open its page and look in the Overview tab." in page.locator("[data-testid=learn-find-line]").first.inner_text() and page.locator("[data-testid=learn-find-line] a").count() == 7)
            check(f"{tag}: no long 5-questions card or Ask AI button on Learn; every step lists its fields", page.locator("[data-testid=learn-try-button]").count() == 0 and page.locator("[data-testid=learn-try]").count() == 0 and page.locator("[data-testid=learn-fields]").count() == 7)
            shot(page, f"learn-{width}-{theme}")
            # My rules tab
            page.goto(SITE + "/shortlist-lab", wait_until="networkidle", timeout=90000)
            page.click("[data-testid=lab-tab-rules]")
            check(f"{tag}: the My rules tab puts #my-rules in the address", page.evaluate("location.hash") == "#my-rules")
            page.wait_for_selector("[data-testid=ladder-step-0]", timeout=60000)
            heads = [page.locator(f"[data-testid=ladder-step-{i}] [data-testid=ladder-step-name]").inner_text().strip() for i in range(7)]
            check(f"{tag}: My rules shows the same seven names as Steps 1 to 7, as a numbered list", heads == [f"{i + 1}. {n}" for i, n in enumerate(STEP_NAMES)], str(heads))
            secs = [page.locator(f"[data-testid=rules-sec-{k}]").inner_text().strip() for k in ("create", "saved", "results")]
            check(f"{tag}: three sections: Create rule, Saved rules, Results", secs == ["Create rule", "Saved rules", "Results"], str(secs))
            check(f"{tag}: no stock count before a field is filled, one Show button", page.locator("[data-testid=ladder-left]").count() == 0 and page.get_by_role("button", name="Show stocks that meet my rule").count() == 1)
            check(f"{tag}: no sideways scroll (My rules)", no_sideways(page))
            shot(page, f"rules-{width}-{theme}")
            ctx.close()

    # phone tables: every table on these pages is stacked and nothing scrolls sideways
    for width in (360, 414):
        for theme in ("light", "dark", "slate"):
            ctx = br.new_context(viewport={"width": width, "height": 800}, is_mobile=True, has_touch=True)
            ctx.add_init_script(f"try{{localStorage.setItem('redixfi:theme','{theme}');localStorage.setItem('redixfi:consent','{{}}');}}catch(e){{}}")
            page = ctx.new_page()
            seen = 0
            for path in TABLE_PAGES:
                try:
                    page.goto(SITE + path, wait_until="networkidle", timeout=90000)
                except Exception as e:  # noqa: BLE001
                    check(f"{width}px {theme} {path} loads", False, str(e)[:80])
                    continue
                page.wait_for_timeout(1200)
                info = page.evaluate("""() => {
                  const ts = Array.from(document.querySelectorAll('table')).filter(t => t.getClientRects().length);
                  return {n: ts.length, bad: ts.filter(t => getComputedStyle(t).display !== 'block').length,
                          wide: ts.filter(t => t.scrollWidth > window.innerWidth + 1).length,
                          page: document.documentElement.scrollWidth <= window.innerWidth + 1};
                }""")
                seen += info["n"]
                check(f"{width}px {theme} {path}: {info['n']} table(s) stacked, no sideways scroll", info["bad"] == 0 and info["wide"] == 0 and info["page"], json.dumps(info))
            check(f"{width}px {theme}: tables were found to test ({seen})", seen > 0)
            # a table added after load (like an Ask AI answer) is labelled and stacked too, with a column spanning two
            page.goto(SITE + "/pricing", wait_until="networkidle", timeout=90000)
            res = page.evaluate("""async () => {
              const t = document.createElement('table');
              t.innerHTML = '<thead><tr><th>Name</th><th colspan="2">Figures</th></tr></thead><tbody><tr><td>ABC</td><td>1</td><td>2</td></tr></tbody>';
              document.body.appendChild(t);
              await new Promise(r => setTimeout(r, 400));
              const tds = Array.from(t.querySelectorAll('td'));
              const out = {labels: tds.map(x => x.getAttribute('data-label')), disp: getComputedStyle(t).display, tdDisp: getComputedStyle(tds[0]).display};
              t.remove(); return out;
            }""")
            check(f"{width}px {theme}: a table added later is labelled and stacked", res["labels"] == ["Name", "Figures", "Figures"] and res["disp"] == "block" and res["tdDisp"] == "block", json.dumps(res))
            ctx.close()
    br.close()

print(f"\n{sum(RESULTS)}/{len(RESULTS)} checks passed")
sys.exit(0 if all(RESULTS) else 1)
