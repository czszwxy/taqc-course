import pytest
import requests

TIMEOUT = 5
USER = {"email": "qa@gadgetly.test", "password": "Test1234"}


@pytest.fixture(scope="session")
def api(base_url):
    return f"{base_url}/api"


@pytest.fixture(scope="session")
def session(api):
    """requests.Session signed in as the test user (user 42) for the whole run."""
    s = requests.Session()
    login = s.post(f"{api}/auth/login", json=USER, timeout=TIMEOUT)
    login.raise_for_status()
    s.headers.update({"Authorization": f"Bearer {login.json()['token']}"})
    yield s
    s.close()


# твій код тут: фікстура order (створює замовлення, після yield видаляє)


def test_me_is_the_test_user(session, api):
    response = session.get(f"{api}/me", timeout=TIMEOUT)

    assert response.status_code == 200
    assert response.json()["id"] == 42


# твій код тут: Read, PUT, PATCH і DELETE
