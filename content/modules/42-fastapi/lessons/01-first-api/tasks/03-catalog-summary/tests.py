import pytest
from fastapi.testclient import TestClient

import catalog
from solution import app

client = TestClient(app)

EXTRA = {"id": 7, "name": "Webcam", "category": "cameras", "price": 1999, "stock": 0}


@pytest.fixture
def extra_product():
    catalog.PRODUCTS.append(EXTRA)
    yield
    catalog.PRODUCTS.remove(EXTRA)


def test_products_returns_the_catalog():
    """GET /products — увесь список PRODUCTS."""
    assert client.get("/products").json() == catalog.PRODUCTS


def test_count():
    """GET /products/count — {"count": len(PRODUCTS)}."""
    response = client.get("/products/count")
    assert response.status_code == 200
    assert response.json() == {"count": 6}


def test_count_follows_the_catalog(extra_product):
    """Кількість рахуй під час запиту: після додавання товару має стати 7."""
    assert client.get("/products/count").json() == {"count": 7}


def test_categories_sorted_unique():
    """Категорії без повторів і за алфавітом: sorted(множина)."""
    assert client.get("/categories").json() == ["accessories", "cables", "monitors"]


def test_categories_follow_the_catalog(extra_product):
    """Нова категорія cameras має з'явитися на своєму місці за алфавітом."""
    assert client.get("/categories").json() == ["accessories", "cables", "cameras", "monitors"]


def test_stats():
    """in_stock — stock > 0, out_of_stock — stock == 0, stock_value — сума price * stock."""
    assert client.get("/stats").json() == {"in_stock": 5, "out_of_stock": 1, "stock_value": 86_860}


def test_stats_follow_the_catalog(extra_product):
    """Товар зі stock 0 додає один out_of_stock і не змінює stock_value."""
    assert client.get("/stats").json() == {"in_stock": 5, "out_of_stock": 2, "stock_value": 86_860}
