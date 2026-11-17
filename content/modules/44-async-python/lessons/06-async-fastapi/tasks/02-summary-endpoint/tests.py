import inspect

import httpx
import pytest

import solution
from fakes import CatalogServices


@pytest.fixture
def services():
    fake = CatalogServices()
    solution.app.dependency_overrides[solution.get_services] = lambda: fake
    yield fake
    solution.app.dependency_overrides.clear()


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=solution.app), base_url="http://test")


def endpoint():
    route = next((r for r in solution.app.routes if getattr(r, "path", "") == "/products/{sku}/summary"), None)
    assert route is not None, "no GET /products/{sku}/summary route"
    return route.endpoint


def test_endpoint_is_async():
    """Ендпоінт оголошено через async def."""
    assert inspect.iscoroutinefunction(endpoint())


@pytest.mark.asyncio
async def test_summary(services):
    """Ціна, залишок і available = stock > 0."""
    async with client() as http:
        response = await http.get("/products/MOUSE-01/summary")
    assert response.status_code == 200
    assert response.json() == {"sku": "MOUSE-01", "price": 899, "stock": 12, "available": True}


@pytest.mark.asyncio
async def test_out_of_stock(services):
    """stock 0 — available False."""
    async with client() as http:
        assert (await http.get("/products/CAM-01/summary")).json()["available"] is False


@pytest.mark.asyncio
async def test_two_calls_at_once(services):
    """Ціну й залишок запитано одночасно: пік 2, по одному виклику кожного."""
    async with client() as http:
        await http.get("/products/MOUSE-01/summary")
    assert services.peak == 2
    assert sorted(services.calls) == [("price", "MOUSE-01"), ("stock", "MOUSE-01")]


@pytest.mark.asyncio
async def test_unknown_is_404(services):
    """NotFound — 404 {"detail": "Product not found"}."""
    async with client() as http:
        response = await http.get("/products/NOPE-1/summary")
    assert response.status_code == 404
    assert response.json() == {"detail": "Product not found"}


def test_default_dependency():
    """Без підміни get_services повертає модульний SERVICES."""
    assert solution.get_services() is solution.SERVICES
