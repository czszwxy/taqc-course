import json

import pytest
import requests
from playwright.sync_api import Page, expect

TIMEOUT = 5
USER = {"email": "qa@gadgetly.test", "password": "Test1234"}


@pytest.fixture(scope="session")
def api(base_url):
    return f"{base_url}/api"


@pytest.fixture(scope="session")
def token(api):
    response = requests.post(f"{api}/auth/login", json=USER, timeout=TIMEOUT)
    response.raise_for_status()
    return response.json()["token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def order(api, auth):
    """An order of the test user created through the API; deleted after the test."""
    response = requests.post(f"{api}/orders", json={"productId": 1, "quantity": 2}, headers=auth, timeout=TIMEOUT)
    response.raise_for_status()
    created = response.json()
    yield created
    requests.delete(f"{api}/orders/{created['id']}", headers=auth, timeout=TIMEOUT)


def open_account(page: Page, token: str):
    """Opens My account already signed in: the token is put into localStorage before the page loads."""
    page.add_init_script(f"localStorage.setItem('gadgetly:token', {json.dumps(token)})")
    page.goto("/playground/account")
    expect(page.get_by_role("heading", name="My account")).to_be_visible()


def test_order_created_through_the_api_is_shown(page: Page, token, order):
    open_account(page, token)

    row = page.get_by_test_id(f"order-{order['id']}")
    expect(row).to_contain_text("2 pcs · created")
    expect(row.get_by_test_id("order-total")).to_contain_text("998 UAH")


# твій код тут: кількість, змінена через API; замовлення, видалене через API
