"""Асинхронний сервіс цін (лише для читання). Справжній ходив би в мережу — тут затримка імітує очікування."""

import asyncio

PRICES = {"MOUSE-01": 899, "CABLE-C1": 299, "STAND-01": 1299}


class UnknownProduct(Exception):
    pass


class PriceService:
    def __init__(self, prices=None, delay=0.01):
        self.prices = PRICES if prices is None else prices
        self.delay = delay
        self.calls = []

    async def get_price(self, sku):
        self.calls.append(sku)
        await asyncio.sleep(self.delay)
        if sku not in self.prices:
            raise UnknownProduct(sku)
        return self.prices[sku]
