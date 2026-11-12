from solution import total_price


def test_basic():
    """Перетвори рядки на числа: float(price) * int(quantity)."""
    assert total_price("19.99", "3") == 59.97


def test_spaces():
    """int() і float() самі пропускають пробіли по краях рядка."""
    assert total_price(" 5.5 ", " 2 ") == 11.0


def test_zero_quantity():
    assert total_price("100", "0") == 0


def test_returns_float():
    """Поверни float, а не рядок."""
    assert isinstance(total_price("10", "2"), float)


def test_rounding():
    """Округли результат до 2 знаків: round(x, 2)."""
    assert total_price("0.1", "3") == 0.3
