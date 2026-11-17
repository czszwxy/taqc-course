import pytest
from fastapi.testclient import TestClient

import orders
from solution import app

client = TestClient(app)

EXTRA = {"id": 1006, "customer": "ivan@shop.test", "status": "returned", "total": 500}


@pytest.fixture
def extra_order():
    orders.ORDERS.append(EXTRA)
    yield
    orders.ORDERS.remove(EXTRA)


def test_orders_returns_the_list():
    """GET /orders — увесь список ORDERS."""
    assert client.get("/orders").json() == orders.ORDERS


def test_statuses_sorted_unique():
    """Статуси без повторів і за алфавітом."""
    assert client.get("/statuses").json() == ["cancelled", "new", "paid", "shipped"]


def test_statuses_follow_the_data(extra_order):
    """Новий статус returned має з'явитися на своєму місці — рахуй під час запиту."""
    assert client.get("/statuses").json() == ["cancelled", "new", "paid", "returned", "shipped"]


def test_revenue():
    """orders — усі, крім cancelled; revenue — сума total лише paid і shipped."""
    assert client.get("/revenue").json() == {"orders": 4, "revenue": 10_845}


def test_revenue_follows_the_data(extra_order):
    """Замовлення returned рахується в orders, але не у виручці."""
    assert client.get("/revenue").json() == {"orders": 5, "revenue": 10_845}


def test_customers_count():
    """Покупець з двома замовленнями — один покупець: рахуй множину email."""
    assert client.get("/customers/count").json() == {"count": 4}


def test_customers_count_follows_the_data(extra_order):
    """Ще одне замовлення того самого покупця не додає нового."""
    assert client.get("/customers/count").json() == {"count": 4}
