import asyncio

from fakes import PriceService, UnknownProduct


async def fetch_prices(service, skus):
    unique = list(dict.fromkeys(skus))
    prices = await asyncio.gather(*(service.get_price(sku) for sku in unique))
    return dict(zip(unique, prices))
