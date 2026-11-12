from solution import build_url

BASE = "https://api.shop.test"


def test_defaults():
    """Значення за замовчуванням: page=1, per_page=10."""
    assert build_url(BASE, "products") == "https://api.shop.test/products?page=1&per_page=10"


def test_page_argument():
    assert build_url(BASE, "orders", 3) == "https://api.shop.test/orders?page=3&per_page=10"


def test_keyword_per_page():
    """Іменований аргумент: per_page=50, page лишається 1."""
    assert build_url(BASE, "orders", per_page=50) == "https://api.shop.test/orders?page=1&per_page=50"


def test_extra_slashes():
    """Прибери / в кінці base і на початку path: rstrip / lstrip."""
    assert build_url(BASE + "/", "/orders") == "https://api.shop.test/orders?page=1&per_page=10"
