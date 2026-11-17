import asyncio


async def process_orders(order_ids, handle, workers):
    results = {}
    errors = {}
    for order_id in order_ids:
        try:
            results[order_id] = await handle(order_id)
        except Exception as error:
            errors[order_id] = str(error)
    return results, errors
