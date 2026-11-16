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


def test_wrong_password_is_401(api):
    response = requests.post(f"{api}/auth/login", json={**USER, "password": "wrong"}, timeout=TIMEOUT)

    assert response.status_code == 401
    assert response.json()["error"] == "Invalid email or password"


def test_login_without_password_is_400(api):
    response = requests.post(f"{api}/auth/login", json={"email": USER["email"]}, timeout=TIMEOUT)

    assert response.status_code == 400, response.text
    assert response.json()["error"] == "email and password are required"


def test_new_order_returns_its_location(api, auth):
    response = requests.post(f"{api}/orders", json={"productId": 1, "quantity": 2}, headers=auth, timeout=TIMEOUT)
    order = response.json()
    try:
        assert response.status_code == 201, response.text
        assert response.headers["Location"].endswith(f"/orders/{order['id']}")
        assert order["total"] == 998
    finally:
        requests.delete(f"{api}/orders/{order['id']}", headers=auth, timeout=TIMEOUT)


def test_quantity_zero_is_rejected(api, auth):
    response = requests.post(f"{api}/orders", json={"productId": 1, "quantity": 0}, headers=auth, timeout=TIMEOUT)
    if response.status_code == 201:
        requests.delete(f"{api}/orders/{response.json()['id']}", headers=auth, timeout=TIMEOUT)

    assert response.status_code == 400, response.text
    assert response.json()["error"] == "quantity must be from 1 to 10"


def test_form_body_is_415(api):
    response = requests.post(f"{api}/auth/login", data="email=qa", timeout=TIMEOUT)

    assert response.status_code == 415
    assert response.json()["error"] == "Content-Type must be application/json"
