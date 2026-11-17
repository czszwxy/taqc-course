import asyncio

import httpx
import pytest

from solution import fetch_details

DELETED = {99}
BROKEN = {500}


class Catalog:
    def __init__(self):
        self.requested = []
        self.in_flight = 0
        self.peak = 0

    async def __call__(self, request):
        product_id = int(request.url.path.rsplit("/", 1)[-1])
        self.requested.append(product_id)
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            await asyncio.sleep(0.01 * (product_id % 3 + 1))
            if product_id in DELETED:
                return httpx.Response(404, json={"detail": "Product not found"})
            if product_id in BROKEN:
                return httpx.Response(500, json={"detail": "boom"})
            return httpx.Response(200, json={"id": product_id, "name": f"Product {product_id}"})
        finally:
            self.in_flight -= 1


def client_for(catalog):
    return httpx.AsyncClient(transport=httpx.MockTransport(catalog), base_url="https://catalog.test")


@pytest.mark.asyncio
async def test_details_in_order():
    """Деталі в порядку ids, навіть якщо відповіді приходять у іншому порядку."""
    async with client_for(Catalog()) as client:
        details = await fetch_details(client, [5, 1, 3])
    assert [item["id"] for item in details] == [5, 1, 3]


@pytest.mark.asyncio
async def test_deleted_products_are_skipped():
    """404 — товар пропущено, решта на місці."""
    async with client_for(Catalog()) as client:
        details = await fetch_details(client, [3, 99, 1])
    assert [item["id"] for item in details] == [3, 1]


@pytest.mark.asyncio
async def test_server_error_raises():
    """500 — не ковтаємо: httpx.HTTPStatusError."""
    async with client_for(Catalog()) as client:
        with pytest.raises(httpx.HTTPStatusError):
            await fetch_details(client, [1, 500])


@pytest.mark.asyncio
async def test_peak_equals_limit():
    """10 товарів, limit=3 — пік рівно 3 одночасних запити."""
    catalog = Catalog()
    async with client_for(catalog) as client:
        await fetch_details(client, list(range(1, 11)), limit=3)
    assert catalog.peak == 3


@pytest.mark.asyncio
async def test_default_limit_is_five():
    """Без limit — до 5 одночасно."""
    catalog = Catalog()
    async with client_for(catalog) as client:
        await fetch_details(client, list(range(1, 13)))
    assert catalog.peak == 5


@pytest.mark.asyncio
async def test_duplicates_requested_once():
    """Повторений id — один запит і один товар у відповіді."""
    catalog = Catalog()
    async with client_for(catalog) as client:
        details = await fetch_details(client, [2, 2, 4])
    assert [item["id"] for item in details] == [2, 4]
    assert sorted(catalog.requested) == [2, 4]


@pytest.mark.asyncio
async def test_empty():
    """Порожній список — [] без запитів."""
    catalog = Catalog()
    async with client_for(catalog) as client:
        assert await fetch_details(client, []) == []
    assert catalog.requested == []
