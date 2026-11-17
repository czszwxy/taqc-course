import asyncio


async def process_orders(order_ids, handle, workers):
    if workers < 1:
        raise ValueError("workers must be at least 1")
    queue = asyncio.Queue()
    for order_id in order_ids:
        queue.put_nowait(order_id)
    outcomes = {}
    failures = {}

    async def worker():
        while True:
            order_id = await queue.get()
            try:
                outcomes[order_id] = await handle(order_id)
            except Exception as error:
                failures[order_id] = str(error)
            finally:
                queue.task_done()

    tasks = [asyncio.create_task(worker()) for _ in range(workers)]
    await queue.join()
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    results = {order_id: outcomes[order_id] for order_id in order_ids if order_id in outcomes}
    errors = {order_id: failures[order_id] for order_id in order_ids if order_id in failures}
    return results, errors
