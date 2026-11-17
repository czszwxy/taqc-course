import importlib

import pytest
from fastapi.testclient import TestClient

import solution


@pytest.fixture
def client():
    # A fresh module for every test: ORDERS starts empty and ids start from 1.
    return TestClient(importlib.reload(solution).app)


def order_body(**changes):
    body = {"customer_email": "anna@example.com", "items": [{"product_id": 2, "quantity": 3}]}
    return {**body, **changes}


def error_fields(response):
    assert response.status_code == 422, response.json()
    return [tuple(error["loc"]) for error in response.json()["detail"]]


def test_create_returns_201_and_the_order(client):
    """POST /orders — 201 і OrderOut з unit_price, line_total і total."""
    response = client.post("/orders", json=order_body())
    assert response.status_code == 201
    assert response.json() == {
        "id": 1,
        "customer_email": "anna@example.com",
        "items": [{"product_id": 2, "quantity": 3, "unit_price": 899, "line_total": 2697}],
        "total": 2697,
    }


def test_total_of_several_items(client):
    """total — сума line_total усіх рядків."""
    items = [{"product_id": 1, "quantity": 2}, {"product_id": 6, "quantity": 1}]
    body = client.post("/orders", json=order_body(items=items)).json()
    assert [line["line_total"] for line in body["items"]] == [598, 1299]
    assert body["total"] == 1897


def test_ids_go_up(client):
    """Кожне нове замовлення отримує наступний id: 1, 2, 3."""
    assert [client.post("/orders", json=order_body()).json()["id"] for _ in range(3)] == [1, 2, 3]


def test_note_is_not_in_the_response(client):
    """note приймається, але не повертається: відповідь — лише поля OrderOut."""
    body = client.post("/orders", json=order_body(note="Call before delivery")).json()
    assert set(body) == {"id", "customer_email", "items", "total"}


def test_quantity_bounds(client):
    """quantity від 1 до 10 — Field(ge=1, le=10)."""
    assert client.post("/orders", json=order_body(items=[{"product_id": 2, "quantity": 10}])).status_code == 201
    assert ("body", "items", 0, "quantity") in error_fields(client.post("/orders", json=order_body(items=[{"product_id": 2, "quantity": 0}])))
    assert ("body", "items", 0, "quantity") in error_fields(client.post("/orders", json=order_body(items=[{"product_id": 2, "quantity": 11}])))


def test_items_must_not_be_empty(client):
    """Порожній список items — 422 (Field(min_length=1))."""
    assert ("body", "items") in error_fields(client.post("/orders", json=order_body(items=[])))


def test_at_most_ten_items(client):
    """Не більше 10 рядків у замовленні — Field(max_length=10)."""
    items = [{"product_id": 1, "quantity": 1}] * 11
    assert ("body", "items") in error_fields(client.post("/orders", json=order_body(items=items)))


def test_invalid_email(client):
    """customer_email — EmailStr: "anna" без @ — 422."""
    assert ("body", "customer_email") in error_fields(client.post("/orders", json=order_body(customer_email="anna")))


def test_extra_fields_are_forbidden(client):
    """Зайве поле (наприклад, discount) — 422: model_config = ConfigDict(extra="forbid")."""
    assert ("body", "discount") in error_fields(client.post("/orders", json=order_body(discount=50)))


def test_long_note_is_rejected(client):
    """note — не довше 200 символів."""
    assert ("body", "note") in error_fields(client.post("/orders", json=order_body(note="x" * 201)))


def test_unknown_product_is_404_and_nothing_is_saved(client):
    """Невідомий товар — 404 "Product 99 not found", і замовлення не зберігається (наступне отримає id 1)."""
    items = [{"product_id": 1, "quantity": 1}, {"product_id": 99, "quantity": 1}]
    response = client.post("/orders", json=order_body(items=items))
    assert response.status_code == 404
    assert response.json() == {"detail": "Product 99 not found"}
    assert client.post("/orders", json=order_body()).json()["id"] == 1


def test_get_order(client):
    """GET /orders/{id} повертає те саме, що й POST."""
    created = client.post("/orders", json=order_body(note="secret")).json()
    response = client.get("/orders/1")
    assert response.status_code == 200
    assert response.json() == created


def test_get_missing_order_is_404(client):
    """Неіснуюче замовлення — 404 "Order not found"."""
    response = client.get("/orders/5")
    assert response.status_code == 404
    assert response.json() == {"detail": "Order not found"}
