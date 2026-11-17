"""Фейковий API панелі (лише для читання): записує, які виклики скасовано."""

import asyncio

DATA = {"orders": 42, "stock": 1310, "revenue": 128_500}


class ApiError(Exception):
    pass


class DashboardApi:
    def __init__(self, delays=None, failing=()):
        self.delays = {"orders": 0.02, "stock": 0.02, "revenue": 0.02, **(delays or {})}
        self.failing = set(failing)
        self.in_flight = 0
        self.peak = 0
        self.cancelled = []

    async def load(self, name):
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            await asyncio.sleep(self.delays[name])
            if name in self.failing:
                raise ApiError(f"{name} is unavailable")
            return DATA[name]
        except asyncio.CancelledError:
            self.cancelled.append(name)
            raise
        finally:
            self.in_flight -= 1
