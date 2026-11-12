from solution import slow_requests


def test_keeps_order():
    """Порядок як у вхідному списку."""
    assert slow_requests([120, 85, 340, 95, 101], 100) == [120, 340, 101]


def test_boundary_is_not_slow():
    """Рівно limit — не повільний: використай >, а не >=."""
    assert slow_requests([100, 101], 100) == [101]


def test_none_slow():
    assert slow_requests([50, 60], 100) == []


def test_empty():
    assert slow_requests([], 100) == []
