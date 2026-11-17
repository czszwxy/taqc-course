"""Фейкові асинхронні сервіси каталогу (лише для читання): рахують одночасні виклики."""

import asyncio

PRICES = {"MOUSE-01": 899, "CAM-01": 1999}
STOCK = {"MOUSE-01": 12, "CAM-01": 0}


class NotFound(Exception):
    pass


class CatalogServices:
    def __init__(self):
        self.in_flight = 0
        self.peak = 0
        self.calls = []

    async def _call(self, kind, table, sku):
        self.calls.append((kind, sku))
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            await asyncio.sleep(0.02)
            if sku not in table:
                raise NotFound(sku)
            return table[sku]
        finally:
            self.in_flight -= 1

    async def price(self, sku):
        return await self._call("price", PRICES, sku)

    async def stock(self, sku):
        return await self._call("stock", STOCK, sku)
