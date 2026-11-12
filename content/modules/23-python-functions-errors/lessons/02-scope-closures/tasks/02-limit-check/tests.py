from solution import make_limit_check


def test_returns_function():
    """Поверни функцію (return check), а не результат її виклику."""
    assert callable(make_limit_check(500))


def test_below_and_above():
    check = make_limit_check(500)
    assert check(320) is True
    assert check(501) is False


def test_boundary_included():
    """Межа включно: value <= limit."""
    assert make_limit_check(500)(500) is True


def test_independent_limits():
    """Кожна фабрика пам'ятає свій limit."""
    api_fast = make_limit_check(500)
    page_fast = make_limit_check(3000)
    assert page_fast(2500) is True
    assert api_fast(2500) is False
