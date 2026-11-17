import pytest
from fastapi.testclient import TestClient

from solution import app
from tokens import ORDERS, TICKETS

client = TestClient(app)

ANNA = {"Authorization": "Bearer tok-anna-7c41f0"}
OLGA = {"Authorization": "Bearer tok-olga-91b2d8"}
MAX = {"Authorization": "Bearer tok-max-e05a3c"}


def assert_401(response):
    assert response.status_code == 401, response.json()
    assert response.json() == {"detail": "Not authenticated"}
    assert response.headers.get("www-authenticate") == "Bearer"


def test_me():
    """GET /me з дійсним токеном — username і role власника токена."""
    assert client.get("/me", headers=ANNA).json() == {"username": "anna", "role": "customer"}
    assert client.get("/me", headers=MAX).json() == {"username": "max", "role": "admin"}


@pytest.mark.parametrize("path", ["/me", "/support/tickets", "/admin/orders"])
def test_no_token_is_401(path):
    """Без заголовка Authorization — 401 "Not authenticated" з WWW-Authenticate: Bearer (не 403!)."""
    assert_401(client.get(path))


@pytest.mark.parametrize("path", ["/me", "/support/tickets", "/admin/orders"])
def test_unknown_token_is_401(path):
    """Невідомий токен — 401 з тим самим detail і заголовком WWW-Authenticate."""
    assert_401(client.get(path, headers={"Authorization": "Bearer tok-stolen-000000"}))


def test_wrong_scheme_is_401():
    """Схема Basic замість Bearer — 401."""
    assert client.get("/me", headers={"Authorization": "Basic tok-anna-7c41f0"}).status_code == 401


def test_admin_sees_orders():
    """admin — 200 і ORDERS."""
    response = client.get("/admin/orders", headers=MAX)
    assert response.status_code == 200
    assert response.json() == ORDERS


@pytest.mark.parametrize("headers", [ANNA, OLGA], ids=["customer", "support"])
def test_others_cannot_see_orders(headers):
    """customer і support — 403 "Admins only": хто це, відомо, але прав немає."""
    response = client.get("/admin/orders", headers=headers)
    assert response.status_code == 403
    assert response.json() == {"detail": "Admins only"}


@pytest.mark.parametrize("headers", [OLGA, MAX], ids=["support", "admin"])
def test_staff_sees_tickets(headers):
    """support і admin бачать тікети."""
    response = client.get("/support/tickets", headers=headers)
    assert response.status_code == 200
    assert response.json() == TICKETS


def test_customer_cannot_see_tickets():
    """customer — 403 "Support staff only"."""
    response = client.get("/support/tickets", headers=ANNA)
    assert response.status_code == 403
    assert response.json() == {"detail": "Support staff only"}
