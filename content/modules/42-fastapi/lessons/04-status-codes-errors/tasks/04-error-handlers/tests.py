from fastapi.testclient import TestClient

from solution import app

# raise_server_exceptions=False: the client gets the 500 response instead of the exception itself.
client = TestClient(app, raise_server_exceptions=False)


def test_success_is_unchanged():
    """Успішне замовлення — 201 і результат сервісу: 2 кабелі зі знижкою 10 %."""
    response = client.post("/orders", json={"product_id": 1, "quantity": 2, "coupon": "WELCOME10"})
    assert response.status_code == 201
    assert response.json() == {"product_id": 1, "quantity": 2, "total": 538}


def test_product_not_found_is_404():
    """ProductNotFound — 404 з {"error": "product_not_found", "message": ...}."""
    response = client.post("/orders", json={"product_id": 9, "quantity": 1})
    assert response.status_code == 404
    assert response.json() == {"error": "product_not_found", "message": "Product 9 not found"}


def test_handler_works_for_every_endpoint():
    """Обробник діє на всі ендпоінти: GET /products/9 теж дає 404 у тому самому форматі."""
    response = client.get("/products/9")
    assert response.status_code == 404
    assert response.json()["error"] == "product_not_found"


def test_out_of_stock_is_409():
    """OutOfStock — 409, message — текст винятку."""
    response = client.post("/orders", json={"product_id": 5, "quantity": 9})
    assert response.status_code == 409
    assert response.json() == {"error": "out_of_stock", "message": "Only 5 x 27-inch monitor left"}


def test_expired_coupon_is_400():
    """CouponExpired — 400."""
    response = client.post("/orders", json={"product_id": 1, "quantity": 1, "coupon": "SPRING5"})
    assert response.status_code == 400
    assert response.json() == {"error": "coupon_expired", "message": "Coupon SPRING5 has expired"}


def test_other_shop_errors_are_400():
    """Будь-який інший ShopError (UnknownCoupon) — 400 зі своїм code."""
    response = client.post("/orders", json={"product_id": 1, "quantity": 1, "coupon": "FREE"})
    assert response.status_code == 400
    assert response.json() == {"error": "unknown_coupon", "message": "Coupon FREE does not exist"}


def test_bugs_are_500_without_details():
    """Баг (KeyError) — 500 з {"error": "internal_error", "message": "Something went wrong"}, без тексту винятку."""
    response = client.get("/reports/broken")
    assert response.status_code == 500
    assert response.json() == {"error": "internal_error", "message": "Something went wrong"}


def test_validation_is_still_422():
    """Обробники не чіпають перевірку формату: quantity 0 — як і раніше 422."""
    assert client.post("/orders", json={"product_id": 1, "quantity": 0}).status_code == 422
