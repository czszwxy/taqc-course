import asyncio

import httpx


async def fetch_details(client, ids, limit=5):
    details = []
    for product_id in ids:
        response = await client.get(f"/products/{product_id}")
        details.append(response.json())
    return details
