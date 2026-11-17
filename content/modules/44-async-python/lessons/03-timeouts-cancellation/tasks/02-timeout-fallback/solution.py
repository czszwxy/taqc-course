import asyncio

from fakes import StockService, UnknownProduct


async def stock_or_none(service, sku, timeout):
    try:
        async with asyncio.timeout(timeout):
            return await service.stock(sku)
    except TimeoutError:
        return None


async def stock_report(service, skus, timeout):
    values = await asyncio.gather(*(stock_or_none(service, sku, timeout) for sku in skus))
    return dict(zip(skus, values))
