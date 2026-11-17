import httpx


async def iter_orders(client):
    page = 1
    while page is not None:
        response = await client.get("/orders", params={"page": page})
        response.raise_for_status()
        body = response.json()
        for order in body["items"]:
            yield order
        page = body["next_page"]


async def paid_order_ids(client, limit=None):
    ids = []
    async for order in iter_orders(client):
        if order["status"] == "paid":
            ids.append(order["id"])
            if limit is not None and len(ids) >= limit:
                break
    return ids
