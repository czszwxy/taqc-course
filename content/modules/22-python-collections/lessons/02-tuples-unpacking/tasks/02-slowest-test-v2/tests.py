from solution import fastest_passed


def test_ignores_failed():
    """Найшвидший серед passed — test_cart швидший, але він failed."""
    results = [("test_login", "passed", 1.25), ("test_cart", "failed", 0.3), ("test_search", "passed", 0.8)]
    assert fastest_passed(results) == "test_search"


def test_first_of_equal():
    """При однаковій тривалості — перший: оновлюй лише при строго меншій."""
    assert fastest_passed([("a", "passed", 1.0), ("b", "passed", 1.0)]) == "a"


def test_none_passed():
    assert fastest_passed([("a", "failed", 1.0), ("b", "skipped", 0.1)]) == ""


def test_empty():
    assert fastest_passed([]) == ""
