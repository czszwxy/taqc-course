import asyncio

from fakes import Gateway, PaymentDeclined


async def checkout(gateway, order_id):
    reservation = await gateway.reserve(order_id)
    try:
        return await gateway.pay(order_id)
    except BaseException:
        await gateway.release(reservation)
        raise
