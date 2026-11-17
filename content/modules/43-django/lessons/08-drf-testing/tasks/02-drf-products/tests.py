import pytest
from rest_framework.test import APIClient

from shop.models import Product

pytestmark = pytest.mark.django_db

LIST = "/api/products/"
NEW = {"name": "Webcam", "sku": " cam-01 ", "price": 1999, "stock": 3, "status": "active"}


@pytest.fixture
def staff(django_user_model):
    api = APIClient()
    api.force_authenticate(django_user_model.objects.create_user("max", password="pw-123456", is_staff=True))
    return api


@pytest.fixture
def customer(django_user_model):
    api = APIClient()
    api.force_authenticate(django_user_model.objects.create_user("anna", password="pw-123456"))
    return api


@pytest.fixture
def products():
    Product.objects.create(name="Wireless mouse", sku="MOUSE-01", price=899, status="active")
    Product.objects.create(name="USB-C cable", sku="CABLE-C1", price=299, status="active")
    Product.objects.create(name="Prototype", sku="PROTO-1", price=999, status="draft")


def test_anyone_can_list(products):
    """Гість читає список — 200, за назвою."""
    response = APIClient().get(LIST)
    assert response.status_code == 200
    assert [p["name"] for p in response.json()] == ["Prototype", "USB-C cable", "Wireless mouse"]


def test_list_fields(products):
    """Поля: id, name, sku, price, stock, status, created_at."""
    item = APIClient().get(LIST).json()[0]
    assert set(item) == {"id", "name", "sku", "price", "stock", "status", "created_at"}


def test_status_filter(products):
    """?status=active — лише активні."""
    assert [p["sku"] for p in APIClient().get(LIST, {"status": "active"}).json()] == ["CABLE-C1", "MOUSE-01"]


def test_guest_cannot_create():
    """Гість — 403 (сесійна автентифікація), нічого не створено."""
    assert APIClient().post(LIST, NEW, format="json").status_code == 403
    assert Product.objects.count() == 0


def test_customer_cannot_create(customer):
    """Звичайний користувач — 403: змінювати можуть лише співробітники."""
    assert customer.post(LIST, NEW, format="json").status_code == 403


def test_staff_creates(staff):
    """Співробітник — 201; sku очищено і великими літерами; created_at заповнено."""
    response = staff.post(LIST, NEW, format="json")
    assert response.status_code == 201
    body = response.json()
    assert (body["sku"], body["price"], body["status"]) == ("CAM-01", 1999, "active")
    assert body["created_at"]
    assert Product.objects.get().sku == "CAM-01"


def test_read_only_fields_are_ignored(staff):
    """id і created_at у тілі ігноруються."""
    response = staff.post(LIST, {**NEW, "id": 500, "created_at": "2000-01-01T00:00:00Z"}, format="json")
    assert response.status_code == 201
    assert response.json()["id"] != 500
    assert not response.json()["created_at"].startswith("2000")


def test_validation_errors(staff):
    """Невалідні дані — 400 з помилками полів sku і price."""
    response = staff.post(LIST, {**NEW, "sku": "a b", "price": 0}, format="json")
    assert response.status_code == 400
    assert response.json() == {"sku": ["Use 3-20 letters, digits or dashes."], "price": ["Price must be at least 1."]}


def test_duplicate_sku_after_cleaning(staff, products):
    """"mouse-01" — дубль "MOUSE-01": 400 з помилкою sku."""
    response = staff.post(LIST, {**NEW, "sku": "mouse-01"}, format="json")
    assert response.status_code == 400
    assert "sku" in response.json()


def test_retrieve(products):
    """GET одного — 200; неіснуючий — 404."""
    product = Product.objects.get(sku="CABLE-C1")
    assert APIClient().get(f"{LIST}{product.pk}/").json()["name"] == "USB-C cable"
    assert APIClient().get(f"{LIST}9999/").status_code == 404


def test_staff_patch(staff, products):
    """PATCH співробітником — змінює лише надіслане; свій sku не вважається дублем."""
    product = Product.objects.get(sku="CABLE-C1")
    response = staff.patch(f"{LIST}{product.pk}/", {"price": 349, "sku": "cable-c1"}, format="json")
    assert response.status_code == 200
    product.refresh_from_db()
    assert (product.price, product.sku, product.name) == (349, "CABLE-C1", "USB-C cable")


def test_customer_cannot_change(customer, products):
    """Звичайний користувач не змінює і не видаляє — 403."""
    product = Product.objects.get(sku="CABLE-C1")
    assert customer.patch(f"{LIST}{product.pk}/", {"price": 1}, format="json").status_code == 403
    assert customer.delete(f"{LIST}{product.pk}/").status_code == 403


def test_staff_delete(staff, products):
    """DELETE співробітником — 204, товару немає."""
    product = Product.objects.get(sku="PROTO-1")
    assert staff.delete(f"{LIST}{product.pk}/").status_code == 204
    assert not Product.objects.filter(sku="PROTO-1").exists()
