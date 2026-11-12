from solution import compare_ids


def test_missing_and_unexpected():
    """missing = expected - actual, unexpected = actual - expected."""
    assert compare_ids([1001, 1002, 1003], [1002, 1003, 1004]) == ({1001}, {1004})


def test_order_does_not_matter():
    assert compare_ids([1, 2], [2, 1]) == (set(), set())


def test_returns_sets():
    """Поверни множини (set), а не списки."""
    missing, unexpected = compare_ids([1], [])
    assert isinstance(missing, set) and isinstance(unexpected, set)


def test_duplicates_ignored():
    assert compare_ids([1, 1, 2], [2, 2, 3]) == ({1}, {3})
