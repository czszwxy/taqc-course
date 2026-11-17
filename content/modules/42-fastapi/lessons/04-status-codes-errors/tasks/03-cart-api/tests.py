import importlib

import pytest
from fastapi.testclient import TestClient

import solution


@pytest.fixture
def client():
    # A fresh module for every test: the cart starts empty.
    return TestClient(importlib.reload(solution).app)


def test_empty_cart(client):
    """Порожній кошик — {"items": [], "total": 0}."""
    assert client.get("/cart").json() == {"items": [], "total": 0}


def test_put_sets_quantity_and_returns_the_cart(client):
    """PUT — 200 і кошик з рядком та total."""
    response = client.put("/cart/items/2", json={"quantity": 2})
    assert response.status_code == 200
    assert response.json() == {"items": [{"product_id": 2, "name": "Wireless mouse", "quantity": 2, "line_total": 1798}], "total": 1798}


def test_put_replaces_not_adds(client):
    """Кількість встановлюється: 2, потім 3 — у кошику 3, а не 5."""
    client.put("/cart/items/1", json={"quantity": 2})
    body = client.put("/cart/items/1", json={"quantity": 3}).json()
    assert body["items"][0]["quantity"] == 3


def test_items_sorted_by_product_id(client):
    """Рядки за product_id, total — сума рядків."""
    client.put("/cart/items/5", json={"quantity": 1})
    body = client.put("/cart/items/1", json={"quantity": 2}).json()
    assert [item["product_id"] for item in body["items"]] == [1, 5]
    assert body["total"] == 598 + 8999


def test_unknown_product_is_404(client):
    """Товару немає в каталозі — 404 "Product not found"."""
    response = client.put("/cart/items/42", json={"quantity": 1})
    assert response.status_code == 404
    assert response.json() == {"detail": "Product not found"}


def test_not_enough_stock_is_409(client):
    """Більше, ніж stock — 409 з реальним залишком у тексті; кошик не змінюється."""
    response = client.put("/cart/items/5", json={"quantity": 6})
    assert response.status_code == 409
    assert response.json() == {"detail": "Only 5 left in stock"}
    assert client.get("/cart").json()["items"] == []


def test_exactly_the_stock_is_fine(client):
    """Рівно stock — можна (межа включно)."""
    assert client.put("/cart/items/5", json={"quantity": 5}).status_code == 200


def test_out_of_stock_product_is_409(client):
    """Товар зі stock 0 існує, тож це 409 "Only 0 left in stock", а не 404."""
    response = client.put("/cart/items/3", json={"quantity": 1})
    assert response.status_code == 409
    assert response.json() == {"detail": "Only 0 left in stock"}


def test_quantity_must_be_positive(client):
    """quantity < 1 — 422 від моделі тіла."""
    assert client.put("/cart/items/1", json={"quantity": 0}).status_code == 422


def test_delete_item_is_204_without_body(client):
    """DELETE рядка — 204 і порожнє тіло; товар зникає з кошика."""
    client.put("/cart/items/1", json={"quantity": 1})
    response = client.delete("/cart/items/1")
    assert response.status_code == 204
    assert response.content == b""
    assert client.get("/cart").json()["items"] == []


def test_delete_missing_item_is_404(client):
    """Видалити те, чого немає в кошику, — 404 "Item not in cart"."""
    response = client.delete("/cart/items/2")
    assert response.status_code == 404
    assert response.json() == {"detail": "Item not in cart"}


def test_clear_cart(client):
    """DELETE /cart — 204, кошик порожній."""
    client.put("/cart/items/1", json={"quantity": 1})
    client.put("/cart/items/2", json={"quantity": 1})
    response = client.delete("/cart")
    assert response.status_code == 204
    assert client.get("/cart").json() == {"items": [], "total": 0}
