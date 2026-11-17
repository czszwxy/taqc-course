import asyncio

from errors import PaymentDeclined, TransientError


async def retry(call, attempts=3, delays=(0.1, 0.5), sleep=asyncio.sleep):
    if attempts < 1:
        raise ValueError("attempts must be at least 1")
    for attempt in range(attempts):
        try:
            return await call()
        except TransientError:
            if attempt == attempts - 1:
                raise
            await sleep(delays[min(attempt, len(delays) - 1)])
