import pytest
from playwright.sync_api import expect

USER = {"email": "qa@gadgetly.test", "password": "Test1234"}


@pytest.fixture(scope="session")
def public_api(playwright, base_url):
    """API client without a token; paths are relative to {base_url}/api/."""
    context = playwright.request.new_context(base_url=f"{base_url}/api/")
    yield context
    context.dispose()


@pytest.fixture(scope="session")
def user_api(playwright, base_url, public_api):
    """API client signed in as the test user (user 42)."""
    login = public_api.post("auth/login", data=USER)
    expect(login).to_be_ok()
    context = playwright.request.new_context(
        base_url=f"{base_url}/api/",
        extra_http_headers={"Authorization": f"Bearer {login.json()['token']}"},
    )
    yield context
    context.dispose()


def test_catalog_has_14_products(public_api):
    response = public_api.get("products", params={"limit": 50})

    expect(response).to_be_ok()
    assert response.json()["total"] == 14


def test_my_orders_are_only_mine(user_api):
    response = user_api.get("orders")

    assert response.status == 200
    assert all(order["userId"] == 42 for order in response.json()["items"])


def test_another_users_order_is_forbidden(user_api):
    response = user_api.get("orders/1001")

    assert response.status == 403, response.text()


def test_deleting_twice_is_404(user_api):
    created = user_api.post("orders", data={"productId": 1, "quantity": 1})
    assert created.status == 201
    url = f"orders/{created.json()['id']}"

    assert user_api.delete(url).status == 204
    assert user_api.delete(url).status == 404
