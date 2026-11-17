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


@pytest.mark.asyncio
async def test_first_get_fetches(fetch, clock):
    cache = PriceCache(fetch, ttl=60, clock=clock)
    assert await cache.get("MOUSE-01") == 899
    fetch.assert_awaited_once_with("MOUSE-01")


# твій код тут
