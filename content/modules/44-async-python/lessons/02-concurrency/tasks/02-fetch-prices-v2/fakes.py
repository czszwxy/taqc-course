"""Фейковий сервіс профілів (лише для читання): рахує виклики й пік одночасних запитів."""

import asyncio

PROFILES = {
    1: {"id": 1, "email": "anna@example.com"},
    2: {"id": 2, "email": "ivan@example.com"},
    4: {"id": 4, "email": "olena@example.com"},
    5: {"id": 5, "email": "petro@example.com"},
}
BROKEN = {5}


class ProfileNotFound(Exception):
    pass


class ServiceError(Exception):
    pass


class ProfileService:
    def __init__(self):
        self.calls = []
        self.in_flight = 0
        self.peak = 0

    async def get_profile(self, user_id):
        self.calls.append(user_id)
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            await asyncio.sleep(0.02)
            if user_id in BROKEN:
                raise ServiceError(f"profile {user_id}: upstream timeout")
            if user_id not in PROFILES:
                raise ProfileNotFound(user_id)
            return PROFILES[user_id]
        finally:
            self.in_flight -= 1
