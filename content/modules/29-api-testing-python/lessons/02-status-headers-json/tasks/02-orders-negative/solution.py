import pytest
import requests

TIMEOUT = 5
USER = {"email": "qa@gadgetly.test", "password": "Test1234"}


@pytest.fixture(scope="session")
def api(base_url):
    return f"{base_url}/api"


@pytest.fixture(scope="session")
def auth(api):
    """Authorization header of the test user (signs in once per test run)."""
    response = requests.post(f"{api}/auth/login", json=USER, timeout=TIMEOUT)
    response.raise_for_status()
    return {"Authorization": f"Bearer {response.json()['token']}"}


def create_order(api, auth, body):
    """POST /orders; an order the server should not have created is deleted at once."""
    response = requests.post(f"{api}/orders", json=body, headers=auth, timeout=TIMEOUT)
    if response.status_code == 201:
        requests.delete(f"{api}/orders/{response.json()['id']}", headers=auth, timeout=TIMEOUT)
    return response


def test_orders_need_a_token(api):
    response = requests.get(f"{api}/orders", timeout=TIMEOUT)

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
    assert response.json()["error"] == "Authorization header is missing"


def test_my_orders_are_only_mine(api, auth):
    response = requests.get(f"{api}/orders", headers=auth, timeout=TIMEOUT)

    assert response.status_code == 200
    assert response.headers["Content-Type"].startswith("application/json")
    assert all(order["userId"] == 42 for order in response.json()["items"])


def test_another_users_order_is_forbidden(api, auth):
    response = requests.get(f"{api}/orders/1001", headers=auth, timeout=TIMEOUT)

    assert response.status_code == 403, response.text
    assert response.json()["error"] == "You don't have access to this order"


def test_quantity_zero_is_rejected(api, auth):
    response = create_order(api, auth, {"productId": 1, "quantity": 0})

    assert response.status_code == 400, response.text
    assert response.json()["error"] == "quantity must be from 1 to 10"


def test_out_of_stock_product_is_rejected(api, auth):
    response = create_order(api, auth, {"productId": 2, "quantity": 1})

    assert response.status_code == 409, response.text
    assert response.json()["error"] == "Product is out of stock"
