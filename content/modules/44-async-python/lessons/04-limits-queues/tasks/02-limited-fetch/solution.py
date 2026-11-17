import asyncio

from fakes import StockService, TooManyRequests


async def fetch_all(service, skus, limit):
    if limit < 1:
        raise ValueError("limit must be at least 1")
    gate = asyncio.Semaphore(limit)
    unique = list(dict.fromkeys(skus))

    async def one(sku):
        async with gate:
            return await service.stock(sku)

    values = await asyncio.gather(*(one(sku) for sku in unique))
    return dict(zip(unique, values))
