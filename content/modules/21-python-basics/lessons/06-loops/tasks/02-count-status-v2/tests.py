from solution import count_slow


def test_some_slow():
    assert count_slow([120, 850, 300, 1200], 500) == 2


def test_equal_is_not_slow():
    """Рівне limit — не повільне: умова строго >."""
    assert count_slow([500, 501], 500) == 1


def test_none_slow():
    assert count_slow([100, 200], 500) == 0


def test_empty():
    assert count_slow([], 500) == 0
