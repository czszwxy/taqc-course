"""Асинхронний кеш цін — код, який ти тестуєш (лише для читання)."""

import asyncio
import time


class PriceCache:
    def __init__(self, fetch, ttl=60.0, clock=time.monotonic):
        self._fetch = fetch
        self._ttl = ttl
        self._clock = clock
        self._values = {}
        self._pending = {}

    async def _load(self, sku):
        try:
            price = await self._fetch(sku)
            self._values[sku] = (price, self._clock())
            return price
        finally:
            self._pending.pop(sku, None)

    async def get(self, sku):
        cached = next(iter(self._values.values()), None)
        if cached is not None and self._clock() - cached[1] < self._ttl:
            return cached[0]
        task = self._pending.get(sku)
        if task is None:
            task = asyncio.create_task(self._load(sku))
            self._pending[sku] = task
        return await task

    def invalidate(self, sku):
        self._values.pop(sku, None)
