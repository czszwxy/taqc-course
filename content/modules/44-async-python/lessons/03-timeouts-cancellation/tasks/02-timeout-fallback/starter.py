import asyncio

from fakes import StockService, UnknownProduct


async def stock_or_none(service, sku, timeout):
    return await service.stock(sku)


async def stock_report(service, skus, timeout):
    # твій код тут
    pass
