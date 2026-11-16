import pytest
import requests

TIMEOUT = 5


@pytest.fixture(scope="session")
def api(base_url):
    return f"{base_url}/api"


def test_health(api):
    response = requests.get(f"{api}/health", timeout=TIMEOUT)

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "1.4.0"}


def test_category_filter_returns_only_that_category(api):
    response = requests.get(f"{api}/products", params={"category": "Phones"}, timeout=TIMEOUT)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert all(product["category"] == "Phones" for product in body["items"])


def test_pages_do_not_overlap(api):
    first = requests.get(f"{api}/products", params={"page": 1, "limit": 5}, timeout=TIMEOUT).json()
    second = requests.get(f"{api}/products", params={"page": 2, "limit": 5}, timeout=TIMEOUT).json()

    first_ids = {product["id"] for product in first["items"]}
    second_ids = {product["id"] for product in second["items"]}
    assert first_ids.isdisjoint(second_ids), f"repeated ids: {first_ids & second_ids}"


def test_missing_product_is_404(api):
    response = requests.get(f"{api}/products/999", timeout=TIMEOUT)

    assert response.status_code == 404
    assert response.json() == {"error": "Product not found"}


def test_login_without_password_is_400(api):
    response = requests.post(f"{api}/auth/login", json={"email": "qa@gadgetly.test"}, timeout=TIMEOUT)

    assert response.status_code == 400, response.text
    assert response.json()["error"] == "email and password are required"
