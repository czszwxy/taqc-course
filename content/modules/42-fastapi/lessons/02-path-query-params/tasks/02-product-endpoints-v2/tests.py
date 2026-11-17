from fastapi.testclient import TestClient

from solution import app

client = TestClient(app)


def ids(response):
    assert response.status_code == 200, response.json()
    return [order["id"] for order in response.json()]


def test_default_is_first_five():
    """Без параметрів — перші 5 замовлень за id (limit за замовчуванням 5)."""
    assert ids(client.get("/orders")) == [1001, 1002, 1003, 1004, 1005]


def test_status_filter():
    """?status=paid — лише оплачені."""
    assert ids(client.get("/orders?status=paid&limit=20")) == [1001, 1005, 1006, 1008, 1010]


def test_unknown_status_is_422():
    """Статус поза OrderStatus (наприклад, lost) — 422 від FastAPI."""
    assert client.get("/orders?status=lost").status_code == 422


def test_min_total_is_inclusive():
    """min_total включно: total >= min_total (1000 потрапляє)."""
    assert ids(client.get("/orders?status=paid&min_total=1000&limit=20")) == [1001, 1006, 1008, 1010]


def test_min_total_zero_keeps_everything():
    """?min_total=0 — фільтр, що пропускає все; від'ємний — 422."""
    assert len(ids(client.get("/orders?min_total=0&limit=20"))) == 10
    assert client.get("/orders?min_total=-5").status_code == 422


def test_limit_bounds():
    """limit від 1 до 20."""
    assert ids(client.get("/orders?limit=2")) == [1001, 1002]
    assert client.get("/orders?limit=0").status_code == 422
    assert client.get("/orders?limit=21").status_code == 422


def test_order_by_id():
    """/orders/1006 — замовлення 1006."""
    assert client.get("/orders/1006").json()["total"] == 2499


def test_missing_order_is_404():
    """Неіснуюче замовлення — 404 з detail "Order not found"."""
    response = client.get("/orders/42")
    assert response.status_code == 404
    assert response.json() == {"detail": "Order not found"}


def test_order_id_validation():
    """order_id ціле > 0: /orders/0 і /orders/abc — 422."""
    assert client.get("/orders/0").status_code == 422
    assert client.get("/orders/abc").status_code == 422


def test_customer_orders():
    """/customers/anna@shop.test/orders — усі замовлення Анни за id."""
    assert ids(client.get("/customers/anna@shop.test/orders")) == [1001, 1003, 1008]


def test_customer_without_orders_is_empty_list():
    """Покупець без замовлень — 200 і [], а не 404."""
    response = client.get("/customers/nobody@shop.test/orders")
    assert response.status_code == 200
    assert response.json() == []
