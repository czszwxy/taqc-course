import asyncio

import pytest

from legacy import LegacyCache
from solution import warm_up

SKUS = [f"SKU-{n}" for n in range(8)]


@pytest.mark.asyncio
async def test_values_in_order():
    """Значення для кожного sku, у порядку skus."""
    result = await warm_up(LegacyCache(delay=0.01), SKUS)
    assert list(result.items()) == [(sku, f"value-of-{sku}") for sku in SKUS]


@pytest.mark.asyncio
async def test_threads_up_to_the_limit():
    """Одночасно рівно limit потоків (пік у старому кеші)."""
    cache = LegacyCache()
    await warm_up(cache, SKUS, limit=4)
    assert cache.peak == 4


@pytest.mark.asyncio
async def test_default_limit():
    """Без limit — до 4 одночасно."""
    cache = LegacyCache(delay=0.02)
    await warm_up(cache, SKUS)
    assert cache.peak == 4


@pytest.mark.asyncio
async def test_event_loop_stays_free():
    """Під час прогріву «пульс» тикає — цикл подій не заблоковано блокувальними викликами."""
    ticks = 0

    async def pulse():
        nonlocal ticks
        while True:
            await asyncio.sleep(0.01)
            ticks += 1

    beat = asyncio.create_task(pulse())
    try:
        await warm_up(LegacyCache(delay=0.05), SKUS, limit=2)
    finally:
        beat.cancel()
    assert ticks >= 5


@pytest.mark.asyncio
async def test_each_sku_loaded_once():
    """Кожен sku — один виклик load."""
    cache = LegacyCache(delay=0.01)
    await warm_up(cache, SKUS[:3])
    assert sorted(cache.calls) == SKUS[:3]
