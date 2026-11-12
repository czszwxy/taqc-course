from solution import days_between


def test_same_month():
    assert days_between("2026-11-12", "2026-11-15") == 3


def test_leap_day():
    """У 2028 є 29 лютого."""
    assert days_between("2028-02-28", "2028-03-01") == 2


def test_negative():
    """end раніше за start — від'ємне число (end - start)."""
    assert days_between("2026-11-15", "2026-11-12") == -3


def test_same_day():
    assert days_between("2026-11-12", "2026-11-12") == 0
