from solution import make_range_check


def test_returns_function():
    """Поверни функцію (return check), а не результат її виклику."""
    assert callable(make_range_check(1, 10))


def test_boundaries_included():
    """Межі включно: low <= value <= high."""
    valid_age = make_range_check(18, 120)
    assert valid_age(18) is True
    assert valid_age(120) is True
    assert valid_age(17) is False
    assert valid_age(121) is False


def test_independent_ranges():
    valid_age = make_range_check(18, 120)
    valid_qty = make_range_check(1, 99)
    assert valid_qty(0) is False
    assert valid_age(100) is True
    assert valid_qty(100) is False
