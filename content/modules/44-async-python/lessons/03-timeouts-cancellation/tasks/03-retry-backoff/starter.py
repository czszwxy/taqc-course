import asyncio

from errors import PaymentDeclined, TransientError


async def retry(call, attempts=3, delays=(0.1, 0.5), sleep=asyncio.sleep):
    return await call()
