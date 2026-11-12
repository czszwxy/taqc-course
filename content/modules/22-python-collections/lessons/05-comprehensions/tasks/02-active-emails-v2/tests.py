from solution import failed_names

RESULTS = [
    {"name": "test_login", "status": "passed"},
    {"name": "test_cart", "status": "failed"},
    {"name": "test_search", "status": "failed"},
    {"name": "test_logout", "status": "skipped"},
]


def test_failed_only():
    """Лише статус "failed"; skipped — не падіння."""
    assert failed_names(RESULTS) == ["test_cart", "test_search"]


def test_returns_names():
    """Поверни назви (r["name"]), а не цілі словники."""
    assert failed_names([{"name": "a", "status": "failed"}]) == ["a"]


def test_none_failed():
    assert failed_names([{"name": "a", "status": "passed"}]) == []
