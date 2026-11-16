import pytest
from playwright.sync_api import expect

USER = {"email": "qa@gadgetly.test", "password": "Test1234"}


@pytest.fixture(scope="session")
def public_api(playwright, base_url):
    """API client without a token; paths are relative to {base_url}/api/."""
    context = playwright.request.new_context(base_url=f"{base_url}/api/")
    yield context
    context.dispose()


def test_catalog_has_14_products(public_api):
    response = public_api.get("products", params={"limit": 50})

    expect(response).to_be_ok()
    assert response.json()["total"] == 14


# твій код тут: фікстура user_api, свої замовлення, чуже замовлення 1001, створення й подвійне видалення
