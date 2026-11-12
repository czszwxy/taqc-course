from solution import price_after_discount


def test_simple():
    assert price_after_discount(1000, 15) == 850


def test_rounds_down():
    """Дробова частина відкидається: 899.1 → 899, 199.5 → 199."""
    assert price_after_discount(999, 10) == 899
    assert price_after_discount(399, 50) == 199


def test_boundaries():
    """Межі: знижка 0% і 100%."""
    assert price_after_discount(500, 0) == 500
    assert price_after_discount(500, 100) == 0


def test_returns_int():
    """Результат — ціле число: використай // замість /."""
    assert isinstance(price_after_discount(1000, 15), int)
