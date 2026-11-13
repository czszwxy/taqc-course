import pytest

from session import FakeSession
from solution import ProductsApi

BASE = "https://api.test"


def make_api():
    session = FakeSession({
        f"{BASE}/products/1": (200, {"id": 1, "price": 450}),
        f"{BASE}/products/3": (200, {"id": 3, "price": 150}),
        f"{BASE}/products/9": (503, {"error": "maintenance"}),
    })
    return ProductsApi(session, BASE), session


def test_price():
    api, session = make_api()
    assert api.get_price(1) == 450
    assert session.requests == [f"{BASE}/products/1"]


def test_missing_is_none():
    api, session = make_api()
    assert api.get_price(7) is None


def test_server_error():
    """Інший статус — RuntimeError з URL і статусом."""
    api, session = make_api()
    with pytest.raises(RuntimeError, match="GET https://api.test/products/9 failed: 503"):
        api.get_price(9)


def test_total_skips_missing():
    """total використовує get_price і пропускає None."""
    api, session = make_api()
    assert api.total([1, 7, 1, 3]) == 1050
