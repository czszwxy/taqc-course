from solution import make_price_lookup

PRICES = {1: 499, 2: 1299, 3: 89, 42: 2999}


def fake_service():
    calls = []

    def fetch_price(product_id):
        calls.append(product_id)
        return PRICES[product_id]

    return fetch_price, calls


def test_returns_the_price():
    fetch, calls = fake_service()
    assert make_price_lookup(fetch)(42) == 2999


def test_service_is_called_once_per_product():
    """Повторний запит того самого товару — з кешу, без виклику fetch_price."""
    fetch, calls = fake_service()
    price = make_price_lookup(fetch)
    price(42)
    price(42)
    price(1)
    assert calls == [42, 1]


def test_different_id_formats_share_one_entry():
    """Перетвори id на int(str(product_id).strip()) до звернення до кешу."""
    fetch, calls = fake_service()
    price = make_price_lookup(fetch)
    assert [price(42), price("42"), price(" 42 ")] == [2999, 2999, 2999]
    assert calls == [42]


def test_least_recently_used_product_is_evicted():
    """maxsize=2: після 1, 2, знову 1 і нового 3 випадає 2 — ним найдовше не користувались."""
    fetch, calls = fake_service()
    price = make_price_lookup(fetch, maxsize=2)
    for product_id in (1, 2, 1, 3):
        price(product_id)
    calls.clear()
    price(1)
    price(2)
    assert calls == [2]


def test_clear_empties_the_cache():
    """price.clear = cached.cache_clear."""
    fetch, calls = fake_service()
    price = make_price_lookup(fetch)
    price(3)
    price.clear()
    price(3)
    assert calls == [3, 3]


def test_each_lookup_has_its_own_cache():
    """Кеш створюється всередині make_price_lookup — свій для кожного виклику."""
    fetch, calls = fake_service()
    make_price_lookup(fetch)(2)
    make_price_lookup(fetch)(2)
    assert calls == [2, 2]
