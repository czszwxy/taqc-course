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


@pytest.fixture
def order(session, api):
    """A fresh order of the test user; deleted after the test (a 404 there is fine: the test may have deleted it)."""
    response = session.post(f"{api}/orders", json={"productId": 1, "quantity": 2}, timeout=TIMEOUT)
    response.raise_for_status()
    created = response.json()
    yield created
    session.delete(f"{api}/orders/{created['id']}", timeout=TIMEOUT)


def test_me_is_the_test_user(session, api):
    response = session.get(f"{api}/me", timeout=TIMEOUT)

    assert response.status_code == 200
    assert response.json()["id"] == 42


def test_created_order_can_be_read(session, api, order):
    response = session.get(f"{api}/orders/{order['id']}", timeout=TIMEOUT)

    assert response.status_code == 200
    assert response.json() == order


def test_put_replaces_the_order(session, api, order):
    response = session.put(f"{api}/orders/{order['id']}", json={"productId": 3, "quantity": 1}, timeout=TIMEOUT)

    assert response.status_code == 200, response.text
    updated = response.json()
    assert (updated["productId"], updated["unitPrice"], updated["total"]) == (3, 2199, 2199)


def test_patch_recalculates_the_total(session, api, order):
    response = session.patch(f"{api}/orders/{order['id']}", json={"quantity": 4}, timeout=TIMEOUT)

    assert response.status_code == 200, response.text
    updated = response.json()
    assert updated["quantity"] == 4
    assert updated["total"] == updated["unitPrice"] * 4


def test_delete_removes_the_order(session, api, order):
    url = f"{api}/orders/{order['id']}"

    assert session.delete(url, timeout=TIMEOUT).status_code == 204
    assert session.get(url, timeout=TIMEOUT).status_code == 404
    assert session.delete(url, timeout=TIMEOUT).status_code == 404
