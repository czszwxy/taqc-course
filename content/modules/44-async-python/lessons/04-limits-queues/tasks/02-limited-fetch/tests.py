import pytest

from fakes import STOCK, StockService
from solution import fetch_all

SKUS = [f"SKU-{n:02}" for n in range(1, 11)]


@pytest.mark.asyncio
async def test_results_in_order():
    """Усі залишки, у порядку skus."""
    result = await fetch_all(StockService(max_parallel=3), SKUS, limit=3)
    assert list(result.items()) == [(sku, STOCK[sku]) for sku in SKUS]


@pytest.mark.asyncio
async def test_peak_equals_limit():
    """Пік рівно limit: не більше (інакше TooManyRequests) і не менше (інакше запити йдуть по черзі)."""
    service = StockService(max_parallel=3)
    await fetch_all(service, SKUS, limit=3)
    assert service.peak == 3


@pytest.mark.asyncio
async def test_limit_one_is_sequential():
    """limit=1 — по одному."""
    service = StockService(max_parallel=1)
    await fetch_all(service, SKUS[:4], limit=1)
    assert service.peak == 1


@pytest.mark.asyncio
async def test_fewer_items_than_limit():
    """Товарів менше за limit — усі одночасно."""
    service = StockService(max_parallel=10)
    await fetch_all(service, SKUS[:4], limit=10)
    assert service.peak == 4


@pytest.mark.asyncio
async def test_duplicates_once():
    """Повторений sku — один запит."""
    service = StockService(max_parallel=5)
    result = await fetch_all(service, ["SKU-01", "SKU-02", "SKU-01"], limit=5)
    assert list(result) == ["SKU-01", "SKU-02"]
    assert sorted(service.calls) == ["SKU-01", "SKU-02"]


@pytest.mark.asyncio
async def test_two_calls_have_own_limits():
    """Два одночасні виклики fetch_all мають кожен свій семафор: разом пік до 2 × limit."""
    import asyncio

    service = StockService(max_parallel=4)
    await asyncio.gather(fetch_all(service, SKUS[:5], limit=2), fetch_all(service, SKUS[5:], limit=2))
    assert service.peak == 4


@pytest.mark.asyncio
async def test_limit_must_be_positive():
    """limit < 1 — ValueError."""
    with pytest.raises(ValueError):
        await fetch_all(StockService(max_parallel=1), SKUS, limit=0)
