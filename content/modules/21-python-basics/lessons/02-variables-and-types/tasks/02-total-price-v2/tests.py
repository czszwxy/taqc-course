from solution import unit_price


def test_rounded():
    """Округли до 2 знаків: round(..., 2)."""
    assert unit_price("1000", "3") == 333.33


def test_decimal_total():
    """Сума може бути дробовою — float(total), а не int(total)."""
    assert unit_price("99.90", "2") == 49.95


def test_spaces():
    assert unit_price(" 450 ", " 1 ") == 450.0


def test_returns_float():
    assert isinstance(unit_price("10", "2"), float)
