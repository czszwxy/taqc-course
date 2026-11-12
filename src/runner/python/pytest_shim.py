"""A small, offline subset of pytest for my-university tasks (the real pytest is not loaded in the browser).

Provides: raises, approx, fail, mark.parametrize, fixture (scopes: function, module, session).
The runner (qa_runner.py) collects test_* functions, expands parametrize and resolves fixtures.
"""

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


class _Mark:
    def parametrize(self, argnames, argvalues):
        def decorate(fn):
            fn._qa_params = getattr(fn, "_qa_params", []) + [(argnames, list(argvalues))]
            return fn

        return decorate

    def __getattr__(self, name):
        # Custom markers (@pytest.mark.smoke) are accepted and ignored.
        def decorate(*args, **kwargs):
            if len(args) == 1 and callable(args[0]) and not kwargs:
                return args[0]
            return lambda fn: fn

        return decorate


mark = _Mark()


def fixture(fn=None, *, scope="function", name=None):
    def decorate(f):
        f._qa_fixture = True
        f._qa_scope = scope
        f._qa_name = name
        return f

    return decorate(fn) if fn is not None else decorate
