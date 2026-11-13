from solution import RunReport


def make_report():
    report = RunReport("smoke")
    report.record("test_login", "passed")
    report.record("test_cart", "failed")
    report.record("test_search", "skipped")
    report.record("test_logout", "failed")
    return report


def test_count():
    report = make_report()
    assert report.count("failed") == 2
    assert report.count("passed") == 1


def test_failed_in_order():
    assert make_report().failed() == ["test_cart", "test_logout"]


def test_summary():
    """Усього — разом зі skipped; формат: "smoke: 4 tests, 1 passed, 2 failed"."""
    assert make_report().summary() == "smoke: 4 tests, 1 passed, 2 failed"


def test_empty_report():
    report = RunReport("nightly")
    assert report.failed() == []
    assert report.summary() == "nightly: 0 tests, 0 passed, 0 failed"


def test_reports_are_independent():
    """Кожен звіт має власний список результатів (self.results у __init__)."""
    make_report()
    assert RunReport("other").count("failed") == 0
