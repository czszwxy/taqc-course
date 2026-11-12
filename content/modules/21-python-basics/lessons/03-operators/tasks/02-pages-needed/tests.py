from solution import pages_needed


def test_partial_page():
    """25 товарів по 10: дві повні сторінки + одна неповна = 3."""
    assert pages_needed(25, 10) == 3


def test_exact_division():
    """20 по 10 — рівно 2 сторінки, без зайвої порожньої."""
    assert pages_needed(20, 10) == 2


def test_boundaries():
    """Межі: 1 товар — 1 сторінка, 11 товарів — 2."""
    assert pages_needed(1, 10) == 1
    assert pages_needed(11, 10) == 2


def test_empty():
    """0 товарів — 0 сторінок."""
    assert pages_needed(0, 10) == 0
