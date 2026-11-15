"""Grading plugin of the Python Playwright lab.

server/lab-python.ts copies this file into every graded run folder as conftest.py and starts one pytest
process per page variant (the correct page + one per bug). The variant comes in the environment:

  QA_LAB_BUGS         "none" or one bug id; appended to the browser user agent as "qa-lab-bugs=<id>",
                      which the Bug Playground pages (and the mock API) read to turn that bug on.
  QA_LAB_RESULT_FILE  where to write the results as JSON (tests with status/duration/error + load errors).

The same timeouts as the TypeScript lab: expect 3 s, actions 5 s (navigation 15 s).
"""

import json
import os
import traceback
from pathlib import Path

import pytest
from playwright.sync_api import expect

BUGS = os.environ.get("QA_LAB_BUGS", "none")
RESULT_FILE = os.environ.get("QA_LAB_RESULT_FILE")
DEVICE = "Desktop Chrome"
BROWSER_ID = "chromium"
TITLE_SEPARATOR = " › "
ARIA_SNAPSHOT = "\nAria snapshot:"
ERROR_LINE = "E   "

EXPECT_TIMEOUT_MS = 3_000
ACTION_TIMEOUT_MS = 5_000
NAVIGATION_TIMEOUT_MS = 15_000

expect.set_options(timeout=EXPECT_TIMEOUT_MS)


def _user_agent(playwright):
    return f"{playwright.devices[DEVICE]['user_agent']} qa-lab-bugs={BUGS}"


@pytest.fixture(scope="session")
def browser_type_launch_args(browser_type_launch_args, playwright):
    # The browser's own default user agent: also covers contexts the test creates with browser.new_context().
    args = [*browser_type_launch_args.get("args", []), f"--user-agent={_user_agent(playwright)}"]
    return {**browser_type_launch_args, "args": args}


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args, playwright):
    return {**browser_context_args, "user_agent": _user_agent(playwright)}


@pytest.fixture(scope="session", autouse=True)
def _lab_api_user_agent(playwright):
    # API tests (playwright.request.new_context) carry the same marker, so mock-API bugs are graded too.
    original = playwright.request.new_context

    def new_context(*args, **kwargs):
        kwargs.setdefault("user_agent", _user_agent(playwright))
        return original(*args, **kwargs)

    playwright.request.new_context = new_context
    yield
    playwright.request.new_context = original


@pytest.fixture
def context(context):
    context.set_default_timeout(ACTION_TIMEOUT_MS)
    context.set_default_navigation_timeout(NAVIGATION_TIMEOUT_MS)
    return context


# ---------- results ----------

_results = {}
_errors = []


def _without_browser(name):
    """test_login[chromium] -> test_login, test_login[chromium-admin] / [admin-chromium] -> test_login[admin]."""
    base, bracket, rest = name.partition("[")
    if not bracket:
        return name
    ids = rest[:-1]
    if ids == BROWSER_ID:
        return base
    if ids.startswith(BROWSER_ID + "-"):
        return f"{base}[{ids[len(BROWSER_ID) + 1:]}]"
    if ids.endswith("-" + BROWSER_ID):
        return f"{base}[{ids[:-len(BROWSER_ID) - 1]}]"
    return name


def _title(nodeid):
    parts = nodeid.split("::")[1:]
    return TITLE_SEPARATOR.join([*parts[:-1], _without_browser(parts[-1])]) if parts else nodeid


def _learner_line(exc, root):
    """'test_learner.py:12: expect(page).to_have_title(...)' — the learner's own line where the test failed."""
    frames = traceback.extract_tb(exc.__traceback__) if exc.__traceback__ else []
    for frame in reversed(frames):
        path = Path(frame.filename)
        if path.parent == root and path.name != "conftest.py":
            return f"{path.name}:{frame.lineno}: {(frame.line or '').strip()}"
    return None


def _one_error(exc, root):
    # Playwright appends a long accessibility snapshot of the page; the call log above it is what helps.
    text = str(exc).split(ARIA_SNAPSHOT)[0].strip()
    message = f"{type(exc).__name__}: {text}" if text else type(exc).__name__
    line = _learner_line(exc, root)
    return f"{message}\n\n{line}" if line else message


def _describe(excinfo, root):
    exc = excinfo.value
    argname = getattr(exc, "argname", None)
    if type(exc).__name__ == "FixtureLookupError" and argname:
        return f"fixture '{argname}' not found — check the spelling of the test function's parameters (page, context, browser…)"
    # Several failed expect.soft(...) checks arrive together as an exception group: show each one.
    group = getattr(exc, "exceptions", None)
    if isinstance(group, tuple) and group:
        return "\n\n".join(_one_error(e, root) for e in group)
    return _one_error(exc, root)


@pytest.hookimpl(wrapper=True)
def pytest_runtest_makereport(item, call):
    report = yield
    if report.failed and call.excinfo is not None:
        report.qa_error = _describe(call.excinfo, Path(item.config.rootpath))
    return report


def _status(report):
    if report.passed:
        return "passed"
    if report.failed:
        return "failed"
    # An expected failure (xfail) is a passing test; other skips stay skipped.
    return "passed" if hasattr(report, "wasxfail") else "skipped"


def pytest_runtest_logreport(report):
    entry = _results.setdefault(report.nodeid, {"title": _title(report.nodeid), "status": "passed", "durationMs": 0})
    entry["durationMs"] += round(report.duration * 1000)
    status = _status(report)
    error = getattr(report, "qa_error", None)
    if report.when == "call" or status != "passed":
        if entry["status"] == "passed":
            entry["status"] = status
            if error:
                entry["error"] = error


def _short_collect_error(text):
    """A SyntaxError / ImportError in the learner's file: keep pytest's "E   …" lines, not its own import traceback."""
    lines = [line[len(ERROR_LINE):] for line in text.splitlines() if line.startswith(ERROR_LINE)]
    return "\n".join(lines).strip() or text.strip()


def pytest_collectreport(report):
    if report.failed:
        _errors.append(_short_collect_error(report.longreprtext))


def pytest_sessionfinish(session, exitstatus):
    if not RESULT_FILE:
        return
    root = str(session.config.rootpath) + os.sep
    errors = [e.replace(root, "") for e in _errors]
    if session.testscollected == 0 and not errors:
        errors.append("No tests found: a test is a function whose name starts with test_, for example def test_login(page):")
    payload = {"tests": list(_results.values()), "errors": errors}
    Path(RESULT_FILE).write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
