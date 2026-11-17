import copy

import pytest
from fastapi.testclient import TestClient

import catalog
import solution

TEST_SETTINGS = {"shop_name": "Test shop", "admin_key": "test-admin-key"}
ADMIN = {"X-Admin-Key": "test-admin-key"}


@pytest.fixture(autouse=True)
def fresh_catalog():
    saved = copy.deepcopy(catalog.PRODUCTS)
    yield
    catalog.PRODUCTS.clear()
    catalog.PRODUCTS.update(saved)


@pytest.fixture
def client():
    solution.app.dependency_overrides[solution.get_settings] = lambda: solution.Settings(**TEST_SETTINGS)
    yield TestClient(solution.app)
    solution.app.dependency_overrides.clear()


def test_settings_defaults(monkeypatch):
    """Без змінних середовища — значення за замовчуванням."""
    monkeypatch.delenv("SHOP_SHOP_NAME", raising=False)
    monkeypatch.delenv("SHOP_ADMIN_KEY", raising=False)
    settings = solution.Settings()
    assert (settings.shop_name, settings.admin_key) == ("Gadget shop", "dev-admin-key")


def test_settings_read_the_environment(monkeypatch):
    """SHOP_ADMIN_KEY і SHOP_SHOP_NAME зі змінних середовища (env_prefix="SHOP_"); get_settings кешується через lru_cache."""
    monkeypatch.setenv("SHOP_ADMIN_KEY", "from-env")
    monkeypatch.setenv("SHOP_SHOP_NAME", "Env shop")
    solution.get_settings.cache_clear()
    try:
        assert solution.get_settings().admin_key == "from-env"
        assert solution.get_settings() is solution.get_settings()
        assert solution.get_settings().shop_name == "Env shop"
    finally:
        solution.get_settings.cache_clear()


def test_info_uses_the_settings_dependency(client):
    """/info бере shop_name з get_settings (тест підмінив її)."""
    assert client.get("/info").json() == {"shop_name": "Test shop"}


def test_products(client):
    """GET /products — товари за id."""
    assert [p["id"] for p in client.get("/products").json()] == [1, 2, 5]


def test_product_and_404(client):
    """GET /products/{id} — товар або 404 "Product not found"."""
    assert client.get("/products/2").json()["name"] == "Wireless mouse"
    response = client.get("/products/3")
    assert response.status_code == 404
    assert response.json() == {"detail": "Product not found"}


def test_routers_have_tags():
    """Теги роутерів видно в OpenAPI: products і admin."""
    paths = solution.app.openapi()["paths"]
    assert paths["/products"]["get"]["tags"] == ["products"]
    assert paths["/products/{product_id}"]["get"]["tags"] == ["products"]
    assert paths["/admin/stats"]["get"]["tags"] == ["admin"]


@pytest.mark.parametrize("headers", [{}, {"X-Admin-Key": "dev-admin-key"}, {"X-Admin-Key": "guess"}], ids=["missing", "default-key", "wrong"])
def test_admin_needs_the_configured_key(client, headers):
    """Без ключа чи з неправильним — 401 "Invalid admin key". Ключ — із налаштувань (тут test-admin-key), а не вписаний у код."""
    response = client.get("/admin/stats", headers=headers)
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid admin key"}


def test_admin_stats(client):
    """З правильним ключем — кількість товарів і сума stock."""
    assert client.get("/admin/stats", headers=ADMIN).json() == {"products": 3, "stock": 57}


def test_admin_delete_is_protected_too(client):
    """Захист діє на ВСІ ендпоінти admin_router: DELETE без ключа — 401, товар лишається."""
    assert client.delete("/admin/products/1").status_code == 401
    assert client.get("/products/1").status_code == 200


def test_admin_delete(client):
    """DELETE з ключем — 204, товару більше немає; неіснуючий — 404."""
    response = client.delete("/admin/products/1", headers=ADMIN)
    assert response.status_code == 204
    assert client.get("/products/1").status_code == 404
    assert client.delete("/admin/products/1", headers=ADMIN).status_code == 404
