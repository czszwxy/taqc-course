import asyncio

from legacy import LegacyCache


async def warm_up(cache, skus, limit=4):
    gate = asyncio.Semaphore(limit)

    async def one(sku):
        async with gate:
            return await asyncio.to_thread(cache.load, sku)

    values = await asyncio.gather(*(one(sku) for sku in skus))
    return dict(zip(skus, values))
