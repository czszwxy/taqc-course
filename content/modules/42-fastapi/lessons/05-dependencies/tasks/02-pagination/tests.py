import pytest
from fastapi.testclient import TestClient

from solution import app

client = TestClient(app)


def item_ids(response):
    assert response.status_code == 200, response.json()
    return [item["id"] for item in response.json()["items"]]


def test_default_page():
    """Без параметрів — сторінка 1 по 5 товарів, total 23, pages 5."""
    body = client.get("/products").json()
    assert [item["id"] for item in body["items"]] == [1, 2, 3, 4, 5]
    assert {key: body[key] for key in ("page", "size", "total", "pages")} == {"page": 1, "size": 5, "total": 23, "pages": 5}


def test_second_page():
    """page=2 — товари 6–10: offset = (page - 1) * size."""
    assert item_ids(client.get("/products?page=2")) == [6, 7, 8, 9, 10]


def test_last_partial_page():
    """Остання сторінка може бути неповною: page=5 — 21, 22, 23."""
    assert item_ids(client.get("/products?page=5")) == [21, 22, 23]


def test_custom_size():
    """size=10 — по 10, pages = ceil(23 / 10) = 3."""
    body = client.get("/products?page=3&size=10").json()
    assert [item["id"] for item in body["items"]] == [21, 22, 23]
    assert body["pages"] == 3


def test_page_beyond_the_end_is_empty():
    """Сторінка за межами — 200 і порожні items, а не помилка."""
    assert item_ids(client.get("/products?page=9")) == []


def test_orders_use_the_same_rules():
    """/orders — та сама пагінація: 12 замовлень, сторінка 3 по 5 — два останні."""
    body = client.get("/orders?page=3&size=5").json()
    assert [item["id"] for item in body["items"]] == [1011, 1012]
    assert (body["total"], body["pages"]) == (12, 3)


@pytest.mark.parametrize("path", ["/products", "/orders"])
@pytest.mark.parametrize("query", ["page=0", "size=0", "size=21", "page=abc"])
def test_invalid_paging_is_422_everywhere(path, query):
    """page >= 1, size від 1 до 20 — на обох ендпоінтах однаково (одна залежність)."""
    assert client.get(f"{path}?{query}").status_code == 422


@pytest.mark.parametrize("path", ["/products", "/orders"])
def test_max_size_is_allowed(path):
    """size=20 — дозволена межа."""
    assert client.get(f"{path}?size=20").json()["size"] == 20
