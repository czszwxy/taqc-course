from solution import run_totals


def test_mixed():
    """Кортеж (усього, passed, failed); skipped — лише в «усього»."""
    assert run_totals(["passed", "failed", "skipped", "passed"]) == (4, 2, 1)


def test_unpacking():
    total, passed, failed = run_totals(["failed"])
    assert (total, passed, failed) == (1, 0, 1)


def test_empty():
    assert run_totals([]) == (0, 0, 0)
