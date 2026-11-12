from solution import group_by_status


def test_groups():
    assert group_by_status([("login", "passed"), ("cart", "failed"), ("search", "passed")]) == {
        "passed": ["login", "search"],
        "failed": ["cart"],
    }


def test_single_status():
    """Новий статус — новий список: setdefault(status, [])."""
    assert group_by_status([("a", "skipped")]) == {"skipped": ["a"]}


def test_empty():
    assert group_by_status([]) == {}
