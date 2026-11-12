from solution import price_index

PRODUCTS = [
    {"id": 1, "name": "Mouse", "price": 450, "in_stock": True},
    {"id": 2, "name": "Keyboard", "price": 1200, "in_stock": False},
    {"id": 3, "name": "Cable", "price": 150, "in_stock": True},
]


def test_in_stock_only():
    """Товари з in_stock False не включай."""
    assert price_index(PRODUCTS) == {1: 450, 3: 150}


def test_key_is_id():
    """Ключ — id товару (число), значення — ціна."""
    assert price_index([{"id": 7, "name": "Hub", "price": 990, "in_stock": True}]) == {7: 990}


def test_nothing_in_stock():
    assert price_index([PRODUCTS[1]]) == {}


def test_empty():
    assert price_index([]) == {}
