"""The parts of journey.py that keep the public log clean and the run honest, without a
browser: the scrubber, the noise filter, and the one-retry rule.

    python -m pytest scripts/synthetic

(pytest puts this folder on sys.path itself: it has no __init__.py.)
"""

import journey
import pytest


class FakePage:
    """Just enough of a Playwright page: the listeners Recorder registers, and a clock."""

    def __init__(self):
        self.handlers = {}

    def on(self, event, handler):
        self.handlers[event] = handler

    def wait_for_timeout(self, ms):
        pass


class FakeEvidence:
    def __init__(self):
        self.shots = []

    def shoot(self, page, viewport, name, signed_in):
        self.shots.append((viewport, name, signed_in))
        return f"{viewport}-shot.png"


class Obj:
    def __init__(self, **kw):
        self.__dict__.update(kw)


@pytest.fixture(autouse=True)
def account(monkeypatch):
    monkeypatch.setenv("SYNTHETIC_EMAIL", "someone+test1@example.com")


# ── scrubber ────────────────────────────────────────────────────────────────────────────


def test_scrub_removes_the_account_email_plain_and_url_encoded():
    line = journey._scrub(
        "user someone+test1@example.com at /x/someone%2Btest1%40example.com/profile"
    )
    assert "someone" not in line
    assert line.count("<email>") == 2


def test_scrub_removes_any_email_token_query_id_and_phone():
    line = journey._scrub(
        "fetch https://api.example.com/v1/x?email=a%40b.co&token=abc#frag failed for "
        "jane.doe@gmail.com with eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig-nature_1 "
        "user 3f2b8c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f phone +1 (808) 555-0142"
    )
    assert "email=" not in line and "token=abc" not in line and "#frag" not in line
    assert "https://api.example.com/v1/x" in line
    assert "jane.doe" not in line
    assert "eyJ" not in line
    assert "3f2b8c1e" not in line
    assert "555" not in line
    assert "<token>" in line and "<id>" in line and "<number>" in line


def test_scrub_keeps_statuses_and_paths_readable():
    line = journey._scrub(
        "HTTP 502 GET web-production-db45.up.railway.app/api/v1/stats"
    )
    assert line == "HTTP 502 GET web-production-db45.up.railway.app/api/v1/stats"


def test_scrub_is_one_bounded_line():
    line = journey._scrub("a\n  b\t" + "x" * 1000)
    assert "\n" not in line and line.startswith("a b ")
    assert len(line) == journey.MAX_LINE and line.endswith("…")


# ── recorder ────────────────────────────────────────────────────────────────────────────


def test_recorder_keeps_console_errors_drops_known_noise_and_other_levels():
    page = FakePage()
    rec = journey.Recorder(page)
    noise = (
        "Framing 'https://accounts.google.com/' violates the following report-only "
        "Content Security Policy directive: \"frame-ancestors 'self'\". The violation has "
        "been logged, but no further action has been taken."
    )
    page.handlers["console"](Obj(type="error", text=noise, location={"url": ""}))
    page.handlers["console"](Obj(type="warning", text="deprecated", location={}))
    page.handlers["console"](
        Obj(
            type="error",
            text="boom for someone+test1@example.com",
            location={"url": "https://hiredrop.io/_next/x.js?v=1"},
        )
    )
    page.handlers["pageerror"](Obj(name="TypeError", message="x is undefined"))
    assert rec.take() == [
        "console.error: boom for <email> (hiredrop.io/_next/x.js)",
        "pageerror: TypeError: x is undefined",
    ]
    assert rec.take() == []


def test_recorder_counts_only_5xx_from_our_hosts():
    page = FakePage()
    rec = journey.Recorder(page)

    def resp(status, url):
        return Obj(status=status, url=url, request=Obj(method="GET"))

    page.handlers["response"](resp(503, "https://hiredrop.io/dashboard?tab=x"))
    page.handlers["response"](
        resp(500, "https://msxjcjzmfruizbgkssxo.supabase.co/rest/v1/profiles")
    )
    page.handlers["response"](resp(404, "https://hiredrop.io/missing"))
    page.handlers["response"](resp(502, "https://accounts.google.com/gsi/client"))
    assert rec.take() == [
        "HTTP 503 GET hiredrop.io/dashboard",
        "HTTP 500 GET msxjcjzmfruizbgkssxo.supabase.co/rest/v1/profiles",
    ]


# ── one retry ───────────────────────────────────────────────────────────────────────────


def _run(check, **kw):
    page = FakePage()
    rec = journey.Recorder(page)
    evidence = FakeEvidence()
    result = journey.run_check(page, rec, evidence, "1440", "/x", check(page), **kw)
    return result, evidence


def test_a_check_that_passes_on_the_retry_is_ok_with_the_first_failure_kept():
    def check(page):
        calls = []

        def run(_page):
            calls.append(1)
            if len(calls) == 1:
                raise journey.CheckError("search bar not visible in 15 s")
            return "search bar"

        return run

    result, evidence = _run(check, signed_in=True)
    assert result.ok and result.note == "search bar"
    assert result.first_try == "search bar not visible in 15 s"
    assert evidence.shots == []


def test_errors_on_the_page_fail_a_check_whose_element_showed():
    def check(page):
        def run(_page):
            page.handlers["pageerror"](Obj(name="Error", message="hydration failed"))
            return "search bar"

        return run

    result, evidence = _run(check, signed_in=True)
    assert not result.ok
    assert result.note == "1 error(s) on the page"
    assert result.errors == ["pageerror: Error: hydration failed"]
    assert evidence.shots == [("1440", "/x", True)]
    assert result.shot == "1440-shot.png"


def test_no_screenshot_when_the_check_has_no_page():
    def check(page):
        def run(_page):
            raise journey.CheckError("HTTP 502")

        return run

    result, evidence = _run(check, signed_in=False, shoot=False)
    assert not result.ok and result.note == "HTTP 502" and result.shot == ""
    assert evidence.shots == []


# ── report ──────────────────────────────────────────────────────────────────────────────


def test_report_names_failures_and_says_when_signed_in_checks_were_skipped(tmp_path):
    evidence = journey.Evidence(tmp_path, full=False)
    results = [
        journey.Result("1440", "/", True, "hero heading"),
        journey.Result(
            "1440",
            "sign in",
            False,
            "still on /login after 20 s",
            ["console.error: x"],
            shot="1440-sign-in.png",
        ),
    ]
    report = journey.format_report(results, 12.3, evidence, signed_in=False)
    assert "FAIL  1440  sign in  still on /login after 20 s" in report
    assert "console.error: x" in report and "screenshot: 1440-sign-in.png" in report
    assert "signed-in checks skipped: not signed in" in report
    assert "2 checks: 1 ok, 1 failed, 12 s" in report
    assert str(evidence.dir) in report
