"""Grading plugin of Python tasks that run on the learner's computer (`"runtime": "lab"` — FastAPI, Django).

server/lab-python-tasks.ts writes the task files (solution.py, tests.py, support files) into a run folder,
copies this file next to them and starts `python -m pytest tests.py -p qa_task_plugin` in the lab venv.
The results are written as JSON in the same shape as the browser runner (src/runner/python/qa_runner.py), so the
app shows them the same way:

  {"error": str | None, "tests": [{"name", "passed", "error", "hint"}], "stdout": str}

  QA_TASK_RESULT_FILE  where to write the JSON.
"""

import json
import os
import traceback
from pathlib import Path

import pytest

RESULT_FILE = os.environ.get("QA_TASK_RESULT_FILE")
PLUGIN_FILE = Path(__file__).name
DJANGO_SETTINGS = "settings"
UNITTEST_PREFIXES = ("False is not true : ", "True is not false : ")

# Django tasks ship a read-only settings.py: point Django at it and load pytest-django (its client / django_db
# fixtures). pytest-django must be registered before the conftests, so it is loaded here, by this -p plugin.
if (Path.cwd() / f"{DJANGO_SETTINGS}.py").exists():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", DJANGO_SETTINGS)
    pytest_plugins = ["pytest_django.plugin"]
ERROR_LINE = "E   "
NO_TESTS = "No tests found: a test is a function whose name starts with test_, for example def test_health():"

_tests = {}
_order = []
_errors = []
_stdout = []


def _name(nodeid):
    """tests.py::test_create -> test_create, tests.py::TestOrders::test_list -> TestOrders::test_list."""
    return "::".join(nodeid.split("::")[1:]) or nodeid


def _location(exc, root):
    """'solution.py, line 12: return orders[order_id]' — the last line of the task's own files in the traceback."""
    frames = traceback.extract_tb(exc.__traceback__) if exc.__traceback__ else []
    # The task's files may live in folders (shop/views.py): any file under the run folder except this plugin.
    own = [f for f in frames if Path(f.filename).is_relative_to(root) and Path(f.filename).name != PLUGIN_FILE]
    if not own:
        return ""
    last = own[-1]
    line = (last.line or "").strip()
    return f"{Path(last.filename).relative_to(root).as_posix()}, line {last.lineno}" + (f": {line}" if line else "")


def _describe(excinfo, report, root):
    exc = excinfo.value
    if isinstance(exc, AssertionError):
        # pytest's own explanation: "assert 404 == 201\n +  where 404 = <Response [404 Not Found]>.status_code"
        crash = getattr(report.longrepr, "reprcrash", None)
        message = crash.message if crash is not None else (str(exc) or "assert failed")
        # The first lines compare the values (shown in full: pytest runs with -vv); the long diff after a blank line is dropped.
        lines = message.removeprefix("AssertionError: ").splitlines()
        blank = next((i for i, line in enumerate(lines) if not line.strip()), len(lines))
        message = "\n".join(lines[:blank])
        # Django's assertions (assertContains, assertTemplateUsed…) are unittest checks: drop "False is not true : ".
        for prefix in UNITTEST_PREFIXES:
            message = message.removeprefix(prefix)
    else:
        message = f"{type(exc).__name__}: {exc}" if str(exc) else type(exc).__name__
    where = _location(exc, root)
    return message + (f"\n  at {where}" if where else "")


@pytest.hookimpl(wrapper=True)
def pytest_runtest_makereport(item, call):
    report = yield
    if report.failed and call.excinfo is not None:
        report.qa_error = _describe(call.excinfo, report, Path(item.config.rootpath))
        report.qa_hint = (getattr(item, "obj", None).__doc__ or "").strip() if getattr(item, "obj", None) else ""
    return report


def pytest_runtest_logreport(report):
    name = _name(report.nodeid)
    if name not in _tests:
        _tests[name] = {"name": name, "passed": True, "error": "", "hint": ""}
        _order.append(name)
    case = _tests[name]
    if report.when == "call":
        # print() output of the test (and of the code it calls) — the call report also carries the setup phase's output.
        _stdout.extend(text for title, text in report.sections if "stdout" in title)
    if report.skipped and not hasattr(report, "wasxfail"):
        reason = report.longrepr[2] if isinstance(report.longrepr, tuple) else "skipped"
        case["name"] = f"{name} (skipped: {reason.removeprefix('Skipped: ')})"
    elif report.skipped:
        case["name"] = f"{name} (xfail)"
    if report.failed and case["passed"]:
        case["passed"] = False
        case["error"] = getattr(report, "qa_error", "") or report.longreprtext.strip()
        case["hint"] = getattr(report, "qa_hint", "")
        if hasattr(report, "wasxfail"):
            case["error"] = "[XPASS(strict)] the test was expected to fail but passed"


def _short_collect_error(text):
    """A SyntaxError / ImportError while loading the files: keep pytest's "E   …" lines, not its import traceback."""
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
        errors.append(NO_TESTS)
    payload = {
        "error": "\n\n".join(errors) or None,
        "tests": [] if errors else [_tests[name] for name in _order],
        "stdout": "".join(_stdout),
    }
    Path(RESULT_FILE).write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
