import inspect

import httpx
import pytest

from solution import iter_orders, paid_order_ids

PAGES = {
    1: {"items": [{"id": 1, "status": "paid", "total": 500}, {"id": 2, "status": "new", "total": 300}, {"id": 3, "status": "paid", "total": 900}], "next_page": 2},
    2: {"items": [{"id": 4, "status": "cancelled", "total": 100}, {"id": 5, "status": "paid", "total": 1200}], "next_page": 3},
    3: {"items": [{"id": 6, "status": "paid", "total": 700}], "next_page": None},
}


class Shop:
    def __init__(self, broken_page=None):
        self.broken_page = broken_page
        self.pages = []

    def __call__(self, request):
        assert request.url.path == "/orders", f"unexpected path {request.url.path}"
        page = int(request.url.params["page"])
        self.pages.append(page)
        if page == self.broken_page:
            return httpx.Response(500, json={"detail": "database is down"})
        return httpx.Response(200, json=PAGES[page])


def client_for(shop):
    return httpx.AsyncClient(transport=httpx.MockTransport(shop), base_url="https://shop.test")


def test_iter_orders_is_an_async_generator():
    """iter_orders — асинхронний генератор (async def + yield)."""
    assert inspect.isasyncgenfunction(iter_orders)


@pytest.mark.asyncio
async def test_iter_orders_goes_through_all_pages():
    """Усі замовлення по черзі; сторінки 1, 2, 3 і зупинка, коли next_page — null."""
    shop = Shop()
    async with client_for(shop) as client:
        ids = [order["id"] async for order in iter_orders(client)]
    assert ids == [1, 2, 3, 4, 5, 6]
    assert shop.pages == [1, 2, 3]


@pytest.mark.asyncio
async def test_iter_orders_is_lazy():
    """Генератор лінивий: перше замовлення — лише перша сторінка."""
    shop = Shop()
    async with client_for(shop) as client:
        generator = iter_orders(client)
        first = await anext(generator)
        await generator.aclose()
    assert first["id"] == 1
    assert shop.pages == [1]


@pytest.mark.asyncio
async def test_paid_ids():
    """Оплачені з усіх сторінок."""
    async with client_for(Shop()) as client:
        assert await paid_order_ids(client) == [1, 3, 5, 6]


@pytest.mark.asyncio
async def test_limit_stops_early():
    """limit=2 — два id з першої сторінки, друга сторінка не запитується."""
    shop = Shop()
    async with client_for(shop) as client:
        assert await paid_order_ids(client, limit=2) == [1, 3]
    assert shop.pages == [1]


@pytest.mark.asyncio
async def test_limit_across_pages():
    """limit=3 — третій id з другої сторінки; третя не запитується."""
    shop = Shop()
    async with client_for(shop) as client:
        assert await paid_order_ids(client, limit=3) == [1, 3, 5]
    assert shop.pages == [1, 2]


@pytest.mark.asyncio
async def test_server_error_raises():
    """500 на другій сторінці — httpx.HTTPStatusError (raise_for_status)."""
    async with client_for(Shop(broken_page=2)) as client:
        with pytest.raises(httpx.HTTPStatusError):
            await paid_order_ids(client)
