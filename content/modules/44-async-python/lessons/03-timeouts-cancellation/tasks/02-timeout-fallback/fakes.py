"""Фейковий склад-партнер (лише для читання): деякі товари відповідають повільно."""

import asyncio

STOCK = {"MOUSE-01": 12, "CABLE-C1": 40, "SLOW-01": 3, "SLOW-02": 7}
SLOW = {"SLOW-01", "SLOW-02"}


class UnknownProduct(Exception):
    pass


class StockService:
    def __init__(self, slow_delay=0.5):
        self.slow_delay = slow_delay
        self.in_flight = 0
        self.peak = 0
        self.cancelled = []

    async def stock(self, sku):
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            await asyncio.sleep(self.slow_delay if sku in SLOW else 0.01)
            if sku not in STOCK:
                raise UnknownProduct(sku)
            return STOCK[sku]
        except asyncio.CancelledError:
            self.cancelled.append(sku)
            raise
        finally:
            self.in_flight -= 1
