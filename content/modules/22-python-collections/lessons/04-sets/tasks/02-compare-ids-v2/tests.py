from solution import added_removed


def test_added_and_removed():
    before = ["test_cart", "test_login"]
    after = ["test_login", "test_search", "test_checkout"]
    assert added_removed(before, after) == (["test_checkout", "test_search"], ["test_cart"])


def test_returns_sorted_lists():
    """Поверни відсортовані списки, а не множини: sorted(...)."""
    added, removed = added_removed([], ["b", "a"])
    assert added == ["a", "b"]
    assert removed == []


def test_no_changes():
    assert added_removed(["a"], ["a"]) == ([], [])
