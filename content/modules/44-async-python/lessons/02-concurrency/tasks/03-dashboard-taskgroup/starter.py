import asyncio

from fakes import ApiError, DashboardApi


async def load_dashboard(api):
    orders, stock, revenue = await asyncio.gather(api.load("orders"), api.load("stock"), api.load("revenue"))
    return {"orders": orders, "stock": stock, "revenue": revenue}
