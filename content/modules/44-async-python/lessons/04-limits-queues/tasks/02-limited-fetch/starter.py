import asyncio

from fakes import StockService, TooManyRequests


async def fetch_all(service, skus, limit):
    unique = list(dict.fromkeys(skus))
    values = await asyncio.gather(*(service.stock(sku) for sku in unique))
    return dict(zip(unique, values))
