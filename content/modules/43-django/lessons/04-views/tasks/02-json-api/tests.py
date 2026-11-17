import json

import pytest
from django.test import Client

from shop.models import Product

pytestmark = pytest.mark.django_db

URL = "/api/products/"


@pytest.fixture
def products():
    Product.objects.create(name="Wireless mouse", sku="MOUSE-01", price=899, status="active")
    Product.objects.create(name="USB-C cable", sku="CABLE-C1", price=299, status="active")
    Product.objects.create(name="Gaming mouse", sku="MOUSE-02", price=1499, status="active")
    Product.objects.create(name="Secret prototype", sku="PROTO-1", price=9999, status="draft")


def post(client, body):
    return client.post(URL, data=json.dumps(body), content_type="application/json")


def names(response):
    assert response.status_code == 200, response.content
    return [p["name"] for p in response.json()]


def test_list_active_by_name(client, products):
    """GET — лише активні, за назвою; товар у JSON — id, name, sku, price."""
    response = client.get(URL)
    assert names(response) == ["Gaming mouse", "USB-C cable", "Wireless mouse"]
    assert set(response.json()[0]) == {"id", "name", "sku", "price"}


def test_list_search(client, products):
    """?q=MOUSE — назва містить без урахування регістру."""
    assert names(client.get(URL, {"q": "MOUSE"})) == ["Gaming mouse", "Wireless mouse"]


def test_list_max_price(client, products):
    """?max_price=899 — price <= 899."""
    assert names(client.get(URL, {"max_price": "899"})) == ["USB-C cable", "Wireless mouse"]


def test_bad_max_price_is_400(client, products):
    """?max_price=abc — 400 з JSON-помилкою, а не 500 від ValueError."""
    response = client.get(URL, {"max_price": "abc"})
    assert response.status_code == 400
    assert response.json() == {"error": "max_price must be a whole number"}


def test_create(client):
    """POST — 201, товар у JSON, Location на product-detail; новий товар активний."""
    response = post(client, {"name": "Webcam", "sku": "CAM-01", "price": 1999})
    assert response.status_code == 201
    product = Product.objects.get(sku="CAM-01")
    assert response.json() == {"id": product.pk, "name": "Webcam", "sku": "CAM-01", "price": 1999}
    assert response["Location"] == f"/api/products/{product.pk}/"
    assert product.status == Product.Status.ACTIVE


def test_invalid_json_is_400(client):
    """Тіло не JSON — 400 {"error": "Invalid JSON"}."""
    response = client.post(URL, data="name=Webcam", content_type="application/json")
    assert response.status_code == 400
    assert response.json() == {"error": "Invalid JSON"}


def test_all_field_errors_at_once(client):
    """Неправильні поля — 400 і ВСІ одразу в {"errors": {...}}; нічого не створено."""
    response = post(client, {"name": "", "price": 0})
    assert response.status_code == 400
    assert set(response.json()["errors"]) == {"name", "sku", "price"}
    assert Product.objects.count() == 0


@pytest.mark.parametrize("price", ["100", 12.5, True, -1])
def test_price_must_be_a_whole_number(client, price):
    """price — ціле >= 1: рядок, дробове, True і від'ємне — помилка поля price."""
    response = post(client, {"name": "Webcam", "sku": "CAM-01", "price": price})
    assert response.status_code == 400
    assert set(response.json()["errors"]) == {"price"}


def test_duplicate_sku_is_409(client, products):
    """Такий sku уже є — 409 {"error": "SKU already exists"}."""
    response = post(client, {"name": "Another mouse", "sku": "MOUSE-01", "price": 500})
    assert response.status_code == 409
    assert response.json() == {"error": "SKU already exists"}


def test_detail(client, products):
    """GET /api/products/<pk>/ — активний товар."""
    product = Product.objects.get(sku="CABLE-C1")
    assert client.get(f"{URL}{product.pk}/").json() == {"id": product.pk, "name": "USB-C cable", "sku": "CABLE-C1", "price": 299}


def test_detail_hides_drafts_and_missing(client, products):
    """Чернетка й неіснуючий — однаково 404 {"error": "Product not found"}."""
    draft = Product.objects.get(sku="PROTO-1")
    for path in (f"{URL}{draft.pk}/", f"{URL}9999/"):
        response = client.get(path)
        assert response.status_code == 404
        assert response.json() == {"error": "Product not found"}


def test_methods(client, products):
    """Колекція — лише GET і POST, деталі — лише GET: інше — 405."""
    product = Product.objects.get(sku="CABLE-C1")
    assert client.delete(URL).status_code == 405
    assert client.post(f"{URL}{product.pk}/").status_code == 405


def test_post_without_csrf_token():
    """JSON-API приймає POST без CSRF-токена навіть з увімкненою перевіркою: @csrf_exempt."""
    strict = Client(enforce_csrf_checks=True)
    response = strict.post(URL, data=json.dumps({"name": "Webcam", "sku": "CAM-01", "price": 1999}), content_type="application/json")
    assert response.status_code == 201
