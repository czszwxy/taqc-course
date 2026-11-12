from solution import slowest_first


def test_descending_duration():
    """Найповільніші першими: тривалість за спаданням."""
    assert slowest_first([("a", 1.0), ("b", 3.0), ("c", 2.0)]) == [("b", 3.0), ("c", 2.0), ("a", 1.0)]


def test_tie_by_name():
    """При однаковій тривалості — за назвою A→Z: ключ (-r[1], r[0])."""
    results = [("test_search", 1.25), ("test_cart", 3.4), ("test_login", 1.25)]
    assert slowest_first(results) == [("test_cart", 3.4), ("test_login", 1.25), ("test_search", 1.25)]


def test_input_unchanged():
    """Не змінюй вхідний список: sorted(), а не .sort()."""
    results = [("a", 1.0), ("b", 2.0)]
    slowest_first(results)
    assert results == [("a", 1.0), ("b", 2.0)]


def test_empty():
    assert slowest_first([]) == []
