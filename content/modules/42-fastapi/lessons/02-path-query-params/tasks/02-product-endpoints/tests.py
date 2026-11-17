from fastapi.testclient import TestClient

from solution import app

client = TestClient(app)


def ids(response):
    assert response.status_code == 200, response.json()
    return [product["id"] for product in response.json()]


def test_default_is_first_ten():
    """Без параметрів — перші 10 товарів у порядку каталогу (limit за замовчуванням 10)."""
    assert ids(client.get("/products")) == [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]


def test_category():
    """?category=cables — лише кабелі."""
    assert ids(client.get("/products?category=cables")) == [1, 4, 10]


def test_max_price_is_inclusive():
    """max_price включно: price <= max_price."""
    assert ids(client.get("/products?max_price=349")) == [1, 4, 11]


def test_max_price_zero_is_a_real_filter():
    """?max_price=0 — реальний фільтр (нічого не підходить), а не «не задано». Маркер відсутності — None."""
    assert ids(client.get("/products?max_price=0")) == []


def test_in_stock():
    """?in_stock=true — лише stock > 0 (без 3 і 7)."""
    assert ids(client.get("/products?in_stock=true&limit=50")) == [1, 2, 4, 5, 6, 8, 9, 10, 11, 12]


def test_filters_combine():
    """Фільтри діють разом: accessories, до 1600 грн, у наявності."""
    assert ids(client.get("/products?category=accessories&max_price=1600&in_stock=1")) == [2, 6, 8, 9, 11]


def test_limit():
    """?limit=3 — перші три після фільтрів."""
    assert ids(client.get("/products?category=accessories&limit=3")) == [2, 3, 6]


def test_limit_bounds():
    """limit від 1 до 50: 0 і 51 — 422 через Query(ge=1, le=50)."""
    assert client.get("/products?limit=1").status_code == 200
    assert client.get("/products?limit=50").status_code == 200
    assert client.get("/products?limit=0").status_code == 422
    assert client.get("/products?limit=51").status_code == 422


def test_negative_max_price_is_422():
    """max_price >= 0: від'ємна ціна — 422."""
    assert client.get("/products?max_price=-1").status_code == 422


def test_product_by_id():
    """/products/5 — товар з id 5."""
    response = client.get("/products/5")
    assert response.status_code == 200
    assert response.json()["name"] == "27-inch monitor"


def test_missing_product_is_404():
    """Неіснуючий id — 404 з {"detail": "Product not found"}, а не 200 і null."""
    response = client.get("/products/99")
    assert response.status_code == 404
    assert response.json() == {"detail": "Product not found"}


def test_product_id_validation():
    """product_id > 0 і ціле: /products/0 і /products/abc — 422."""
    assert client.get("/products/0").status_code == 422
    assert client.get("/products/abc").status_code == 422
