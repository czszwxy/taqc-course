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


def test_orders_need_a_token(api):
    response = requests.get(f"{api}/orders", timeout=TIMEOUT)

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
    assert response.json()["error"] == "Authorization header is missing"


# твій код тут: свої замовлення, чуже замовлення 1001, кількість 0, товар не на складі
