from solution import response_stats


def test_typical():
    """Поверни кортеж (min, max, середнє з 1 знаком)."""
    assert response_stats([120, 80, 200]) == (80, 200, 133.3)


def test_single_value():
    assert response_stats([50]) == (50, 50, 50.0)


def test_empty_list():
    """Порожній список — (0, 0, 0); перевір його першим, до min()."""
    assert response_stats([]) == (0, 0, 0)


def test_returns_tuple():
    """return a, b, c — це кортеж (tuple)."""
    assert isinstance(response_stats([1, 2]), tuple)
