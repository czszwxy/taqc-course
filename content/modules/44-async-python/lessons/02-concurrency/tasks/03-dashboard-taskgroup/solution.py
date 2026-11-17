import asyncio

from fakes import ApiError, DashboardApi

BLOCKS = ["orders", "stock", "revenue"]


async def load_dashboard(api):
    async with asyncio.TaskGroup() as tg:
        tasks = {name: tg.create_task(api.load(name)) for name in BLOCKS}
    return {name: task.result() for name, task in tasks.items()}
