import pytest

from shop.catalog import PRODUCTS


def test_health(client):
    """GET /health/ — 200 і {"status": "ok"} як JSON (JsonResponse, а не dict)."""
    response = client.get("/health/")
    assert response.status_code == 200
    assert response["Content-Type"] == "application/json"
    assert response.json() == {"status": "ok"}


def test_product_list(client):
    """GET /products/ — увесь список (JsonResponse(..., safe=False))."""
    response = client.get("/products/")
    assert response.status_code == 200
    assert response.json() == PRODUCTS


def test_category_filter(client):
    """?category=cables — лише кабелі."""
    assert [p["id"] for p in client.get("/products/?category=cables").json()] == [1, 3]


def test_unknown_category_is_empty(client):
    """Невідома категорія — порожній список, а не помилка."""
    response = client.get("/products/?category=toys")
    assert response.status_code == 200
    assert response.json() == []


def test_product_detail(client):
    """GET /products/2/ — товар з id 2."""
    assert client.get("/products/2/").json() == PRODUCTS[1]


def test_missing_product_is_json_404(client):
    """Немає товару — 404 з {"detail": "Product not found"} (JsonResponse(..., status=404))."""
    response = client.get("/products/42/")
    assert response.status_code == 404
    assert response.json() == {"detail": "Product not found"}


@pytest.mark.parametrize("path", ["/health/", "/products/", "/products/1/"])
def test_only_get(client, path):
    """POST на ці адреси — 405: познач view декоратором @require_GET."""
    assert client.post(path).status_code == 405
