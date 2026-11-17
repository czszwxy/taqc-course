import importlib

import pytest
from fastapi.testclient import TestClient

import subject


@pytest.fixture
def client():
    # A fresh module for every test: no orders yet, ids start from 1.
    return TestClient(importlib.reload(subject).app)


def test_create_order_returns_201(client):
    response = client.post("/orders", json={"product_id": 1, "quantity": 1})
    assert response.status_code == 201


# твій код тут
