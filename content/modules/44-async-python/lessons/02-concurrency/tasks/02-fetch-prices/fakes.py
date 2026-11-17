"""Фейковий сервіс цін (лише для читання): рахує виклики й пік одночасних запитів."""

import asyncio

PRICES = {"MOUSE-01": 899, "CABLE-C1": 299, "STAND-01": 1299, "HUB-01": 749, "CAM-01": 1999}


class UnknownProduct(Exception):
    pass


class PriceService:
    def __init__(self, delays=None):
        self.delays = delays or {}
        self.calls = []
        self.in_flight = 0
        self.peak = 0

    async def get_price(self, sku):
        self.calls.append(sku)
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            await asyncio.sleep(self.delays.get(sku, 0.02))
            if sku not in PRICES:
                raise UnknownProduct(sku)
            return PRICES[sku]
        finally:
            self.in_flight -= 1
