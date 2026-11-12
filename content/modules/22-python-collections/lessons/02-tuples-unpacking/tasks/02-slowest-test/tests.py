from solution import slowest

RESULTS = [
    ("test_login", "passed", 1.25),
    ("test_cart", "failed", 3.4),
    ("test_search", "passed", 0.8),
]


def test_finds_slowest():
    """Поверни назву (перший елемент кортежу), а не тривалість."""
    assert slowest(RESULTS) == "test_cart"


def test_first_of_equal():
    """При однаковій тривалості — перший: оновлюй лише при строго більшій."""
    assert slowest([("a", "passed", 2.0), ("b", "passed", 2.0)]) == "a"


def test_single():
    assert slowest([("only", "passed", 0.1)]) == "only"


def test_empty():
    assert slowest([]) == ""
