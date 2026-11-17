import pytest
from django.contrib.auth.models import Permission

from shop.models import Order

pytestmark = pytest.mark.django_db


@pytest.fixture
def anna(django_user_model):
    return django_user_model.objects.create_user("anna", password="pw-123456")


@pytest.fixture
def ivan(django_user_model):
    return django_user_model.objects.create_user("ivan", password="pw-123456")


@pytest.fixture
def orders(anna, ivan):
    return {
        "A-2": Order.objects.create(customer=anna, number="A-2", total=800, status="shipped"),
        "A-1": Order.objects.create(customer=anna, number="A-1", total=1200, status="paid"),
        "I-1": Order.objects.create(customer=ivan, number="I-1", total=5000, status="new"),
    }


def assert_login_redirect(response, path):
    assert response.status_code == 302
    assert response["Location"] == f"/accounts/login/?next={path}"


@pytest.mark.parametrize("path", ["/orders/", "/reports/sales/"])
def test_guests_go_to_login(client, orders, path):
    """Гість — 302 на /accounts/login/?next=… (@login_required; для звіту — над permission_required)."""
    assert_login_redirect(client.get(path), path)


def test_guest_detail_goes_to_login(client, orders):
    """Гість на сторінці замовлення — теж на вхід."""
    path = f"/orders/{orders['A-1'].pk}/"
    assert_login_redirect(client.get(path), path)


def test_my_orders_only_mine(client, anna, orders):
    """Анна бачить лише свої замовлення, за number."""
    client.force_login(anna)
    assert [o["number"] for o in client.get("/orders/").json()] == ["A-1", "A-2"]


def test_order_detail_owner(client, anna, orders):
    """Власниця бачить своє замовлення."""
    client.force_login(anna)
    assert client.get(f"/orders/{orders['A-1'].pk}/").json() == {"number": "A-1", "total": 1200, "status": "paid"}


def test_someone_elses_order_is_404(client, anna, orders):
    """Чуже замовлення — 404 (не 403): Анна не дізнається, що I-1 існує."""
    client.force_login(anna)
    assert client.get(f"/orders/{orders['I-1'].pk}/").status_code == 404


def test_missing_order_is_404(client, anna, orders):
    """Неіснуюче — 404."""
    client.force_login(anna)
    assert client.get("/orders/9999/").status_code == 404


def test_staff_sees_any_order(client, django_user_model, orders):
    """Співробітник (is_staff) бачить будь-яке замовлення."""
    client.force_login(django_user_model.objects.create_user("max", password="pw-123456", is_staff=True))
    assert client.get(f"/orders/{orders['I-1'].pk}/").json()["number"] == "I-1"


def test_report_without_permission_is_403(client, anna, orders):
    """Увійшла, але без права shop.view_order — 403."""
    client.force_login(anna)
    assert client.get("/reports/sales/").status_code == 403


def test_report_with_permission(client, django_user_model, orders):
    """З правом shop.view_order — {"orders": 3, "revenue": 2000} (paid + shipped)."""
    olena = django_user_model.objects.create_user("olena", password="pw-123456")
    olena.user_permissions.add(Permission.objects.get(codename="view_order", content_type__app_label="shop"))
    client.force_login(olena)
    assert client.get("/reports/sales/").json() == {"orders": 3, "revenue": 2000}


def test_report_without_sales(client, django_user_model):
    """Немає оплачених — revenue 0, а не null."""
    olena = django_user_model.objects.create_user("olena", password="pw-123456")
    olena.user_permissions.add(Permission.objects.get(codename="view_order", content_type__app_label="shop"))
    client.force_login(olena)
    assert client.get("/reports/sales/").json() == {"orders": 0, "revenue": 0}
