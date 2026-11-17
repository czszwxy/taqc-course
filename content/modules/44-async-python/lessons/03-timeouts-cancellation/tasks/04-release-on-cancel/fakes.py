"""Фейковий платіжний шлюз (лише для читання)."""

import asyncio


class PaymentDeclined(Exception):
    pass


class Gateway:
    def __init__(self, pay_delay=0.01, decline=False):
        self.pay_delay = pay_delay
        self.decline = decline
        self.reserved = []
        self.released = []
        self.paid = []

    async def reserve(self, order_id):
        await asyncio.sleep(0)
        reservation = f"R-{order_id}"
        self.reserved.append(reservation)
        return reservation

    async def pay(self, order_id):
        await asyncio.sleep(self.pay_delay)
        if self.decline:
            raise PaymentDeclined(f"order {order_id}: card declined")
        self.paid.append(order_id)
        return f"receipt-{order_id}"

    async def release(self, reservation):
        await asyncio.sleep(0)
        self.released.append(reservation)
