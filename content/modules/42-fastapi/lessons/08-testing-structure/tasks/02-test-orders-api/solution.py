import importlib

import pytest
from fastapi.testclient import TestClient

import subject


@pytest.fixture
def client():
    # A fresh module for every test: no orders yet, ids start from 1.
    return TestClient(importlib.reload(subject).app)


def create(client, product_id=2, quantity=3):
    return client.post("/orders", json={"product_id": product_id, "quantity": quantity})


def test_create_order_returns_201(client):
    response = client.post("/orders", json={"product_id": 1, "quantity": 1})
    assert response.status_code == 201


def test_created_order_body(client):
    assert create(client).json() == {"id": 1, "product_id": 2, "quantity": 3, "total": 2697, "status": "new"}


@pytest.mark.parametrize(("quantity", "expected"), [(10, 201), (11, 422), (0, 422)])
def test_quantity_bounds(client, quantity, expected):
    assert create(client, product_id=1, quantity=quantity).status_code == expected


def test_unknown_product_is_404(client):
    assert create(client, product_id=99, quantity=1).status_code == 404


def test_more_than_stock_is_409(client):
    assert create(client, product_id=5, quantity=5).status_code == 201
    assert create(client, product_id=5, quantity=6).status_code == 409


def test_get_order(client):
    created = create(client).json()
    assert client.get("/orders/1").json() == created


def test_missing_order_is_404(client):
    response = client.get("/orders/7")
    assert response.status_code == 404


def test_status_filter(client):
    create(client)
    create(client)
    client.post("/orders/2/ship")
    assert [order["id"] for order in client.get("/orders?status=shipped").json()] == [2]
    assert [order["id"] for order in client.get("/orders?status=new").json()] == [1]
    assert [order["id"] for order in client.get("/orders").json()] == [1, 2]


def test_ship_and_cancel_rules(client):
    create(client)
    create(client)
    assert client.post("/orders/1/ship").json()["status"] == "shipped"
    assert client.post("/orders/1/cancel").status_code == 409
    assert client.post("/orders/2/cancel").json()["status"] == "cancelled"
    assert client.post("/orders/2/cancel").status_code == 409
