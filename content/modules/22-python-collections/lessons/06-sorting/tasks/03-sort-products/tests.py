from solution import sort_products

PRODUCTS = [
    {"name": "mouse", "price": 450},
    {"name": "Cable", "price": 150},
    {"name": "Adapter", "price": 450},
    {"name": "keyboard", "price": 1200},
]


def test_by_price_then_name():
    assert sort_products(PRODUCTS) == ["Cable", "Adapter", "mouse", "keyboard"]


def test_price_is_numeric():
    """Сортуй за числом ціни: 900 дешевше за 1200."""
    assert sort_products([{"name": "a", "price": 1200}, {"name": "b", "price": 900}]) == ["b", "a"]


def test_tie_ignores_case():
    """При однаковій ціні порівнюй назви без регістру: p["name"].lower()."""
    assert sort_products([{"name": "Banana", "price": 100}, {"name": "apple", "price": 100}]) == ["apple", "Banana"]


def test_returns_names():
    """Поверни назви, а не словники."""
    assert sort_products([{"name": "Hub", "price": 990}]) == ["Hub"]


def test_empty():
    assert sort_products([]) == []
