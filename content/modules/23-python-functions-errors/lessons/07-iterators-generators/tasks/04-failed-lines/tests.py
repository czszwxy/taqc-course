import types

from solution import failed_lines


def test_is_generator():
    assert isinstance(failed_lines([]), types.GeneratorType)


def test_filters_and_strips():
    """Лише рядки з FAILED, без \\n на краях: line.strip()."""
    log = ["PASSED test_login\n", "FAILED test_cart\n", "FAILED test_search"]
    assert list(failed_lines(log)) == ["FAILED test_cart", "FAILED test_search"]


def test_lazy():
    """Не читай усе наперед: віддавай рядок одразу (yield у циклі), без list(lines)."""

    def growing_log():
        yield "FAILED test_login\n"
        raise RuntimeError("the log is still being written")

    gen = failed_lines(growing_log())
    assert next(gen) == "FAILED test_login"


def test_nothing_failed():
    assert list(failed_lines(["PASSED a", "SKIPPED b"])) == []
