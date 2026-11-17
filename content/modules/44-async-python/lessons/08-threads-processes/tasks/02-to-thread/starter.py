import asyncio

from legacy import LegacyCache


async def warm_up(cache, skus, limit=4):
    return {sku: cache.load(sku) for sku in skus}
