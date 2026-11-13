"""A small, offline subset of pytest for my-university tasks (the real pytest is not loaded in the browser).

Provides: raises, approx, fail, skip, param, mark.parametrize (ids), marks (skip, skipif, xfail, usefixtures,
custom markers), fixture (scopes function / module / session, autouse).
The runner (qa_runner.py) collects tests, expands parametrize, applies marks and resolves fixtures,
including the built-in tmp_path, capsys and monkeypatch.
"""

import inspect
import math
import re


class _RaisesContext:
    def __init__(self, expected, match=None):
        self.expected = expected
        self.match = match
        self.value = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        name = getattr(self.expected, "__name__", str(self.expected))
        if exc_type is None:
            raise AssertionError(f"DID NOT RAISE {name}")
        if not issubclass(exc_type, self.expected):
            return False
        if self.match is not None and not re.search(self.match, str(exc)):
            raise AssertionError(f"Regex pattern {self.match!r} did not match {str(exc)!r}")
        self.value = exc
        return True


def raises(expected_exception, *, match=None):
    """with pytest.raises(ValueError, match="positive"): ..."""
    return _RaisesContext(expected_exception, match)


class approx:
    """pytest.approx: compares numbers (or lists of numbers) with a tolerance."""

    def __init__(self, expected, rel=1e-6, abs=1e-12):
        self.expected = expected
        self.rel = rel
        self.abs = abs

    def _close(self, actual, expected):
        return math.isclose(actual, expected, rel_tol=self.rel, abs_tol=self.abs)

    def __eq__(self, actual):
        if isinstance(self.expected, (list, tuple)):
            return (
                isinstance(actual, (list, tuple))
                and len(actual) == len(self.expected)
                and all(self._close(a, e) for a, e in zip(actual, self.expected))
            )
        try:
            return self._close(actual, self.expected)
        except TypeError:
            return False

    def __repr__(self):
        return f"approx({self.expected!r})"


def fail(reason=""):
    raise AssertionError(reason or "failed")


class Skipped(Exception):
    """Raised by pytest.skip(); the runner reports the test as skipped."""

    _qa_skip = True


def skip(reason=""):
    """pytest.skip("reason") — stop the test here and report it as skipped."""
    raise Skipped(reason or "skipped")


class _MarkDecorator:
    """@pytest.mark.<name>(...): records (name, args, kwargs) on a test function or class.

    The runner understands skip, skipif, xfail and usefixtures; other names are custom markers.
    """

    def __init__(self, name, args=(), kwargs=None):
        self.name = name
        self.args = args
        self.kwargs = kwargs or {}

    def __call__(self, *args, **kwargs):
        if len(args) == 1 and not kwargs and (inspect.isfunction(args[0]) or inspect.isclass(args[0])):
            target = args[0]
            target._qa_marks = list(getattr(target, "_qa_marks", [])) + [(self.name, self.args, self.kwargs)]
            return target
        return _MarkDecorator(self.name, self.args + args, {**self.kwargs, **kwargs})


class _Param:
    """One case of parametrize created by pytest.param(...)."""

    _qa_param = True

    def __init__(self, values, id=None, marks=()):
        self.values = values
        self.id = id
        self.marks = list(marks) if isinstance(marks, (list, tuple)) else [marks]


def param(*values, id=None, marks=()):
    """pytest.param(1, 2, id="name", marks=pytest.mark.xfail) — a parametrize case with its own id or marks."""
    return _Param(values, id, marks)


class _Mark:
    def parametrize(self, argnames, argvalues, ids=None):
        def decorate(fn):
            fn._qa_params = getattr(fn, "_qa_params", []) + [(argnames, list(argvalues), ids)]
            return fn

        return decorate

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return _MarkDecorator(name)


mark = _Mark()


def fixture(fn=None, *, scope="function", name=None, autouse=False):
    def decorate(f):
        f._qa_fixture = True
        f._qa_scope = scope
        f._qa_name = name
        f._qa_autouse = autouse
        return f

    return decorate(fn) if fn is not None else decorate
