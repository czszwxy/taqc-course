from solution import mismatches


def test_one_mismatch():
    """Рядки з 1: enumerate(..., start=1)."""
    assert mismatches(["paid", "shipped", "delivered"], ["paid", "created", "delivered"]) == [(2, "shipped", "created")]


def test_several():
    assert mismatches(["a", "b", "c"], ["x", "b", "y"]) == [(1, "a", "x"), (3, "c", "y")]


def test_all_match():
    assert mismatches(["a", "b"], ["a", "b"]) == []


def test_tuple_order():
    """Кортеж: (номер рядка, очікуване, фактичне)."""
    assert mismatches(["expected"], ["actual"]) == [(1, "expected", "actual")]
