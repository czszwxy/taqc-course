"""Фейковий склад-партнер (лише для читання): не більше max_parallel одночасних запитів."""

import asyncio

STOCK = {f"SKU-{n:02}": n * 3 for n in range(1, 21)}


class TooManyRequests(Exception):
    pass


class StockService:
    def __init__(self, max_parallel):
        self.max_parallel = max_parallel
        self.calls = []
        self.in_flight = 0
        self.peak = 0

    async def stock(self, sku):
        self.calls.append(sku)
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            if self.in_flight > self.max_parallel:
                raise TooManyRequests(f"{self.in_flight} parallel requests, the limit is {self.max_parallel}")
            await asyncio.sleep(0.01)
            return STOCK[sku]
        finally:
            self.in_flight -= 1
