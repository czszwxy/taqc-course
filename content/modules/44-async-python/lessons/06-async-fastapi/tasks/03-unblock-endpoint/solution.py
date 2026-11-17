import asyncio

from fastapi import FastAPI

import legacy

app = FastAPI(title="Gadget shop: reports")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/reports/{day}")
async def report(day: str):
    return await asyncio.to_thread(legacy.build_report, day)
