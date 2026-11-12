from solution import count_by_status


def test_counts():
    """counts[status] = counts.get(status, 0) + 1 — новий ключ не дає KeyError."""
    assert count_by_status(["passed", "failed", "passed", "skipped"]) == {"passed": 2, "failed": 1, "skipped": 1}


def test_key_order():
    """Ключі в порядку першої появи."""
    assert list(count_by_status(["failed", "passed", "failed"])) == ["failed", "passed"]


def test_empty():
    assert count_by_status([]) == {}
