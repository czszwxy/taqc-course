import asyncio

import httpx

NOT_FOUND = 404


async def fetch_details(client, ids, limit=5):
    gate = asyncio.Semaphore(limit)

    async def one(product_id):
        async with gate:
            response = await client.get(f"/products/{product_id}")
        if response.status_code == NOT_FOUND:
            return None
        response.raise_for_status()
        return response.json()

    results = await asyncio.gather(*(one(product_id) for product_id in dict.fromkeys(ids)))
    return [item for item in results if item is not None]
