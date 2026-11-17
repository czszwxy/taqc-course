import copy

import pytest
from fastapi.testclient import TestClient

import catalog
from solution import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh_catalog():
    saved = copy.deepcopy(catalog.PRODUCTS)
    yield
    catalog.PRODUCTS[:] = saved


def test_patch_one_field():
    """Змінюється лише price; name, stock і description лишаються як були."""
    response = client.patch("/products/2", json={"price": 849})
    assert response.status_code == 200
    assert response.json() == {"id": 2, "name": "Wireless mouse", "price": 849, "stock": 12, "description": "Silent clicks, 2.4 GHz"}


def test_change_is_saved():
    """Після PATCH GET показує нове значення — зміни мають потрапити в PRODUCTS."""
    client.patch("/products/1", json={"stock": 35})
    assert client.get("/products/1").json()["stock"] == 35


def test_two_fields():
    """Кілька полів за раз."""
    body = client.patch("/products/3", json={"stock": 4, "description": "Hot-swap switches"}).json()
    assert (body["stock"], body["description"], body["price"]) == (4, "Hot-swap switches", 3499)


def test_null_clears_the_description():
    """{"description": null} очищує опис — бо поле НАДІСЛАЛИ (exclude_unset його залишає)."""
    body = client.patch("/products/2", json={"description": None}).json()
    assert body["description"] is None
    assert body["name"] == "Wireless mouse"


def test_empty_body_changes_nothing():
    """Порожнє тіло {} — нічого не змінюється (а не все стає None)."""
    response = client.patch("/products/1", json={})
    assert response.status_code == 200
    assert response.json() == {"id": 1, "name": "USB-C cable", "price": 299, "stock": 40, "description": "1 m, 60 W"}


def test_supplier_cost_is_hidden():
    """Відповідь — ProductOut: supplier_cost не повертається."""
    assert "supplier_cost" not in client.patch("/products/1", json={"price": 319}).json()


def test_validation():
    """price >= 1, stock >= 0, name від 2 символів — інакше 422 і без змін."""
    assert client.patch("/products/1", json={"price": 0}).status_code == 422
    assert client.patch("/products/1", json={"stock": -1}).status_code == 422
    assert client.patch("/products/1", json={"name": "X"}).status_code == 422
    assert client.get("/products/1").json()["price"] == 299


def test_stock_zero_is_allowed():
    """stock = 0 — допустиме значення (товар закінчився)."""
    assert client.patch("/products/2", json={"stock": 0}).json()["stock"] == 0


def test_unknown_product_is_404():
    """Невідомий товар — 404 "Product not found"."""
    response = client.patch("/products/42", json={"price": 100})
    assert response.status_code == 404
    assert response.json() == {"detail": "Product not found"}
