import asyncio


async def ping_database():
    """In production: SELECT 1 through the connection pool."""
    await asyncio.sleep(0)


async def ping_payments():
    """In production: GET the payment gateway's status endpoint."""
    await asyncio.sleep(0)


CHECKS = {"database": ping_database, "payments": ping_payments}
