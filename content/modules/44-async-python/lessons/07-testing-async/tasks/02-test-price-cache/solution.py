import asyncio
from unittest.mock import AsyncMock

import pytest

from subject import PriceCache

PRICES = {"MOUSE-01": 899, "CABLE-C1": 299}


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


@pytest.fixture
def clock():
    return FakeClock()


@pytest.fixture
def fetch():
    async def lookup(sku):
        await asyncio.sleep(0.01)
        return PRICES[sku]

    return AsyncMock(side_effect=lookup)


@pytest.fixture
def cache(fetch, clock):
    return PriceCache(fetch, ttl=60, clock=clock)


@pytest.mark.asyncio
async def test_first_get_fetches(fetch, clock):
    cache = PriceCache(fetch, ttl=60, clock=clock)
    assert await cache.get("MOUSE-01") == 899
    fetch.assert_awaited_once_with("MOUSE-01")


@pytest.mark.asyncio
async def test_second_get_is_cached(cache, fetch):
    await cache.get("MOUSE-01")
    assert await cache.get("MOUSE-01") == 899
    assert fetch.await_count == 1


@pytest.mark.asyncio
async def test_fresh_just_before_ttl(cache, fetch, clock):
    await cache.get("MOUSE-01")
    clock.now += 59.9
    await cache.get("MOUSE-01")
    assert fetch.await_count == 1


@pytest.mark.asyncio
async def test_expired_exactly_at_ttl(cache, fetch, clock):
    await cache.get("MOUSE-01")
    clock.now += 60
    assert await cache.get("MOUSE-01") == 899
    assert fetch.await_count == 2


@pytest.mark.asyncio
async def test_concurrent_gets_share_one_fetch(cache, fetch):
    first, second = await asyncio.gather(cache.get("MOUSE-01"), cache.get("MOUSE-01"))
    assert first == second == 899
    fetch.assert_awaited_once_with("MOUSE-01")


@pytest.mark.asyncio
async def test_errors_are_not_cached(clock):
    fetch = AsyncMock(side_effect=[RuntimeError("partner is down"), 899])
    cache = PriceCache(fetch, ttl=60, clock=clock)
    with pytest.raises(RuntimeError):
        await cache.get("MOUSE-01")
    assert await cache.get("MOUSE-01") == 899
    assert fetch.await_count == 2


@pytest.mark.asyncio
async def test_different_skus(cache):
    assert await cache.get("MOUSE-01") == 899
    assert await cache.get("CABLE-C1") == 299


@pytest.mark.asyncio
async def test_invalidate(cache, fetch):
    await cache.get("MOUSE-01")
    cache.invalidate("MOUSE-01")
    await cache.get("MOUSE-01")
    assert fetch.await_count == 2
