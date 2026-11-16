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


# твій код тут: вхід без пароля, нове замовлення з Location, кількість 0, тіло не JSON
