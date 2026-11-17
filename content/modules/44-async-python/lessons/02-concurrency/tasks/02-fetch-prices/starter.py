import asyncio

from fakes import PriceService, UnknownProduct


async def fetch_prices(service, skus):
    prices = {}
    for sku in skus:
        prices[sku] = await service.get_price(sku)
    return prices
