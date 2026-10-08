#!/usr/bin/env python3
"""Synthetic user journey: do the main paths of PROD still work, for a visitor and for a
signed-in user? .github/workflows/synthetic.yml runs it every 30 minutes.

    SYNTHETIC_EMAIL=… SYNTHETIC_PASSWORD=… python scripts/synthetic/journey.py
    python scripts/synthetic/journey.py --artifacts out/ --full-screenshots   # local triage
    python -m pytest scripts/synthetic   # the scrubber and the retry rule, no browser

Signed out: /, /login, /signup, /privacy and /terms answer 200 and show their key element,
and the API's /health answers 200. Signed in (the onboarded test account): the /login form
lands somewhere else within 20 s; the dashboard shows its search bar; every Settings
section opens from its ?tab= link and shows its heading; History renders; the onboarding
wizard renders step 1 and step 10. Any page also fails on an uncaught JS error, a console
error, or a 5xx from our own hosts. Desktop (1440) first, then the signed-in pages again
at phone width (390) with a phone user agent, because MobileHandoff sniffs the UA.

READ-ONLY. It types into the login form and presses Sign In, and that is all it presses:
no Save, no Continue, no Start or Finish, nothing on billing or the affiliate pages. The
onboarding steps are opened by seeding the wizard's own saved-progress snapshot
(hd_onboarding_v1), never by clicking through, which would write the profile. Ad pixels
get the same opt-out cookie /privacy/choices sets, so a check is never a page view in Meta
(Vercel Analytics already drops webdriver visits on its own).

Both repos are public, and so are this job's log and artifacts. The report holds paths,
statuses and scrubbed error lines, never page text. Screenshots (taken only on failure)
of signed-in pages are layout-only: text transparent, inputs masked, media hidden.

A failed check is tried once more before it counts, so one slow response at 3 a.m. is a
warning in the log rather than a red run. Exit 0 = every check passed, 1 = something
failed, 2 = no credentials.
"""

import argparse
import os
import re
import sys
import tempfile
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote, urlparse

from playwright.sync_api import Browser, Locator, Page, sync_playwright
from playwright.sync_api import Error as PlaywrightError

SITE = "https://hiredrop.io"
API = "https://web-production-db45.up.railway.app"
# A 5xx from any of these is ours to fix: the site, the API, and Supabase (sign-in and the
# profile reads the pages make straight from the browser).
OUR_HOSTS = {
    "hiredrop.io",
    "www.hiredrop.io",
    "web-production-db45.up.railway.app",
    "msxjcjzmfruizbgkssxo.supabase.co",
}

# Console errors we have seen and decided are not ours to fix. Add a pattern only after a
# run has actually shown it, with the date and where it comes from.
KNOWN_NOISE: tuple[re.Pattern[str], ...] = (
    # 10-08, /signup (now and then): the Google sign-in button's iframe carries Google's
    # own report-only CSP, and Chrome logs that framing it "violates" it. Nothing is
    # blocked, and the button renders.
    re.compile(
        r"^console\.error: Framing 'https://accounts\.google\.com/' violates the following "
        r"report-only Content Security Policy directive: \"frame-ancestors"
    ),
)

NAV_TIMEOUT_MS = 30_000
ELEMENT_TIMEOUT_MS = 15_000
LOGIN_TIMEOUT_MS = 20_000
# Hydration errors and the first effects' requests land just after the key element shows.
SETTLE_MS = 1_500

PUBLIC_PAGES = [
    ("/", "main h1", "hero heading"),
    ("/login", "form input[name=password]", "sign-in form"),
    ("/signup", "form input[name=password]", "sign-up form"),
    ("/privacy", "h1:has-text('Privacy Policy')", "policy heading"),
    ("/terms", "h1:has-text('Terms of Service')", "terms heading"),
]

# Settings sections (components/dashboard/SettingsView.tsx SECTIONS) and the heading each
# one opens with.
SETTINGS_SECTIONS = {
    "account": r"who you are",
    "forms": r"current employment",
    "resume": r"resume\s*&\s*ats",
    "billing": r"^plans$",
    "ambassador": r"^the deal$",
}

# Screens that mean "the page gave up", named in the failure line so it says more than
# "element not found". Our own copy, never user data.
FAILURE_SCREENS = {
    "the sign-in-service-unreachable screen": re.compile(
        r"Couldn.t reach the sign-in service"
    ),
    "the dashboard error screen": re.compile(r"Dashboard couldn.t load"),
    "Next's client-side exception screen": re.compile(
        r"Application error: a client-side"
    ),
}

# Opens the wizard on step N for /onboarding?synthetic_step=N by writing the snapshot the
# wizard itself saves (components/onboarding/OnboardingWizard.tsx). Once per tab and step:
# a reload, which the Connect step can do, must not re-seed over what the wizard saved.
SEED_ONBOARDING_JS = """
(() => {
  if (window.top !== window || location.pathname !== "/onboarding") return;
  const step = new URLSearchParams(location.search).get("synthetic_step");
  if (!step || !/^\\d+$/.test(step)) return;
  try {
    if (sessionStorage.getItem("hd_synthetic_seeded") === step) return;
    localStorage.setItem("hd_onboarding_v1", JSON.stringify({ v: 2, step: Number(step), profile: {} }));
    sessionStorage.setItem("hd_synthetic_seeded", step);
  } catch (e) { /* storage blocked: the wizard stays on step 1 and the check says so */ }
})();
"""

FORM_HYDRATED_JS = """
() => {
  const form = document.querySelector("form input[name=password]")?.form;
  return !!form && Object.keys(form).some((k) => k.startsWith("__reactProps$"));
}
"""

# Signed-in screenshots keep the layout and lose the person: the account is a test one,
# but the artifacts of a public repo can be downloaded by anyone.
LAYOUT_ONLY_CSS = """
*, *::before, *::after, ::placeholder { color: transparent !important; text-shadow: none !important; }
svg text, svg tspan { fill: transparent !important; stroke: transparent !important; }
img, video, canvas, iframe, picture { visibility: hidden !important; }
"""

EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
JWT = re.compile(r"eyJ[\w-]{6,}\.[\w-]{6,}\.[\w-]*")
URL_TAIL = re.compile(r"(https?://[^\s?#\"'<>]+)[?#][^\s\"'<>]*")
UUID = re.compile(
    r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.IGNORECASE
)
LONG_NUMBER = re.compile(r"\+?\d(?:[\s().-]{0,2}\d){6,}")
MAX_LINE = 240


def _scrub(text: str) -> str:
    """One report line from text a page produced. The log is public: whatever a console
    message carries (an email, a token in a URL, a phone number) is cut out first."""
    account = os.environ.get("SYNTHETIC_EMAIL", "").strip()
    if account:
        text = text.replace(account, "<email>").replace(
            quote(account, safe=""), "<email>"
        )
    text = EMAIL.sub("<email>", text)
    text = JWT.sub("<token>", text)
    text = URL_TAIL.sub(
        r"\1", text
    )  # query strings and fragments carry tokens and emails
    text = UUID.sub("<id>", text)
    text = LONG_NUMBER.sub("<number>", text)
    text = " ".join(text.split())
    return text if len(text) <= MAX_LINE else text[: MAX_LINE - 1] + "…"


class CheckError(Exception):
    pass


@dataclass
class Result:
    viewport: str
    name: str
    ok: bool
    note: str = ""
    errors: list[str] = field(default_factory=list)
    first_try: str = ""  # why the first attempt failed, when the retry is what passed
    shot: str = ""


class Recorder:
    """Uncaught errors, console errors and 5xx from our hosts, for the running check."""

    def __init__(self, page: Page):
        self.errors: list[str] = []
        page.on("pageerror", self._pageerror)
        page.on("console", self._console)
        page.on("response", self._response)

    def _pageerror(self, exc) -> None:
        self.errors.append(f"pageerror: {exc.name}: {exc.message}")

    def _console(self, msg) -> None:
        if msg.type != "error":
            return
        where = urlparse((msg.location or {}).get("url") or "")
        suffix = f" ({where.hostname}{where.path})" if where.hostname else ""
        self.errors.append(f"console.error: {msg.text}{suffix}")

    def _response(self, resp) -> None:
        if resp.status < 500:
            return
        url = urlparse(resp.url)
        if url.hostname in OUR_HOSTS:
            self.errors.append(
                f"HTTP {resp.status} {resp.request.method} {url.hostname}{url.path}"
            )

    def take(self) -> list[str]:
        """Everything since the last call, noise dropped, scrubbed."""
        got, self.errors = self.errors, []
        return [_scrub(e) for e in got if not any(p.search(e) for p in KNOWN_NOISE)]


class Evidence:
    """Failure screenshots and the report, in a folder of their own per run."""

    def __init__(self, root: Path, full: bool):
        self.dir = root / datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
        self.full = full

    def shoot(self, page: Page, viewport: str, name: str, signed_in: bool) -> str:
        self.dir.mkdir(parents=True, exist_ok=True)
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "root"
        path = self.dir / f"{viewport}-{slug}.png"
        try:
            if signed_in and not self.full:
                page.screenshot(
                    path=path,
                    full_page=True,
                    animations="disabled",
                    style=LAYOUT_ONLY_CSS,
                    mask=[page.locator("input, textarea, select")],
                    timeout=ELEMENT_TIMEOUT_MS,
                )
            else:
                page.screenshot(
                    path=path,
                    full_page=True,
                    animations="disabled",
                    timeout=ELEMENT_TIMEOUT_MS,
                )
        except PlaywrightError as e:
            return f"no screenshot ({_scrub(str(e).splitlines()[0])})"
        return path.name

    def write_report(self, report: str) -> None:
        self.dir.mkdir(parents=True, exist_ok=True)
        (self.dir / "report.txt").write_text(report + "\n")


# ── checks ──────────────────────────────────────────────────────────────────────────────


def _visit(page: Page, path: str) -> None:
    resp = page.goto(SITE + path, wait_until="domcontentloaded", timeout=NAV_TIMEOUT_MS)
    if resp is None:
        raise CheckError("no response")
    if resp.status != 200:
        raise CheckError(f"HTTP {resp.status}")


def _expect(page: Page, locator: Locator, what: str, path: str) -> None:
    """`what` is visible and the page is still `path` (a lost session ends on /login)."""
    expected = urlparse(SITE + path).path
    try:
        locator.first.wait_for(state="visible", timeout=ELEMENT_TIMEOUT_MS)
    except PlaywrightError:
        landed = urlparse(page.url).path
        if landed != expected:
            raise CheckError(f"{what} missing: ended on {landed}") from None
        for screen, text in FAILURE_SCREENS.items():
            if page.get_by_text(text).count():
                raise CheckError(f"{what} missing: showing {screen}") from None
        raise CheckError(
            f"{what} not visible in {ELEMENT_TIMEOUT_MS // 1000} s"
        ) from None
    landed = urlparse(page.url).path
    if landed != expected:
        raise CheckError(f"ended on {landed}, not {expected}")


def public_page(path: str, selector: str, what: str) -> Callable[[Page], str]:
    def check(page: Page) -> str:
        _visit(page, path)
        _expect(page, page.locator(selector), what, path)
        return what

    return check


def api_health(page: Page) -> str:
    resp = page.request.get(f"{API}/health", timeout=NAV_TIMEOUT_MS)
    if resp.status != 200:
        raise CheckError(f"HTTP {resp.status}")
    try:
        status = (resp.json() or {}).get("status")
    except (ValueError, AttributeError):
        status = None
    if status != "ok":
        raise CheckError("200 but the body is not {status: ok}")
    return "200 ok"


def sign_in(email: str, password: str) -> Callable[[Page], str]:
    def check(page: Page) -> str:
        # A clean slate each attempt: a retry after a half-finished sign-in must type into
        # the form again, not be bounced off /login by the session the first try left.
        page.context.clear_cookies()
        _opt_out_of_ads(page.context)
        _visit(page, "/login")
        _expect(
            page, page.locator("form input[name=password]"), "sign-in form", "/login"
        )
        # The form is in the HTML before React takes it over, and a submit before that is
        # a native POST that middleware.ts answers with a 303 back to /login: the first
        # live run lost its first try to exactly that. React tags each element it has
        # hydrated with __reactProps$…, so wait for the tag on the form.
        try:
            page.wait_for_function(FORM_HYDRATED_JS, timeout=ELEMENT_TIMEOUT_MS)
        except PlaywrightError:
            raise CheckError(
                "sign-in form never hydrated (the page's JS did not run)"
            ) from None
        page.locator("form input[name=email]").fill(email)
        page.locator("form input[name=password]").fill(password)
        page.locator("form button[type=submit]").click()
        try:
            page.wait_for_url(
                lambda u: urlparse(u).path != "/login", timeout=LOGIN_TIMEOUT_MS
            )
        except PlaywrightError:
            raise CheckError(
                f"still on /login after {LOGIN_TIMEOUT_MS // 1000} s (wrong password, or sign-in is down)"
            ) from None
        return f"landed on {urlparse(page.url).path}"

    return check


def dashboard(page: Page) -> str:
    _visit(page, "/dashboard")
    # The keyword input of the search bar (QuickActions). data-testid, not copy: the
    # placeholder changes with the keywords already chosen.
    _expect(
        page,
        page.locator('[data-testid="quick-actions"] input'),
        "search bar",
        "/dashboard",
    )
    return "search bar"


def settings_section(tab: str, heading: str) -> Callable[[Page], str]:
    def check(page: Page) -> str:
        _visit(page, f"/dashboard/settings?tab={tab}")
        # The deep link opened this section (the rail marks it) and the section drew.
        rail = page.locator(f'[data-testid="settings-tab-{tab}"][aria-current="page"]')
        _expect(page, rail, f"rail tab {tab!r}", "/dashboard/settings")
        title = page.get_by_role("heading", name=re.compile(heading, re.IGNORECASE))
        _expect(page, title, f"{tab} heading", "/dashboard/settings")
        return f"{tab} heading"

    return check


def history(page: Page) -> str:
    _visit(page, "/dashboard/history")
    title = page.get_by_role(
        "heading", level=1, name=re.compile(r"\bapplication", re.IGNORECASE)
    )
    _expect(page, title, "history heading", "/dashboard/history")
    return "history heading"


def onboarding_step(step: int) -> Callable[[Page], str]:
    def check(page: Page) -> str:
        _visit(page, f"/onboarding?synthetic_step={step}")
        # The step's own header art says which step is on screen; the heading under it
        # says the step drew. Neither is copy, so a reworded step still passes.
        art = page.locator(f'img[src*="/onboarding/step-{step}."]')
        _expect(page, art, f"step {step} art", "/onboarding")
        _expect(page, page.locator("h2:visible"), f"step {step} heading", "/onboarding")
        return f"step {step} heading"

    return check


# ── runner ──────────────────────────────────────────────────────────────────────────────


def run_check(
    page: Page,
    rec: Recorder,
    evidence: Evidence,
    viewport: str,
    name: str,
    check: Callable[[Page], str],
    signed_in: bool,
    shoot: bool = True,
) -> Result:
    first_try = ""
    for attempt in (1, 2):
        rec.take()  # whatever the previous check left behind is not this check's
        try:
            note = check(page)
            page.wait_for_timeout(SETTLE_MS)
            errors = rec.take()
            if not errors:
                return Result(viewport, name, True, note, first_try=first_try)
            detail = f"{len(errors)} error(s) on the page"
        except (CheckError, PlaywrightError) as e:
            errors = rec.take()
            detail = _scrub(str(e).splitlines()[0] if str(e) else type(e).__name__)
        if attempt == 1:
            first_try = "; ".join([detail, *errors[:2]])
            continue
        shot = evidence.shoot(page, viewport, name, signed_in) if shoot else ""
        return Result(viewport, name, False, detail, errors, first_try, shot)
    raise AssertionError("unreachable")


def _opt_out_of_ads(context) -> None:
    # lib/adPixels.ts: hd_ads_optout=1 keeps the Meta and Google tags off the page.
    context.add_cookies([{"name": "hd_ads_optout", "value": "1", "url": SITE}])


def _session(browser: Browser, options: dict, state: dict | None = None):
    context = browser.new_context(**options, storage_state=state)
    context.set_default_timeout(ELEMENT_TIMEOUT_MS)
    _opt_out_of_ads(context)
    page = context.new_page()
    page.add_init_script(SEED_ONBOARDING_JS)
    return context, page, Recorder(page)


def signed_in_pages(
    page: Page, rec: Recorder, evidence: Evidence, viewport: str
) -> list[Result]:
    checks: list[tuple[str, Callable[[Page], str]]] = [("/dashboard", dashboard)]
    checks += [
        (f"/dashboard/settings?tab={tab}", settings_section(tab, heading))
        for tab, heading in SETTINGS_SECTIONS.items()
    ]
    checks += [("/dashboard/history", history)]
    checks += [(f"/onboarding step {n}", onboarding_step(n)) for n in (1, 10)]
    return [
        run_check(page, rec, evidence, viewport, name, fn, signed_in=True)
        for name, fn in checks
    ]


def journey(
    pw, browser: Browser, email: str, password: str, evidence: Evidence
) -> list[Result]:
    desktop = {"viewport": {"width": 1440, "height": 900}}
    phone = {
        k: v for k, v in pw.devices["Pixel 7"].items() if k != "default_browser_type"
    }
    phone["viewport"] = {"width": 390, "height": 844}
    results: list[Result] = []

    context, page, rec = _session(browser, desktop)
    for path, selector, what in PUBLIC_PAGES:
        check = public_page(path, selector, what)
        results.append(
            run_check(page, rec, evidence, "1440", path, check, signed_in=False)
        )
    results.append(
        run_check(
            page,
            rec,
            evidence,
            "1440",
            "API /health",
            api_health,
            signed_in=False,
            shoot=False,
        )
    )
    context.close()

    context, page, rec = _session(browser, desktop)
    login = run_check(
        page, rec, evidence, "1440", "sign in", sign_in(email, password), signed_in=True
    )
    results.append(login)
    if not login.ok:
        context.close()
        return results
    results += signed_in_pages(page, rec, evidence, "1440")
    # The phone pass rides the same session: a second password sign-in every half hour
    # would only add load on auth, and the session cookies are all a phone visit needs.
    # Held in memory only; never written to disk.
    state = context.storage_state()
    context.close()

    context, page, rec = _session(browser, phone, state)
    results += signed_in_pages(page, rec, evidence, "390")
    context.close()
    return results


def format_report(
    results: list[Result], seconds: float, evidence: Evidence, signed_in: bool
) -> str:
    stamp = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")
    lines = [f"HireDrop synthetic journey: {SITE} at {stamp}"]
    width = max(len(r.name) for r in results)
    for r in results:
        mark = "ok  " if r.ok else "FAIL"
        lines.append(f"  {mark}  {r.viewport:>4}  {r.name:<{width}}  {r.note}".rstrip())
        lines += [f"          {e}" for e in r.errors]
        if r.shot:
            lines.append(f"          screenshot: {r.shot}")
        if r.ok and r.first_try:
            lines.append(f"          passed on retry; first try: {r.first_try}")
    if not signed_in:
        lines.append("  signed-in checks skipped: not signed in")
    failed = sum(not r.ok for r in results)
    retried = sum(r.ok and bool(r.first_try) for r in results)
    summary = f"{len(results)} checks: {len(results) - failed} ok, {failed} failed"
    if retried:
        summary += f" ({retried} only on retry)"
    lines.append(f"{summary}, {seconds:.0f} s")
    if failed:
        lines.append(f"evidence: {evidence.dir}")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument(
        "--artifacts",
        type=Path,
        default=Path(tempfile.gettempdir()) / "hiredrop-synthetic",
        help="where a failing run leaves its screenshots and report (a folder per run)",
    )
    ap.add_argument(
        "--full-screenshots",
        action="store_true",
        help="keep signed-in screenshots readable; local triage only, never in CI",
    )
    args = ap.parse_args()

    email = os.environ.get("SYNTHETIC_EMAIL", "").strip()
    password = os.environ.get("SYNTHETIC_PASSWORD", "")
    if not email or not password:
        print(
            "SYNTHETIC_EMAIL and SYNTHETIC_PASSWORD must be set (the test account).",
            file=sys.stderr,
        )
        return 2

    started = time.monotonic()
    evidence = Evidence(args.artifacts, args.full_screenshots)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        try:
            results = journey(pw, browser, email, password, evidence)
        finally:
            browser.close()

    signed_in = any(r.name == "sign in" and r.ok for r in results)
    report = format_report(results, time.monotonic() - started, evidence, signed_in)
    print(report)
    failed = [r for r in results if not r.ok]
    if not failed:
        return 0
    evidence.write_report(report)
    if os.environ.get("GITHUB_ACTIONS") == "true":
        # One annotation per failure, so the run page says what broke without opening the log.
        for r in failed:
            print(f"::error title=Synthetic journey ({r.viewport})::{r.name}: {r.note}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
